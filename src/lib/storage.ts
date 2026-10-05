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
import { ItemReport, ItemClaim, HandoverReceipt, ItemMessage, UserProfile, WebRTCCallRecord } from '../types';
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
export const CALLS_HISTORY_KEY = 'sahayak_call_history_v1';

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

// Helper to mask demo phone numbers into standard +91 9878XXXXXX format
function maskDemoPhone(phone?: string): string {
  if (!phone) return '+91 9878XXXXXX';
  const trimmed = phone.trim();
  if (
    trimmed === '+91 98765 43210' ||
    trimmed === '+91 98123 45678' ||
    trimmed === '+91 98888 11223' ||
    trimmed === '+91 98888 22334' ||
    trimmed === '+91 98765 00000' ||
    trimmed === '9876543210' ||
    trimmed === '9812345678' ||
    trimmed === '9888811223' ||
    trimmed === '9888822334' ||
    trimmed === '9876500000' ||
    trimmed === '0000000000'
  ) {
    return '+91 9878XXXXXX';
  }
  return trimmed;
}

/**
 * Safely removes stale/temporary data from localStorage when approaching quota limits.
 */
export function pruneStorageQuota(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        // Prune old temporary call signaling sessions and temporary reaction cache
        // Note: NEVER remove the persistent call history storage
        if (
          (k.startsWith('sahayak_call_') && k !== CALLS_HISTORY_KEY && k !== 'sahayak_calls_v1') ||
          k.startsWith('sahayak_chat_reactions_temp') ||
          k.includes('_reactions_item_')
        ) {
          keysToRemove.push(k);
        }
      }
    }
    keysToRemove.forEach(k => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
  } catch {
    // ignore
  }
}

/**
 * Compacts an item array by stripping giant duplicate base64 strings if quota is tight
 */
function compactItemsForStorage(items: ItemReport[]): ItemReport[] {
  return items.map(item => {
    let imageUrl = item.imageUrl;
    let imageUrls = item.imageUrls;
    if (imageUrl && imageUrl.startsWith('data:image/') && imageUrl.length > 80000) {
      const fallback = INITIAL_REPORTS.find(r => r.id === item.id)?.imageUrl;
      if (fallback) {
        imageUrl = fallback;
      }
    }
    if (imageUrls && imageUrls.length > 0) {
      imageUrls = imageUrls.map(u => {
        if (u.startsWith('data:image/') && u.length > 80000) {
          return imageUrl || '';
        }
        return u;
      });
    }
    const { image, ...rest } = item as any;
    return { ...rest, imageUrl, imageUrls };
  });
}

