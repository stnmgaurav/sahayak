import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { uploadImageToCloudinary } from './cloudinary';
import { ItemReport, ItemClaim, HandoverReceipt, ItemMessage, UserProfile } from '../types';
import { INITIAL_REPORTS, INITIAL_CLAIMS, DEMO_USERS } from '../data/mockData';
import { 
  handleIncomingMessageNotification, 
  broadcastOutgoingMessage, 
  registerServiceWorker,
  subscribeToCrossTabNotifications 
} from './notifications';

const ITEMS_KEY = 'sahayak_items_v1';
const CLAIMS_KEY = 'sahayak_claims_v1';
const RECEIPTS_KEY = 'sahayak_receipts_v1';
const MESSAGES_KEY = 'sahayak_messages_v1';
const USERS_KEY = 'sahayak_users_v1';

type StorageListener = () => void;
const listeners: Set<StorageListener> = new Set();

export function subscribeToStorage(callback: StorageListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function notifyListeners() {
  listeners.forEach(cb => cb());
}

/**
 * Strips undefined properties so Firestore never throws unsupported field value errors
 */
function sanitizeForFirestore(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      clean[key] = val;
    }
  }
  return clean;
}

function loadLocalItems(): ItemReport[] {
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    if (!raw) {
      localStorage.setItem(ITEMS_KEY, JSON.stringify(INITIAL_REPORTS));
      return INITIAL_REPORTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read items from localStorage:', err);
    return INITIAL_REPORTS;
  }
}

