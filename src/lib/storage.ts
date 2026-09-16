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
import { ItemReport, ItemClaim, HandoverReceipt } from '../types';
import { INITIAL_REPORTS, INITIAL_CLAIMS } from '../data/mockData';

const ITEMS_KEY = 'sahayak_items_v1';
const CLAIMS_KEY = 'sahayak_claims_v1';
const RECEIPTS_KEY = 'sahayak_receipts_v1';

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

// In-memory caches initialized from localStorage
let cachedItems: ItemReport[] = loadLocalItems();
let cachedClaims: ItemClaim[] = loadLocalClaims();
let cachedReceipts: HandoverReceipt[] = loadLocalReceipts();

let unsubscribeItems: (() => void) | null = null;
let unsubscribeClaims: (() => void) | null = null;
let unsubscribeReceipts: (() => void) | null = null;

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
}

// Automatically start synchronization on load and bind auth lifecycle
if (typeof window !== 'undefined') {
  initFirestoreSync();
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

export function updateItemStatus(itemId: string, status: ItemReport['status'], requestingUserId?: string, isAdmin?: boolean): boolean {
  // Update local
  const index = cachedItems.findIndex(i => i.id === itemId);
  if (index < 0) return false;

  const item = cachedItems[index];
  if (requestingUserId && !isAdmin && item.userId !== requestingUserId) {
    console.warn(`[Security] Unauthorized status update attempt on item ${itemId} by user ${requestingUserId}`);
    return false;
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

export function updateItem(itemId: string, updates: Partial<ItemReport>, requestingUserId?: string, isAdmin?: boolean): boolean {
  const index = cachedItems.findIndex(i => i.id === itemId);
  if (index < 0) return false;

  const item = cachedItems[index];
  if (requestingUserId && !isAdmin && item.userId !== requestingUserId) {
    console.warn(`[Security] Unauthorized edit attempt on item ${itemId} by user ${requestingUserId}`);
    return false;
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

export function deleteItem(itemId: string, requestingUserId?: string, isAdmin?: boolean): boolean {
  const item = cachedItems.find(i => i.id === itemId);
  if (!item) return false;

  if (requestingUserId && !isAdmin && item.userId !== requestingUserId) {
    console.warn(`[Security] Unauthorized delete attempt on item ${itemId} by user ${requestingUserId}`);
    return false;
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

  // Automatically update the associated item status to 'claim_pending'
  updateItemStatus(newClaim.itemId, 'claim_pending');

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