/**
 * Safe wrapper for localStorage.setItem that protects against QuotaExceededError
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`[Storage Quota Notice] localStorage.setItem failed for '${key}', running quota cleanup...`);
    pruneStorageQuota();

    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err2: any) {
      // If items key exceeded quota, compact the JSON payload
      if (key === ITEMS_KEY) {
        try {
          const parsed: ItemReport[] = JSON.parse(value);
          const compacted = compactItemsForStorage(parsed);
          localStorage.setItem(key, JSON.stringify(compacted));
          return true;
        } catch {
          // fallback
        }
      } else if (key === MESSAGES_KEY) {
        try {
          // Keep only the latest 80 messages in local storage
          const parsed: ItemMessage[] = JSON.parse(value);
          const compacted = parsed.slice(0, 80);
          localStorage.setItem(key, JSON.stringify(compacted));
          return true;
        } catch {
          // fallback
        }
      } else if (key === CALLS_HISTORY_KEY) {
        try {
          // Keep only the latest 50 calls in local storage
          const parsed: WebRTCCallRecord[] = JSON.parse(value);
          const compacted = parsed.slice(0, 50);
          localStorage.setItem(key, JSON.stringify(compacted));
          return true;
        } catch {
          // fallback
        }
      }
      console.warn(`[Storage Quota Warning] Unable to persist '${key}' to localStorage. Operating with in-memory cache.`);
      return false;
    }
  }
}

function loadLocalItems(): ItemReport[] {
  let sanitized: ItemReport[] = INITIAL_REPORTS;
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    if (!raw) {
      safeSetItem(ITEMS_KEY, JSON.stringify(INITIAL_REPORTS));
      return INITIAL_REPORTS;
    }
    const parsed: ItemReport[] = JSON.parse(raw);
    sanitized = Array.isArray(parsed) ? parsed : INITIAL_REPORTS;
  } catch (err) {
    console.warn('Failed to parse items from localStorage, falling back to initial reports:', err);
    return INITIAL_REPORTS;
  }

  try {
    let mutated = false;
    sanitized = sanitized.map(item => {
      let changed = false;
      let userPhone = item.userPhone;
      let imageUrls = item.imageUrls;

      if (userPhone && (userPhone.includes('98765') || userPhone.includes('98123') || userPhone.includes('98888'))) {
        userPhone = '+91 9878XXXXXX';
        changed = true;
      }

      // Backwards compatibility for single image field
      let imageUrl = item.imageUrl || (item as any).image || '';
      if (!item.imageUrl && (item as any).image) {
        changed = true;
      }

      // Backfill multi-image array if missing
      const initialMatch = INITIAL_REPORTS.find(r => r.id === item.id);
      if (!imageUrls || imageUrls.length === 0) {
        if (initialMatch && initialMatch.imageUrls && initialMatch.imageUrls.length > 0) {
          imageUrls = initialMatch.imageUrls;
          changed = true;
        } else if (imageUrl) {
          imageUrls = [imageUrl];
          changed = true;
        }
      }

      if (changed) {
        mutated = true;
        return { ...item, userPhone, imageUrl, imageUrls };
      }
      return item;
    });

    // Ensure any newly added mock reports are merged into local cache
    INITIAL_REPORTS.forEach(initialRep => {
      if (!sanitized.some(s => s.id === initialRep.id)) {
        sanitized.push(initialRep);
        mutated = true;
      }
    });
    if (mutated) {
      safeSetItem(ITEMS_KEY, JSON.stringify(sanitized));
    }
  } catch (err) {
    console.warn('Non-fatal warning while sanitizing items cache:', err);
  }

  return sanitized;
}

function loadLocalClaims(): ItemClaim[] {
  let sanitized: ItemClaim[] = INITIAL_CLAIMS;
  try {
    const raw = localStorage.getItem(CLAIMS_KEY);
    if (!raw) {
      safeSetItem(CLAIMS_KEY, JSON.stringify(INITIAL_CLAIMS));
      return INITIAL_CLAIMS;
    }
    const parsed: ItemClaim[] = JSON.parse(raw);
    sanitized = Array.isArray(parsed) ? parsed : INITIAL_CLAIMS;
  } catch (err) {
    console.warn('Failed to parse claims from localStorage:', err);
    return INITIAL_CLAIMS;
  }

  try {
    let mutated = false;
    sanitized = sanitized.map(claim => {
      if (claim.claimantPhone && (claim.claimantPhone.includes('98765') || claim.claimantPhone.includes('98123') || claim.claimantPhone.includes('98888'))) {
        mutated = true;
        return { ...claim, claimantPhone: '+91 9878XXXXXX' };
      }
      return claim;
    });
    if (mutated) {
      safeSetItem(CLAIMS_KEY, JSON.stringify(sanitized));
    }
  } catch (err) {
    console.warn('Non-fatal warning while sanitizing claims cache:', err);
  }

  return sanitized;
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
  let sanitized: UserProfile[] = DEMO_USERS;
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      const initialUsers: UserProfile[] = [
        ...DEMO_USERS,
        {
          id: 'user_admin_gaurav',
          name: 'Gaurav Singh (Platform Superadmin)',
          email: 'gsrajpoot2019@gmail.com',
          uidOrRoll: 'SAHAYAK4CU-ADMIN',
          phone: '+91 9800000000',
          department: 'Campus Security & Administration',
          role: 'admin',
          joinedDate: '2022-01-15',
          profileCompleted: true,
        },
      ];
      safeSetItem(USERS_KEY, JSON.stringify(initialUsers));
      return initialUsers;
    }
    const parsed: UserProfile[] = JSON.parse(raw);
    sanitized = Array.isArray(parsed) ? parsed : DEMO_USERS;
  } catch (err) {
    console.warn('Failed to parse users from localStorage:', err);
    return DEMO_USERS;
  }

  try {
    let mutated = false;
    sanitized = sanitized.map(user => {
      if (user.phone && (user.phone.includes('98765') || user.phone.includes('98123') || user.phone.includes('98888'))) {
        mutated = true;
        return { ...user, phone: '+91 9878XXXXXX' };
      }
      return user;
    });
    if (mutated) {
      safeSetItem(USERS_KEY, JSON.stringify(sanitized));
    }
  } catch (err) {
    console.warn('Non-fatal warning while sanitizing users cache:', err);
  }

  return sanitized;
}

function loadLocalCalls(): WebRTCCallRecord[] {
  let sanitized: WebRTCCallRecord[] = [];
  try {
    const raw = localStorage.getItem(CALLS_HISTORY_KEY) || localStorage.getItem('sahayak_calls_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        sanitized = parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse calls from localStorage:', err);
  }

  // Continuity check: Recover any calls previously logged in messages if call history is empty
  try {
    const existingCallIds = new Set(sanitized.map(c => c.callId));
    const msgs = loadLocalMessages();
    let recoveredCount = 0;

    msgs.forEach(m => {
      if (m.id.startsWith('msg_call_') || (m.messageText && m.messageText.includes('In-App Voice Call'))) {
        const callId = m.id.replace('msg_', '');
        if (!existingCallIds.has(callId)) {
          const isDeclined = m.messageText.includes('Declined');
          const isCancelled = m.messageText.includes('Cancelled');
          const durationMatch = m.messageText.match(/\((\d{2}):(\d{2})\)/);
          let durationSeconds = 0;
          if (durationMatch) {
            durationSeconds = parseInt(durationMatch[1], 10) * 60 + parseInt(durationMatch[2], 10);
          }

          sanitized.push({
            callId,
            threadId: m.threadId || m.itemId,
            itemId: m.itemId,
            itemTitle: m.itemTitle || 'Lost / Found Item',
            callerId: m.senderId,
            callerName: m.senderName,
            callerEmail: m.senderEmail,
            callerUid: m.senderUid,
            receiverId: m.recipientId || '',
            receiverName: m.recipientName || 'Student',
            receiverEmail: m.recipientEmail || '',
            status: isDeclined ? 'rejected' : (isCancelled ? 'missed' : 'ended'),
            durationSeconds,
            createdAt: m.createdAt,
            endedAt: m.createdAt,
          });
          existingCallIds.add(callId);
          recoveredCount++;
        }
      }
    });

    if (recoveredCount > 0) {
      sanitized.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      safeSetItem(CALLS_HISTORY_KEY, JSON.stringify(sanitized));
    }
  } catch {
    // non-fatal
  }

  return sanitized;
}

// In-memory caches initialized from localStorage
let cachedItems: ItemReport[] = loadLocalItems();
let cachedClaims: ItemClaim[] = loadLocalClaims();
let cachedReceipts: HandoverReceipt[] = loadLocalReceipts();
let cachedMessages: ItemMessage[] = loadLocalMessages();
let cachedUsers: UserProfile[] = loadLocalUsers();
let cachedCalls: WebRTCCallRecord[] = loadLocalCalls();

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
          safeSetItem(ITEMS_KEY, JSON.stringify(firestoreItems));
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
          safeSetItem(CLAIMS_KEY, JSON.stringify(firestoreClaims));
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
          safeSetItem(RECEIPTS_KEY, JSON.stringify(firestoreReceipts));
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
          safeSetItem(MESSAGES_KEY, JSON.stringify(firestoreMessages));
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
          safeSetItem(USERS_KEY, JSON.stringify(cachedUsers));
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
  safeSetItem(ITEMS_KEY, JSON.stringify(cachedItems));
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
  safeSetItem(ITEMS_KEY, JSON.stringify(cachedItems));
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
  safeSetItem(ITEMS_KEY, JSON.stringify(cachedItems));
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
  safeSetItem(ITEMS_KEY, JSON.stringify(cachedItems));
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
  safeSetItem(CLAIMS_KEY, JSON.stringify(cachedClaims));

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
    cachedClaims[idx] = { ...cachedClaims[idx], ...updates, updatedAt: new Date().toISOString() };
    safeSetItem(CLAIMS_KEY, JSON.stringify(cachedClaims));

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
      if (Object.keys(cleanUpdates).length > 0) {
        updateDoc(doc(db, 'claims', claimId), cleanUpdates).catch(err => {
          handleFirestoreError(err, OperationType.UPDATE, `claims/${claimId}`);
          console.warn('Firestore updateClaim failed:', err);
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `claims/${claimId}`);
    }
  }
}

export function deleteClaim(claimId: string): boolean {
  const claim = cachedClaims.find(c => c.id === claimId);
  if (!claim) return false;

  cachedClaims = cachedClaims.filter(c => c.id !== claimId);
  safeSetItem(CLAIMS_KEY, JSON.stringify(cachedClaims));
  notifyListeners();

  try {
    deleteDoc(doc(db, 'claims', claimId)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `claims/${claimId}`);
      console.warn('Firestore deleteClaim failed:', err);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `claims/${claimId}`);
  }

  return true;
}

export function getStoredMessages(): ItemMessage[] {
  return cachedMessages;
}

/**
 * Scopes a chat thread by itemId AND the claimant identifier (1-on-1 private dialogue)
 */
