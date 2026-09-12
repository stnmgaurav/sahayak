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

export function getStoredItems(): ItemReport[] {
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    if (!raw) {
      localStorage.setItem(ITEMS_KEY, JSON.stringify(INITIAL_REPORTS));
      return INITIAL_REPORTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load items from storage:', err);
    return INITIAL_REPORTS;
  }
}

export function saveItem(newItem: ItemReport): ItemReport {
  const items = getStoredItems();
  const existingIdx = items.findIndex(i => i.id === newItem.id);
  
  if (existingIdx >= 0) {
    items[existingIdx] = { ...items[existingIdx], ...newItem, updatedAt: new Date().toISOString() };
  } else {
    items.unshift(newItem);
  }

  localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  notifyListeners();
  return newItem;
}

export function updateItemStatus(itemId: string, status: ItemReport['status']): void {
  const items = getStoredItems();
  const index = items.findIndex(i => i.id === itemId);
  if (index >= 0) {
    items[index].status = status;
    items[index].updatedAt = new Date().toISOString();
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
    notifyListeners();
  }
}

export function deleteItem(itemId: string): void {
  const items = getStoredItems();
  const filtered = items.filter(i => i.id !== itemId);
  localStorage.setItem(ITEMS_KEY, JSON.stringify(filtered));
  notifyListeners();
}

export function getStoredClaims(): ItemClaim[] {
  try {
    const raw = localStorage.getItem(CLAIMS_KEY);
    if (!raw) {
      localStorage.setItem(CLAIMS_KEY, JSON.stringify(INITIAL_CLAIMS));
      return INITIAL_CLAIMS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load claims from storage:', err);
    return INITIAL_CLAIMS;
  }
}

export function saveClaim(newClaim: ItemClaim): ItemClaim {
  const claims = getStoredClaims();
  claims.unshift(newClaim);
  localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));

  // Automatically update the associated item status to 'claim_pending'
  updateItemStatus(newClaim.itemId, 'claim_pending');

  notifyListeners();
  return newClaim;
}

export function updateClaim(claimId: string, updates: Partial<ItemClaim>): void {
  const claims = getStoredClaims();
  const idx = claims.findIndex(c => c.id === claimId);
  if (idx >= 0) {
    claims[idx] = { ...claims[idx], ...updates };
    localStorage.setItem(CLAIMS_KEY, JSON.stringify(claims));

    // If claim is verified or returned, update the item status accordingly
    if (updates.status === 'verified') {
      updateItemStatus(claims[idx].itemId, 'verified');
    } else if (updates.status === 'returned') {
      updateItemStatus(claims[idx].itemId, 'returned');
    } else if (updates.status === 'rejected') {
      updateItemStatus(claims[idx].itemId, 'found');
    }

    notifyListeners();
  }
}

export function getStoredReceipts(): HandoverReceipt[] {
  try {
    const raw = localStorage.getItem(RECEIPTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function saveReceipt(receipt: HandoverReceipt): void {
  const receipts = getStoredReceipts();
  receipts.unshift(receipt);
  localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
  notifyListeners();
}

export function resetDemoData(): void {
  localStorage.setItem(ITEMS_KEY, JSON.stringify(INITIAL_REPORTS));
  localStorage.setItem(CLAIMS_KEY, JSON.stringify(INITIAL_CLAIMS));
  localStorage.removeItem(RECEIPTS_KEY);
  notifyListeners();
}

/**
 * Reads an image file and converts to high quality Base64 Data URL,
 * simulating or executing Cloudinary storage upload.
 */
export async function uploadImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image'));
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('Image size should be less than 5MB'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image data'));
      }
    };
    reader.onerror = () => reject(new Error('Image read error'));
    reader.readAsDataURL(file);
  });
}