function loadLocalClaims(): ItemClaim[] {
  try {
    const raw = localStorage.getItem(CLAIMS_KEY);
    if (!raw) {
      localStorage.setItem(CLAIMS_KEY, JSON.stringify(INITIAL_CLAIMS));
      return INITIAL_CLAIMS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read claims from localStorage:', err);
    return INITIAL_CLAIMS;
  }
}

function loadLocalReceipts(): HandoverReceipt[] {
  try {
    const raw = localStorage.getItem(RECEIPTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadLocalMessages(): ItemMessage[] {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadLocalUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      const initialUsers: UserProfile[] = [
        ...DEMO_USERS,
        {
          id: 'user_admin_satnam',
          name: 'Inspector Satnam Singh',
          email: 'security.admin@cumail.in',
          uidOrRoll: 'EMP-CU-SEC-409',
          phone: '+91 98888 11223',
          department: 'CU Campus Security & Welfare Cell',
          role: 'admin',
          joinedDate: '2021-01-10',
          profileCompleted: true,
        },
        {
          id: 'user_admin_gaurav',
          name: 'Gaurav Singh (Platform Superadmin)',
          email: 'gauravsinghrajpoot2019@gmail.com',
          uidOrRoll: 'EMP-CU-ADMIN-001',
          phone: '+91 98888 22334',
          department: 'Campus Security & Administration',
          role: 'admin',
          joinedDate: '2022-01-15',
          profileCompleted: true,
        },
      ];
      localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
      return initialUsers;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read users from localStorage:', err);
    return DEMO_USERS;
  }
}

// In-memory caches initialized from localStorage
let cachedItems: ItemReport[] = loadLocalItems();
let cachedClaims: ItemClaim[] = loadLocalClaims();
let cachedReceipts: HandoverReceipt[] = loadLocalReceipts();
let cachedMessages: ItemMessage[] = loadLocalMessages();
let cachedUsers: UserProfile[] = loadLocalUsers();

let seenMessageIds = new Set<string>(cachedMessages.map(m => m.id));
let isFirstMessagesSnapshot = true;

let unsubscribeItems: (() => void) | null = null;
let unsubscribeClaims: (() => void) | null = null;
let unsubscribeReceipts: (() => void) | null = null;
let unsubscribeMessages: (() => void) | null = null;
let unsubscribeUsers: (() => void) | null = null;

/**
 * Initializes real-time Firestore synchronization for items, claims, and receipts.
 */
export function initFirestoreSync() {
  // 1. Synchronize Items Collection (publicly accessible across campus)
  if (!unsubscribeItems) {
    try {
      const itemsCol = collection(db, 'items');
      unsubscribeItems = onSnapshot(itemsCol, (snapshot) => {
        if (!snapshot.empty) {
          const firestoreItems: ItemReport[] = [];
          const seenIds = new Set<string>();
          snapshot.forEach((docSnap) => {
            const item = { ...(docSnap.data() as ItemReport), id: docSnap.id };
            firestoreItems.push(item);
            seenIds.add(item.id);
          });

          // Ensure any locally reported items not yet reflected in Firestore are merged and saved
          for (const local of cachedItems) {
            if (!seenIds.has(local.id)) {
              firestoreItems.push(local);
              seenIds.add(local.id);
              setDoc(doc(db, 'items', local.id), sanitizeForFirestore(local), { merge: true }).catch(() => {});
            }
          }
          
          // Sort newest first
          firestoreItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          cachedItems = firestoreItems;
          localStorage.setItem(ITEMS_KEY, JSON.stringify(firestoreItems));
          notifyListeners();
        } else {
          // First run on empty collection: seed initial campus reports
          INITIAL_REPORTS.forEach(async (report) => {
            try {
              await setDoc(doc(db, 'items', report.id), sanitizeForFirestore(report));
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, `items/${report.id}`);
            }
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'items');
        console.warn('Firestore items onSnapshot (using local cache while rules deploy):', error.message || error);
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'items');
    }
  }

  // 2. Synchronize Claims Collection (only when user is signed in)
  if (auth.currentUser && !unsubscribeClaims) {
    try {
      const claimsCol = collection(db, 'claims');
      unsubscribeClaims = onSnapshot(claimsCol, (snapshot) => {
        if (!snapshot.empty) {
          const firestoreClaims: ItemClaim[] = [];
          snapshot.forEach((docSnap) => {
            firestoreClaims.push({ ...(docSnap.data() as ItemClaim), id: docSnap.id });
          });
          firestoreClaims.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          cachedClaims = firestoreClaims;
          localStorage.setItem(CLAIMS_KEY, JSON.stringify(firestoreClaims));
          notifyListeners();
        } else {
          INITIAL_CLAIMS.forEach(async (claim) => {
            try {
              await setDoc(doc(db, 'claims', claim.id), sanitizeForFirestore(claim));
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, `claims/${claim.id}`);
            }
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'claims');
        console.warn('Firestore claims onSnapshot (using local cache):', error.message || error);
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'claims');
    }
  }

  // 3. Synchronize Receipts Collection (only when user is signed in)
  if (auth.currentUser && !unsubscribeReceipts) {
    try {
      const receiptsCol = collection(db, 'receipts');
      unsubscribeReceipts = onSnapshot(receiptsCol, (snapshot) => {
        if (!snapshot.empty) {
          const firestoreReceipts: HandoverReceipt[] = [];
          snapshot.forEach((docSnap) => {
            firestoreReceipts.push(docSnap.data() as HandoverReceipt);
          });
          cachedReceipts = firestoreReceipts;
          localStorage.setItem(RECEIPTS_KEY, JSON.stringify(firestoreReceipts));
          notifyListeners();
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'receipts');
        console.warn('Firestore receipts onSnapshot (using local cache):', error.message || error);
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'receipts');
    }
  }

  // 4. Synchronize Messages Collection (finder-to-owner lost item notifications)
  if (!unsubscribeMessages) {
    try {
      const messagesCol = collection(db, 'messages');
      unsubscribeMessages = onSnapshot(messagesCol, (snapshot) => {
        if (!snapshot.empty) {
          const firestoreMessages: ItemMessage[] = [];
          const newMessagesToAlert: ItemMessage[] = [];

          snapshot.forEach((docSnap) => {
            const msg = { ...(docSnap.data() as ItemMessage), id: docSnap.id };
            firestoreMessages.push(msg);

            // Detect brand new messages that arrived after initial load
            if (!isFirstMessagesSnapshot && !seenMessageIds.has(msg.id)) {
              newMessagesToAlert.push(msg);
            }
            seenMessageIds.add(msg.id);
          });

          isFirstMessagesSnapshot = false;
          firestoreMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          cachedMessages = firestoreMessages;
          localStorage.setItem(MESSAGES_KEY, JSON.stringify(firestoreMessages));
          notifyListeners();

          // Trigger push notifications for the recipient / owner of reported items
          if (newMessagesToAlert.length > 0 && typeof window !== 'undefined') {
            try {
              const rawUser = localStorage.getItem('sahayak_auth_user_v1');
              if (rawUser) {
                const activeUser = JSON.parse(rawUser);
                for (const newMsg of newMessagesToAlert) {
                  const targetItem = cachedItems.find(i => i.id === newMsg.itemId);
                  handleIncomingMessageNotification(newMsg, targetItem, activeUser.id, activeUser.email);
                }
              }
            } catch (err) {
              console.warn('Failed to evaluate push notification for incoming message:', err);
            }
          }
        } else {
          isFirstMessagesSnapshot = false;
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'messages');
        console.warn('Firestore messages onSnapshot (using local cache):', error.message || error);
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'messages');
    }
  }

  // 5. Synchronize Users Collection (for platform administration)
  if (!unsubscribeUsers) {
    try {
      const usersCol = collection(db, 'users');
      unsubscribeUsers = onSnapshot(usersCol, (snapshot) => {
        if (!snapshot.empty) {
          const firestoreUsers: UserProfile[] = [];
          const seenIds = new Set<string>();
          snapshot.forEach((docSnap) => {
            const u = { ...(docSnap.data() as UserProfile), id: docSnap.id };
            firestoreUsers.push(u);
            seenIds.add(u.id);
          });

          for (const local of cachedUsers) {
            if (!seenIds.has(local.id)) {
              firestoreUsers.push(local);
              seenIds.add(local.id);
            }
          }

          cachedUsers = firestoreUsers;
          localStorage.setItem(USERS_KEY, JSON.stringify(cachedUsers));
          notifyListeners();
        } else {
          cachedUsers.forEach(async (user) => {
            try {
              await setDoc(doc(db, 'users', user.id), sanitizeForFirestore(user), { merge: true });
            } catch (err) {
              console.warn('Failed to seed user in Firestore:', err);
            }
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'users');
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'users');
    }
  }
}

// Automatically start synchronization on load and bind auth lifecycle
if (typeof window !== 'undefined') {
  initFirestoreSync();
  registerServiceWorker().catch(() => {});

  // Listen for cross-tab message events to notify other tabs immediately
  subscribeToCrossTabNotifications((msg) => {
    try {
      const rawUser = localStorage.getItem('sahayak_auth_user_v1');
      if (rawUser) {
        const activeUser = JSON.parse(rawUser);
        const targetItem = cachedItems.find(i => i.id === msg.itemId);
        handleIncomingMessageNotification(msg, targetItem, activeUser.id, activeUser.email);
      }
    } catch (e) {}
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      initFirestoreSync();
    } else {
      if (unsubscribeClaims) {
        unsubscribeClaims();
        unsubscribeClaims = null;
      }
      if (unsubscribeReceipts) {
        unsubscribeReceipts();
        unsubscribeReceipts = null;
      }
      if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
      }
      if (unsubscribeUsers) {
        unsubscribeUsers();
        unsubscribeUsers = null;
      }
    }
  });
}

export function getStoredItems(): ItemReport[] {
  return cachedItems;
}

export function saveItem(newItem: ItemReport): ItemReport {
  // 1. Update local cache and notify immediately for instant UI response
  const existingIdx = cachedItems.findIndex(i => i.id === newItem.id);
  if (existingIdx >= 0) {
    cachedItems[existingIdx] = { ...cachedItems[existingIdx], ...newItem, updatedAt: new Date().toISOString() };
  } else {
    cachedItems.unshift(newItem);
  }
  localStorage.setItem(ITEMS_KEY, JSON.stringify(cachedItems));
  notifyListeners();

  // 2. Persist to Firebase Firestore
  try {
    const cleanItem = sanitizeForFirestore(newItem);
    setDoc(doc(db, 'items', newItem.id), cleanItem, { merge: true }).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `items/${newItem.id}`);
      console.warn('Failed to save item to Firestore:', err);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `items/${newItem.id}`);
  }

  return newItem;
}

export function updateItemStatus(
  itemId: string, 
  status: ItemReport['status'], 
  requestingUserId?: string, 
  isAdmin?: boolean,
  requestingUserEmail?: string
): boolean {
  // Update local
  const index = cachedItems.findIndex(i => i.id === itemId);
  if (index < 0) return false;

  const item = cachedItems[index];
  if (!isAdmin && (requestingUserId || requestingUserEmail)) {
    const isOwner = Boolean(
      (requestingUserId && item.userId === requestingUserId) ||
      (requestingUserEmail && item.userEmail && requestingUserEmail.trim().toLowerCase() === item.userEmail.trim().toLowerCase())
    );
    if (!isOwner) {
      console.warn(`[Security] Unauthorized status update attempt on item ${itemId} by user ${requestingUserId || requestingUserEmail}`);
      return false;
    }
  }

  cachedItems[index].status = status;
  cachedItems[index].updatedAt = new Date().toISOString();
  localStorage.setItem(ITEMS_KEY, JSON.stringify(cachedItems));
  notifyListeners();

  // Update Firestore
  try {
    updateDoc(doc(db, 'items', itemId), {
      status,
      updatedAt: new Date().toISOString(),
    }).catch(err => {
      handleFirestoreError(err, OperationType.UPDATE, `items/${itemId}`);
      console.warn('Firestore updateItemStatus failed:', err);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `items/${itemId}`);
  }

  return true;
}

export function updateItem(
  itemId: string, 
  updates: Partial<ItemReport>, 
  requestingUserId?: string, 
  isAdmin?: boolean,
  requestingUserEmail?: string
): boolean {
  const index = cachedItems.findIndex(i => i.id === itemId);
  if (index < 0) return false;

  const item = cachedItems[index];

  // Enforce security: Only the original listing owner or verified admin can edit
  if (!isAdmin) {
    const isOwner = Boolean(
      (requestingUserId && item.userId === requestingUserId) ||
      (requestingUserEmail && item.userEmail && requestingUserEmail.trim().toLowerCase() === item.userEmail.trim().toLowerCase())
    );
    if (!isOwner) {
      console.warn(`[Security] Blocked unauthorized edit on item ${itemId}. Requesting user: ${requestingUserId || requestingUserEmail}. Listing owner: ${item.userId} (${item.userEmail})`);
      return false;
    }
  }

  const updatedItem: ItemReport = {
    ...item,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  cachedItems[index] = updatedItem;
  localStorage.setItem(ITEMS_KEY, JSON.stringify(cachedItems));
  notifyListeners();

  // Update Firestore
  try {
    const cleanUpdates = sanitizeForFirestore({
      ...updates,
      updatedAt: updatedItem.updatedAt,
    });
    updateDoc(doc(db, 'items', itemId), cleanUpdates).catch(err => {
      handleFirestoreError(err, OperationType.UPDATE, `items/${itemId}`);
      console.warn('Firestore updateItem failed:', err);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `items/${itemId}`);
  }

  return true;
}

export function deleteItem(
  itemId: string, 
  requestingUserId?: string, 
  isAdmin?: boolean,
  requestingUserEmail?: string
): boolean {
  const item = cachedItems.find(i => i.id === itemId);
  if (!item) return false;

  // Enforce security: Only the original listing owner or verified admin can delete
  if (!isAdmin) {
    const isOwner = Boolean(
      (requestingUserId && item.userId === requestingUserId) ||
      (requestingUserEmail && item.userEmail && requestingUserEmail.trim().toLowerCase() === item.userEmail.trim().toLowerCase())
    );
    if (!isOwner) {
      console.warn(`[Security] Blocked unauthorized delete on item ${itemId}. Requesting user: ${requestingUserId || requestingUserEmail}. Listing owner: ${item.userId} (${item.userEmail})`);
      return false;
    }
  }

  // Update local
  cachedItems = cachedItems.filter(i => i.id !== itemId);
  localStorage.setItem(ITEMS_KEY, JSON.stringify(cachedItems));
  notifyListeners();

  // Delete from Firestore
  try {
    deleteDoc(doc(db, 'items', itemId)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `items/${itemId}`);
      console.warn('Firestore deleteItem failed:', err);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `items/${itemId}`);
  }

  return true;
}

export function getStoredClaims(): ItemClaim[] {
  return cachedClaims;
}

export function saveClaim(newClaim: ItemClaim): ItemClaim {
  // Update local
  cachedClaims.unshift(newClaim);
  localStorage.setItem(CLAIMS_KEY, JSON.stringify(cachedClaims));

  // Automatically update the associated item status to 'claimed' so it is immediately removed from the dashboard!
  updateItemStatus(newClaim.itemId, 'claimed');

  notifyListeners();

  // Persist to Firebase Firestore
  try {
    const cleanClaim = sanitizeForFirestore(newClaim);
    setDoc(doc(db, 'claims', newClaim.id), cleanClaim, { merge: true }).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `claims/${newClaim.id}`);
      console.warn('Firestore saveClaim failed:', err);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `claims/${newClaim.id}`);
  }

  return newClaim;
}

export function updateClaim(claimId: string, updates: Partial<ItemClaim>): void {
  const idx = cachedClaims.findIndex(c => c.id === claimId);
  if (idx >= 0) {
    cachedClaims[idx] = { ...cachedClaims[idx], ...updates };
    localStorage.setItem(CLAIMS_KEY, JSON.stringify(cachedClaims));

    // Update item status accordingly
    if (updates.status === 'verified') {
      updateItemStatus(cachedClaims[idx].itemId, 'verified');
    } else if (updates.status === 'returned') {
      updateItemStatus(cachedClaims[idx].itemId, 'returned');
    } else if (updates.status === 'rejected') {
      updateItemStatus(cachedClaims[idx].itemId, 'found');
    }

    notifyListeners();

    // Persist to Firestore
    try {
      const cleanUpdates = sanitizeForFirestore(updates as Record<string, any>);
      updateDoc(doc(db, 'claims', claimId), cleanUpdates).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `claims/${claimId}`);
        console.warn('Firestore updateClaim failed:', err);
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `claims/${claimId}`);
    }
  }
}

export function getStoredMessages(): ItemMessage[] {
  return cachedMessages;
}

export function saveMessage(newMessage: ItemMessage): ItemMessage {
  // Update local cache immediately
  cachedMessages.unshift(newMessage);
  seenMessageIds.add(newMessage.id);
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(cachedMessages));

  // Automatically update the associated lost item status to 'match_found' if it was 'lost'
  const targetItem = cachedItems.find(i => i.id === newMessage.itemId);
  if (targetItem && targetItem.status === 'lost') {
    updateItemStatus(newMessage.itemId, 'match_found');
  }

  notifyListeners();
  broadcastOutgoingMessage(newMessage);

  // Persist to Firebase Firestore
  try {
    const cleanMsg = sanitizeForFirestore(newMessage);
    setDoc(doc(db, 'messages', newMessage.id), cleanMsg, { merge: true }).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `messages/${newMessage.id}`);
      console.warn('Firestore saveMessage failed:', err);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `messages/${newMessage.id}`);
  }

  return newMessage;
}

export function updateMessage(messageId: string, updates: Partial<ItemMessage>): void {
  const idx = cachedMessages.findIndex(m => m.id === messageId);
  if (idx >= 0) {
    cachedMessages[idx] = { ...cachedMessages[idx], ...updates };
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(cachedMessages));
    notifyListeners();

    try {
      const cleanUpdates = sanitizeForFirestore(updates as Record<string, any>);
      updateDoc(doc(db, 'messages', messageId), cleanUpdates).catch(err => {
        handleFirestoreError(err, OperationType.UPDATE, `messages/${messageId}`);
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `messages/${messageId}`);
    }
  }
}

export function markMessageAsRead(messageId: string): void {
  updateMessage(messageId, { status: 'read' });
}

export function deleteMessage(messageId: string): void {
  cachedMessages = cachedMessages.filter(m => m.id !== messageId);
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(cachedMessages));
  notifyListeners();

  try {
    deleteDoc(doc(db, 'messages', messageId)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `messages/${messageId}`);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `messages/${messageId}`);
  }
}

/**
 * Retrieve all messages linked to a specific item report
 */
export function getItemMessages(itemId: string): ItemMessage[] {
  return cachedMessages
    .filter(m => m.itemId === itemId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * Retrieve all chat messages exchanged between current user and an item reporter or other student
 */
export function getItemChatThread(itemId: string, userAIdentifier: string, userBIdentifier: string): ItemMessage[] {
  const a = userAIdentifier.toLowerCase().trim();
  const b = userBIdentifier.toLowerCase().trim();
  return cachedMessages
    .filter(m => {
      if (m.itemId !== itemId) return false;
      const sId = (m.senderId || '').toLowerCase();
      const sEmail = (m.senderEmail || '').toLowerCase();
      const rId = (m.recipientId || '').toLowerCase();
      const rEmail = (m.recipientEmail || '').toLowerCase();

      const fromA = sId === a || sEmail === a;
      const toA = rId === a || rEmail === a;
      const fromB = sId === b || sEmail === b;
      const toB = rId === b || rEmail === b;

      return (fromA && toB) || (fromB && toA);
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function getStoredReceipts(): HandoverReceipt[] {
  return cachedReceipts;
}

export function saveReceipt(receipt: HandoverReceipt): void {
  cachedReceipts.unshift(receipt);
  localStorage.setItem(RECEIPTS_KEY, JSON.stringify(cachedReceipts));
  notifyListeners();

  // Save to Firestore
  try {
    const cleanReceipt = sanitizeForFirestore(receipt);
    setDoc(doc(db, 'receipts', receipt.receiptNumber), cleanReceipt, { merge: true }).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `receipts/${receipt.receiptNumber}`);
      console.warn('Firestore saveReceipt failed:', err);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `receipts/${receipt.receiptNumber}`);
  }
}

export function resetDemoData(): void {
  cachedItems = [...INITIAL_REPORTS];
  cachedClaims = [...INITIAL_CLAIMS];
  cachedReceipts = [];
  localStorage.setItem(ITEMS_KEY, JSON.stringify(cachedItems));
  localStorage.setItem(CLAIMS_KEY, JSON.stringify(cachedClaims));
  localStorage.removeItem(RECEIPTS_KEY);
  notifyListeners();
}

/**
 * Uploads an image using Cloudinary (with automatic fallback to high-quality compressed storage)
 */
export async function uploadImageFile(file: File): Promise<string> {
  const result = await uploadImageToCloudinary(file);
  return result.url;
}

// ================= USER MANAGEMENT FOR ADMIN & PLATFORM =================

export function getStoredUsers(): UserProfile[] {
  const usersMap = new Map<string, UserProfile>();
  
  // Seed / cached users
  cachedUsers.forEach(u => usersMap.set(u.id, u));

  // Synthesize profile for any user found in items who isn't explicitly in users collection yet
  cachedItems.forEach(item => {
    if (item.userId && !usersMap.has(item.userId)) {
      const derived: UserProfile = {
        id: item.userId,
        name: item.userName || 'Student',
        email: item.userEmail || 'student@cuchd.in',
        phone: item.userPhone || '+91 98765 00000',
        uidOrRoll: item.userUid || '21BCS0000',
        department: 'Computer Science & Engineering (CSE)',
        role: (item.userEmail && (item.userEmail.includes('admin') || item.userEmail.includes('security'))) ? 'admin' : 'student',
        joinedDate: item.createdAt ? item.createdAt.split('T')[0] : '2026-09-01',
        profileCompleted: true,
      };
      usersMap.set(item.userId, derived);
    }
  });

  return Array.from(usersMap.values());
}

export function saveUser(newUser: UserProfile): UserProfile {
  const existingIdx = cachedUsers.findIndex(u => u.id === newUser.id);
  if (existingIdx >= 0) {
    cachedUsers[existingIdx] = { ...cachedUsers[existingIdx], ...newUser };
  } else {
    cachedUsers.unshift(newUser);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(cachedUsers));
  notifyListeners();

  try {
    const cleanUser = sanitizeForFirestore(newUser);
    setDoc(doc(db, 'users', newUser.id), cleanUser, { merge: true }).catch(err => {
      handleFirestoreError(err, OperationType.WRITE, `users/${newUser.id}`);
      console.warn('Firestore saveUser failed:', err);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${newUser.id}`);
  }

  return newUser;
}

export function updateUser(userId: string, updates: Partial<UserProfile>): boolean {
  const idx = cachedUsers.findIndex(u => u.id === userId);
  let updatedUser: UserProfile;

  if (idx >= 0) {
    updatedUser = { ...cachedUsers[idx], ...updates };
    cachedUsers[idx] = updatedUser;
  } else {
    const allUsers = getStoredUsers();
    const found = allUsers.find(u => u.id === userId);
    if (!found) return false;
    updatedUser = { ...found, ...updates };
    cachedUsers.unshift(updatedUser);
  }

  localStorage.setItem(USERS_KEY, JSON.stringify(cachedUsers));
  notifyListeners();

  try {
    const cleanUpdates = sanitizeForFirestore(updates as Record<string, any>);
    setDoc(doc(db, 'users', userId), cleanUpdates, { merge: true }).catch(err => {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      console.warn('Firestore updateUser failed:', err);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }

  return true;
}

export function deleteUser(userId: string): boolean {
  cachedUsers = cachedUsers.filter(u => u.id !== userId);
  localStorage.setItem(USERS_KEY, JSON.stringify(cachedUsers));
  notifyListeners();

  try {
    deleteDoc(doc(db, 'users', userId)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
      console.warn('Firestore deleteUser failed:', err);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
  }

  return true;
}