export function getItemThreadId(itemId: string, claimantIdentifier: string): string {
  const cleanItem = (itemId || '').trim();
  const cleanClaimant = (claimantIdentifier || '').trim().toLowerCase();
  return `${cleanItem}__${cleanClaimant}`;
}

/**
 * Resolves or derives the thread ID of a message based on item and participants
 */
export function resolveMessageThreadId(msg: ItemMessage, item?: ItemReport): string {
  if (msg.threadId && msg.threadId.trim()) {
    return msg.threadId.trim();
  }

  const itemId = msg.itemId;
  if (!item) {
    const claimant = msg.recipientId || msg.recipientEmail || msg.senderId || msg.senderEmail || 'claimant';
    return getItemThreadId(itemId, claimant);
  }

  // Poster is item.userId or item.userEmail
  const posterId = (item.userId || '').toLowerCase();
  const posterEmail = (item.userEmail || '').toLowerCase();
  const sId = (msg.senderId || '').toLowerCase();
  const sEmail = (msg.senderEmail || '').toLowerCase();

  const isSenderPoster = (posterId && sId === posterId) || (posterEmail && sEmail === posterEmail);

  if (isSenderPoster) {
    // Sender is poster -> claimant is the recipient
    const claimant = msg.recipientId || msg.recipientEmail || 'claimant';
    return getItemThreadId(itemId, claimant);
  } else {
    // Sender is claimant
    const claimant = msg.senderId || msg.senderEmail || 'claimant';
    return getItemThreadId(itemId, claimant);
  }
}

export interface ItemInquiryThread {
  threadId: string;
  itemId: string;
  claimantId: string;
  claimantName: string;
  claimantEmail: string;
  claimantPhone?: string;
  claimantUid?: string;
  claimantAvatarUrl?: string;
  lastMessage?: ItemMessage;
  unreadCount: number;
  messageCount: number;
  messages: ItemMessage[];
}

export function saveMessage(newMessage: ItemMessage): ItemMessage {
  // Ensure threadId is populated for 1-on-1 private conversation isolation
  if (!newMessage.threadId) {
    const targetItem = cachedItems.find(i => i.id === newMessage.itemId);
    newMessage.threadId = resolveMessageThreadId(newMessage, targetItem);
  }

  // Update local cache immediately
  cachedMessages.unshift(newMessage);
  seenMessageIds.add(newMessage.id);
  safeSetItem(MESSAGES_KEY, JSON.stringify(cachedMessages));

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
    safeSetItem(MESSAGES_KEY, JSON.stringify(cachedMessages));
    notifyListeners();

    try {
      const cleanUpdates = sanitizeForFirestore(updates as Record<string, any>);
      if (Object.keys(cleanUpdates).length > 0) {
        updateDoc(doc(db, 'messages', messageId), cleanUpdates).catch(err => {
          handleFirestoreError(err, OperationType.UPDATE, `messages/${messageId}`);
        });
      }
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
  safeSetItem(MESSAGES_KEY, JSON.stringify(cachedMessages));
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
 * Retrieve messages for an item, strictly scoped to authorized 1-on-1 participant pair.
 * Unauthenticated users or non-participants receive an empty array to prevent privacy leakage.
 */
export function getItemMessages(
  itemId: string,
  requestingUser?: { id?: string; email?: string; role?: string } | null,
  specificThreadId?: string
): ItemMessage[] {
  // If user is not authenticated, strictly block message retrieval
  if (!requestingUser || (!requestingUser.id && !requestingUser.email)) {
    return [];
  }

  const item = cachedItems.find(i => i.id === itemId);
  if (!item) return [];

  const uId = (requestingUser.id || '').toLowerCase();
  const uEmail = (requestingUser.email || '').toLowerCase();
  const isPoster = Boolean(
    (item.userId && item.userId.toLowerCase() === uId) ||
    (item.userEmail && item.userEmail.toLowerCase() === uEmail)
  );
  const isAdmin = requestingUser.role === 'admin' || requestingUser.email === 'gsrajpoot2019@gmail.com';

  const allItemMsgs = cachedMessages.filter(m => m.itemId === itemId);

  // If requestingUser is a claimant (NOT the poster and NOT admin):
  // Strictly isolate to ONLY their 1-on-1 thread with the poster!
  if (!isPoster && !isAdmin) {
    const myThreadIdById = requestingUser.id ? getItemThreadId(itemId, requestingUser.id) : '';
    const myThreadIdByEmail = requestingUser.email ? getItemThreadId(itemId, requestingUser.email) : '';

    return allItemMsgs
      .filter(m => {
        const tId = resolveMessageThreadId(m, item);
        if (tId === myThreadIdById || tId === myThreadIdByEmail) {
          return true;
        }
        // Direct participant check
        const sId = (m.senderId || '').toLowerCase();
        const sEmail = (m.senderEmail || '').toLowerCase();
        const rId = (m.recipientId || '').toLowerCase();
        const rEmail = (m.recipientEmail || '').toLowerCase();
        return (sId === uId || sEmail === uEmail || rId === uId || rEmail === uEmail);
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  // If requestingUser is the poster or admin:
  // If specificThreadId is provided, filter for that claimant's thread
  if (specificThreadId) {
    return allItemMsgs
      .filter(m => resolveMessageThreadId(m, item) === specificThreadId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  // Otherwise return messages for this item
  return allItemMsgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * For item posters: Get all isolated claimant inquiries for an item
 */
export function getItemInquiriesForPoster(
  itemId: string,
  requestingUser?: { id?: string; email?: string; role?: string } | null
): ItemInquiryThread[] {
  if (!requestingUser) return [];

  const item = cachedItems.find(i => i.id === itemId);
  if (!item) return [];

  const uId = (requestingUser.id || '').toLowerCase();
  const uEmail = (requestingUser.email || '').toLowerCase();
  const isPoster = Boolean(
    (item.userId && item.userId.toLowerCase() === uId) ||
    (item.userEmail && item.userEmail.toLowerCase() === uEmail)
  );
  const isAdmin = requestingUser.role === 'admin' || requestingUser.email === 'gsrajpoot2019@gmail.com';

  if (!isPoster && !isAdmin) {
    return [];
  }

  const allItemMsgs = cachedMessages.filter(m => m.itemId === itemId);
  const threadsMap = new Map<string, ItemMessage[]>();

  // Group messages by resolved threadId
  for (const msg of allItemMsgs) {
    const tId = resolveMessageThreadId(msg, item);
    if (!threadsMap.has(tId)) {
      threadsMap.set(tId, []);
    }
    threadsMap.get(tId)!.push(msg);
  }

  // Also include claimants who filed a claim on this item even if they haven't sent a text yet
  const relatedClaims = cachedClaims.filter(c => c.itemId === itemId);
  for (const claim of relatedClaims) {
    const tId = getItemThreadId(itemId, claim.claimantId || claim.claimantEmail);
    if (!threadsMap.has(tId)) {
      threadsMap.set(tId, []);
    }
  }

  const inquiryThreads: ItemInquiryThread[] = [];
  const storedUsers = getStoredUsers();

  threadsMap.forEach((msgs, tId) => {
    msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let claimantId = '';
    let claimantName = '';
    let claimantEmail = '';
    let claimantPhone: string | undefined;
    let claimantUid: string | undefined;
    let claimantAvatarUrl: string | undefined;

    // Detect claimant from messages
    const claimantMsg = msgs.find(m => {
      const sId = (m.senderId || '').toLowerCase();
      const sEmail = (m.senderEmail || '').toLowerCase();
      const posterId = (item.userId || '').toLowerCase();
      const posterEmail = (item.userEmail || '').toLowerCase();
      return (sId !== posterId && sEmail !== posterEmail);
    }) || msgs[0];

    if (claimantMsg) {
      const isFromClaimant = claimantMsg.senderId !== item.userId && claimantMsg.senderEmail?.toLowerCase() !== item.userEmail?.toLowerCase();
      if (isFromClaimant) {
        claimantId = claimantMsg.senderId;
        claimantName = claimantMsg.senderName;
        claimantEmail = claimantMsg.senderEmail;
        claimantPhone = claimantMsg.senderPhone;
        claimantUid = claimantMsg.senderUid;
      } else {
        claimantId = claimantMsg.recipientId || '';
        claimantName = claimantMsg.recipientName || 'Student Claimant';
        claimantEmail = claimantMsg.recipientEmail || '';
      }
    }

    // Match with claims
    const claim = relatedClaims.find(c => 
      (c.claimantId && c.claimantId === claimantId) ||
      (c.claimantEmail && c.claimantEmail.toLowerCase() === claimantEmail.toLowerCase()) ||
      tId === getItemThreadId(itemId, c.claimantId || c.claimantEmail)
    );

    if (claim) {
      claimantId = claimantId || claim.claimantId;
      claimantName = claimantName || claim.claimantName;
      claimantEmail = claimantEmail || claim.claimantEmail;
      claimantPhone = claimantPhone || claim.claimantPhone;
      claimantUid = claimantUid || claim.claimantUid;
      claimantAvatarUrl = claimantAvatarUrl || claim.claimantAvatarUrl;
    }

    // Match with user profile
    const matchedUser = storedUsers.find(u => 
      (claimantId && u.id === claimantId) ||
      (claimantEmail && u.email?.toLowerCase() === claimantEmail.toLowerCase())
    ) || DEMO_USERS.find(d => 
      (claimantId && d.id === claimantId) ||
      (claimantEmail && d.email?.toLowerCase() === claimantEmail.toLowerCase())
    );

    if (matchedUser) {
      claimantName = claimantName || matchedUser.name;
      claimantAvatarUrl = claimantAvatarUrl || matchedUser.avatarUrl;
      claimantPhone = claimantPhone || matchedUser.phone;
      claimantUid = claimantUid || matchedUser.uidOrRoll;
    }

    if (!claimantName) {
      claimantName = 'Student Claimant';
    }

    const unreadCount = msgs.filter(m => {
      const isForPoster = m.recipientId === item.userId || 
        (item.userEmail && m.recipientEmail?.toLowerCase() === item.userEmail.toLowerCase()) ||
        (!m.recipientId && m.senderId !== item.userId);
      return isForPoster && m.status === 'unread';
    }).length;

    const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : undefined;

    inquiryThreads.push({
      threadId: tId,
      itemId,
      claimantId,
      claimantName,
      claimantEmail,
      claimantPhone,
      claimantUid,
      claimantAvatarUrl,
      lastMessage: lastMsg,
      unreadCount,
      messageCount: msgs.length,
      messages: msgs,
    });
  });

  // Sort: highest unread first, then latest message time
  inquiryThreads.sort((a, b) => {
    if (a.unreadCount !== b.unreadCount) {
      return b.unreadCount - a.unreadCount;
    }
    const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  return inquiryThreads;
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
  safeSetItem(RECEIPTS_KEY, JSON.stringify(cachedReceipts));
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

export function deleteReceipt(receiptNumber: string): boolean {
  const receipt = cachedReceipts.find(r => r.receiptNumber === receiptNumber);
  if (!receipt) return false;

  cachedReceipts = cachedReceipts.filter(r => r.receiptNumber !== receiptNumber);
  safeSetItem(RECEIPTS_KEY, JSON.stringify(cachedReceipts));
  notifyListeners();

  try {
    deleteDoc(doc(db, 'receipts', receiptNumber)).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `receipts/${receiptNumber}`);
      console.warn('Firestore deleteReceipt failed:', err);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `receipts/${receiptNumber}`);
  }

  return true;
}

export function resetDemoData(): void {
  cachedItems = [...INITIAL_REPORTS];
  cachedClaims = [...INITIAL_CLAIMS];
  cachedReceipts = [];
  safeSetItem(ITEMS_KEY, JSON.stringify(cachedItems));
  safeSetItem(CLAIMS_KEY, JSON.stringify(cachedClaims));
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
        phone: item.userPhone || '+91 9878XXXXXX',
        uidOrRoll: item.userUid || '21BCS0000',
        department: 'Computer Science & Engineering (CSE)',
        role: (item.userEmail && (item.userEmail.includes('admin') || item.userEmail.includes('security'))) ? 'admin' : 'student',
        avatarUrl: item.userAvatarUrl || (DEMO_USERS.find(d => d.id === item.userId || d.email === item.userEmail)?.avatarUrl),
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
  safeSetItem(USERS_KEY, JSON.stringify(cachedUsers));
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

  safeSetItem(USERS_KEY, JSON.stringify(cachedUsers));
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
  safeSetItem(USERS_KEY, JSON.stringify(cachedUsers));
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

// ================= CALL HISTORY & LOG MANAGEMENT (STRICT 1-ON-1 PRIVACY) =================

/**
 * Retrieve stored call history strictly scoped to the authenticated user.
 * Strictly returns only calls where currentUser.id (or currentUser.email) is either
 * the caller or receiver, preventing unauthorized viewing of call history.
 * If no authenticated user ID is provided, an empty array is returned.
 */
export function getStoredCalls(
  currentUserIdOrUser?: string | { id?: string; email?: string } | null,
  currentUserEmail?: string
): WebRTCCallRecord[] {
  let targetId = '';
  let targetEmail = '';

  if (typeof currentUserIdOrUser === 'string') {
    targetId = currentUserIdOrUser.trim();
  } else if (currentUserIdOrUser && typeof currentUserIdOrUser === 'object') {
    targetId = (currentUserIdOrUser.id || '').trim();
    targetEmail = (currentUserIdOrUser.email || '').trim();
  }

  if (currentUserEmail && typeof currentUserEmail === 'string' && !targetEmail) {
    targetEmail = currentUserEmail.trim();
  }

  // If no authenticated user ID or email is provided, strictly block access to prevent unauthorized viewing
  if (!targetId && !targetEmail) {
    return [];
  }

  const normalizedId = targetId.toLowerCase();
  const normalizedEmail = targetEmail.toLowerCase();

  const allCalls = cachedCalls.length > 0 ? cachedCalls : loadLocalCalls();

  return allCalls
    .filter(call => {
      const cId = (call.callerId || '').trim().toLowerCase();
      const rId = (call.receiverId || '').trim().toLowerCase();
      const cEmail = (call.callerEmail || '').trim().toLowerCase();
      const rEmail = (call.receiverEmail || '').trim().toLowerCase();

      // Ensure that currentUser.id is strictly either the caller or receiver
      const isCaller = Boolean(
        (normalizedId && cId === normalizedId) ||
        (normalizedEmail && cEmail === normalizedEmail)
      );

      const isReceiver = Boolean(
        (normalizedId && rId === normalizedId) ||
        (normalizedEmail && rEmail === normalizedEmail)
      );

      return isCaller || isReceiver;
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

/**
 * Saves or updates a call record in persistent call history storage
 */
export function saveCallRecord(session: WebRTCCallRecord | any): void {
  if (!session || !session.callId) return;

  // Clean data to avoid storing large WebRTC SDP/candidate blobs in history
  const cleanRecord: WebRTCCallRecord = {
    callId: session.callId,
    threadId: session.threadId || session.itemId,
    itemId: session.itemId,
    itemTitle: session.itemTitle || 'Lost / Found Item',
    callerId: session.callerId,
    callerName: session.callerName,
    callerEmail: session.callerEmail || '',
    callerAvatarUrl: session.callerAvatarUrl,
    callerUid: session.callerUid,
    receiverId: session.receiverId,
    receiverName: session.receiverName,
    receiverEmail: session.receiverEmail || '',
    receiverAvatarUrl: session.receiverAvatarUrl,
    receiverUid: session.receiverUid,
    status: session.status || 'ended',
    createdAt: session.createdAt || new Date().toISOString(),
    startedAt: session.startedAt,
    endedAt: session.endedAt || (session.status === 'ended' || session.status === 'rejected' ? new Date().toISOString() : undefined),
    durationSeconds: session.durationSeconds || 0,
  };

  const existingIdx = cachedCalls.findIndex(c => c.callId === cleanRecord.callId);
  if (existingIdx >= 0) {
    cachedCalls[existingIdx] = { ...cachedCalls[existingIdx], ...cleanRecord };
  } else {
    cachedCalls.unshift(cleanRecord);
  }

  // Keep latest 80 calls max to protect storage quota
  if (cachedCalls.length > 80) {
    cachedCalls = cachedCalls.slice(0, 80);
  }

  safeSetItem(CALLS_HISTORY_KEY, JSON.stringify(cachedCalls));
  notifyListeners();
}

/**
 * Delete a specific call record from history, authorized only for participants
 */
export function deleteCallRecord(callId: string, currentUserId: string): boolean {
  if (!currentUserId) return false;
  const uid = currentUserId.toLowerCase().trim();
  const call = cachedCalls.find(c => c.callId === callId);
  if (!call) return false;

  // Only participant (caller or receiver) can delete their call record
  if (call.callerId?.toLowerCase() !== uid && call.receiverId?.toLowerCase() !== uid) {
    return false;
  }

  cachedCalls = cachedCalls.filter(c => c.callId !== callId);
  safeSetItem(CALLS_HISTORY_KEY, JSON.stringify(cachedCalls));
  notifyListeners();
  return true;
}

/**
 * Clear call history for the authenticated user only
 */
export function clearCallHistory(currentUserId: string): void {
  if (!currentUserId) return;
  const uid = currentUserId.toLowerCase().trim();
  cachedCalls = cachedCalls.filter(
    c => c.callerId?.toLowerCase() !== uid && c.receiverId?.toLowerCase() !== uid
  );
  safeSetItem(CALLS_HISTORY_KEY, JSON.stringify(cachedCalls));
  notifyListeners();
}

