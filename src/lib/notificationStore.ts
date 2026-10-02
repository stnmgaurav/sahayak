import { ItemReport, ItemClaim, ItemMessage } from '../types';
import { getStoredItems, getStoredClaims, getStoredMessages, subscribeToStorage } from './storage';
import { findMatchesForItem } from './matching';

export type NotificationCategory = 'message' | 'match' | 'claim' | 'item' | 'security' | 'system';

export interface ClaimNotificationDetails {
  claimantName: string;
  claimantUid: string;
  claimantPhone?: string;
  claimantEmail?: string;
  proofDescription: string;
  proofImageUrl?: string;
  serialNumberOrIdentifier?: string;
  secretAnswer?: string;
  status: 'pending' | 'verified' | 'rejected' | 'returned';
  pickupLocation?: string;
  rejectionReason?: string;
  adminNotes?: string;
  finderName?: string;
  finderEmail?: string;
}

export interface AppNotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  timestamp: string; // ISO string
  read: boolean;
  statusText: string;
  statusType: 'unread' | 'read' | 'urgent' | 'success' | 'warning' | 'info';
  itemId?: string;
  itemTitle?: string;
  itemImage?: string;
  claimId?: string;
  messageId?: string;
  actionLabel?: string;
  actionType?: 'open_chat' | 'view_item' | 'compare_match' | 'view_claim' | 'open_security' | 'review_claim';
  recipientId?: string;
  recipientEmail?: string;
  claimDetails?: ClaimNotificationDetails;
}

const NOTIFICATIONS_STORAGE_KEY = 'sahayak_notifications_store_v2';
const NOTIFICATIONS_DELETED_KEY = 'sahayak_notifications_deleted_v2';

type NotificationListener = () => void;
const listeners: Set<NotificationListener> = new Set();

export function subscribeToNotificationStore(callback: NotificationListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function notifyListeners() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.warn('Notification listener error:', e);
    }
  });
}

function getDeletedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_DELETED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDeletedId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const set = getDeletedIds();
    set.add(id);
    localStorage.setItem(NOTIFICATIONS_DELETED_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Failed to save deleted notification id:', e);
  }
}

function loadStoredRawNotifications(): AppNotificationItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRawNotifications(notifications: AppNotificationItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    notifyListeners();
  } catch (e) {
    console.warn('Failed to save notifications:', e);
  }
}

/**
 * Generate initial welcome and system notifications if storage is empty
 */
function getInitialSeedNotifications(): AppNotificationItem[] {
  const now = new Date();
  const timeMinus15m = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const timeMinus2h = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
  const timeMinus1d = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();

  return [
    {
      id: 'notif_seed_match_01',
      category: 'match',
      title: 'AI High-Confidence Match Found (88%)',
      description: 'A found boAt TWS Earbuds Charging Case turned in at Central Library matches your reported lost boAt Airdopes 141.',
      timestamp: timeMinus15m,
      read: false,
      statusText: 'Action Required',
      statusType: 'urgent',
      itemId: 'rep_lost_01',
      itemTitle: 'boAt Airdopes 141 Case (Black)',
      itemImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
      actionLabel: 'Review Match',
      actionType: 'compare_match',
      recipientEmail: 'arjun.21bcs10482@cuchd.in',
    },
    {
      id: 'notif_seed_msg_01',
      category: 'message',
      title: 'New Finder Message from Priya Verma',
      description: '"I deposited your black earbud case with Central Library Circulation Desk Incharge."',
      timestamp: timeMinus2h,
      read: false,
      statusText: 'New Message',
      statusType: 'unread',
      itemId: 'rep_lost_01',
      itemTitle: 'boAt Airdopes 141 Case (Black)',
      itemImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
      actionLabel: 'Open Chat',
      actionType: 'open_chat',
      recipientEmail: 'arjun.21bcs10482@cuchd.in',
    },
    {
      id: 'notif_seed_sys_01',
      category: 'system',
      title: 'Welcome to SAHAYAK Campus Lost & Found',
      description: 'Your official Chandigarh University student lost & found portal is active. You will receive live alerts for item updates and chat messages.',
      timestamp: timeMinus1d,
      read: true,
      statusText: 'Verified Desk',
      statusType: 'info',
      actionLabel: 'View Registry',
      actionType: 'view_item',
    },
  ];
}

/**
 * Returns all active notifications filtered and customized for the given user.
 * Automatically synchronizes with live messages, claims, and AI matches.
 */
export function getStoredNotifications(
  currentUserId?: string | null,
  currentUserEmail?: string | null
): AppNotificationItem[] {
  const deletedIds = getDeletedIds();
  let stored = loadStoredRawNotifications();

  // If storage is completely empty, initialize with seed notifications
  if (stored.length === 0 && deletedIds.size === 0) {
    stored = getInitialSeedNotifications();
    saveRawNotifications(stored);
  }

  // Synthesize notifications from current messages in storage
  const messages = getStoredMessages();
  const items = getStoredItems();
  const claims = getStoredClaims();

  const userEmailLower = currentUserEmail ? currentUserEmail.trim().toLowerCase() : null;

  // Track existing message notification IDs
  const existingIds = new Set(stored.map((n) => n.id));

  // Check incoming messages
  messages.forEach((msg) => {
    const notifId = `notif_msg_${msg.id}`;
    if (deletedIds.has(notifId) || existingIds.has(notifId)) return;

    // Check if the message is for this user
    const targetItem = items.find((i) => i.id === msg.itemId);
    const isDirectRecipient =
      (currentUserId && msg.recipientId === currentUserId) ||
      (userEmailLower && msg.recipientEmail && msg.recipientEmail.toLowerCase() === userEmailLower);

    const isItemOwner =
      targetItem &&
      ((currentUserId && targetItem.userId === currentUserId) ||
        (userEmailLower && targetItem.userEmail && targetItem.userEmail.toLowerCase() === userEmailLower));

    const isSender =
      (currentUserId && msg.senderId === currentUserId) ||
      (userEmailLower && msg.senderEmail && msg.senderEmail.toLowerCase() === userEmailLower);

    // If message is relevant to the user and user is not the sender
    if ((isDirectRecipient || isItemOwner) && !isSender) {
      stored.unshift({
        id: notifId,
        category: 'message',
        title: `Message for "${targetItem?.title || msg.itemTitle || 'Your Item'}"`,
        description: `${msg.senderName || 'Student'}: "${msg.messageText.length > 80 ? msg.messageText.slice(0, 80) + '...' : msg.messageText}"`,
        timestamp: msg.createdAt || new Date().toISOString(),
        read: msg.status === 'read',
        statusText: msg.status === 'read' ? 'Read' : 'New Message',
        statusType: msg.status === 'read' ? 'read' : 'unread',
        itemId: msg.itemId,
        itemTitle: targetItem?.title || msg.itemTitle,
        itemImage: targetItem?.imageUrl,
        messageId: msg.id,
        actionLabel: 'Open Chat',
        actionType: 'open_chat',
        recipientId: msg.recipientId,
        recipientEmail: msg.recipientEmail,
      });
      existingIds.add(notifId);
    }
  });

  // Check claims
  claims.forEach((claim) => {
    const targetItem = items.find((i) => i.id === claim.itemId);
    const finderEmail = (targetItem?.userEmail || claim.finderEmail || '').toLowerCase();
    const finderId = targetItem?.userId || claim.finderId;
    const claimantEmail = (claim.claimantEmail || '').toLowerCase();

    const claimDetails: ClaimNotificationDetails = {
      claimantName: claim.claimantName,
      claimantUid: claim.claimantUid,
      claimantPhone: claim.claimantPhone,
      claimantEmail: claim.claimantEmail,
      proofDescription: claim.proofDescription,
      proofImageUrl: claim.proofImageUrl,
      serialNumberOrIdentifier: claim.serialNumberOrIdentifier,
      secretAnswer: claim.secretAnswer,
      status: claim.status,
      pickupLocation: claim.pickupLocation,
      rejectionReason: claim.rejectionReason,
      adminNotes: claim.adminNotes,
      finderName: claim.finderName || targetItem?.userName,
      finderEmail: finderEmail || undefined,
    };

    // 1. ROUTE NOTIFICATION TO FINDER (Person who posted the found item)
    if (finderEmail || finderId) {
      const finderNotifId = `notif_claim_finder_${claim.id}_${claim.status}`;
      if (!deletedIds.has(finderNotifId) && !existingIds.has(finderNotifId)) {
        let title = `New Ownership Claim: "${claim.itemTitle}"`;
        let desc = `${claim.claimantName} (${claim.claimantUid}) submitted proof: "${claim.proofDescription.slice(0, 90)}...". Open to review verification details and accept/reject handover.`;
        let statusText = 'Needs Review';
        let statusType: AppNotificationItem['statusType'] = 'urgent';

        if (claim.status === 'verified') {
          title = `Handover Approved for "${claim.itemTitle}"`;
          desc = `You approved ${claim.claimantName}'s claim. Pickup location set to: ${claim.pickupLocation || 'Campus Security Desk'}.`;
          statusText = 'Approved';
          statusType = 'success';
        } else if (claim.status === 'rejected') {
          title = `Claim Rejected for "${claim.itemTitle}"`;
          desc = `You rejected ${claim.claimantName}'s claim. Item remains active in the campus registry.`;
          statusText = 'Rejected';
          statusType = 'info';
        } else if (claim.status === 'returned') {
          title = `Handover Complete: "${claim.itemTitle}"`;
          desc = `Item has been officially returned to owner ${claim.claimantName}.`;
          statusText = 'Recovered';
          statusType = 'success';
        }

        stored.unshift({
          id: finderNotifId,
          category: 'claim',
          title,
          description: desc,
          timestamp: claim.updatedAt || claim.createdAt || new Date().toISOString(),
          read: claim.status === 'verified' || claim.status === 'returned',
          statusText,
          statusType,
          itemId: claim.itemId,
          itemTitle: claim.itemTitle,
          itemImage: targetItem?.imageUrl,
          claimId: claim.id,
          actionLabel: claim.status === 'pending' ? 'Review Claim' : 'View Details',
          actionType: 'review_claim',
          recipientId: finderId,
          recipientEmail: finderEmail,
          claimDetails,
        });
        existingIds.add(finderNotifId);
      }
    }

    // 2. ROUTE NOTIFICATION TO CLAIMANT (Person who lost the item & claimed it)
    if (claimantEmail || claim.claimantId) {
      const claimantNotifId = `notif_claim_claimant_${claim.id}_${claim.status}`;
      if (!deletedIds.has(claimantNotifId) && !existingIds.has(claimantNotifId)) {
        let title = `Claim Submitted for "${claim.itemTitle}"`;
        let desc = `Your verification details were routed to the finder. You will receive an alert once they review and confirm handover.`;
        let statusText = 'Pending Review';
        let statusType: AppNotificationItem['statusType'] = 'unread';
        let actionLabel = 'Track Claim';

        if (claim.status === 'verified') {
          title = `🎉 Claim Approved for "${claim.itemTitle}"!`;
          desc = `The finder verified your ownership proof! Collect your belonging at: ${claim.pickupLocation || 'Main Security Gate 1 Desk'}.`;
          statusText = 'Verified & Ready';
          statusType = 'success';
          actionLabel = 'View Handover Pass';
        } else if (claim.status === 'rejected') {
          title = `Claim Not Approved: "${claim.itemTitle}"`;
          desc = `The finder or security could not verify your claim. ${claim.rejectionReason ? `Reason: "${claim.rejectionReason}"` : 'Details did not match identifying marks.'}`;
          statusText = 'Not Approved';
          statusType = 'warning';
          actionLabel = 'View Details';
        } else if (claim.status === 'returned') {
          title = `Item Handover Complete: "${claim.itemTitle}"`;
          desc = `Official handover was completed and signed for at Chandigarh University Security Desk.`;
          statusText = 'Recovered';
          statusType = 'success';
          actionLabel = 'View Receipt';
        }

        stored.unshift({
          id: claimantNotifId,
          category: 'claim',
          title,
          description: desc,
          timestamp: claim.updatedAt || claim.createdAt || new Date().toISOString(),
          read: claim.status === 'returned',
          statusText,
          statusType,
          itemId: claim.itemId,
          itemTitle: claim.itemTitle,
          itemImage: targetItem?.imageUrl,
          claimId: claim.id,
          actionLabel,
          actionType: 'view_claim',
          recipientId: claim.claimantId,
          recipientEmail: claimantEmail,
          claimDetails,
        });
        existingIds.add(claimantNotifId);
      }
    }
  });

  // Filter out notifications not belonging to this user if user is logged in
  const filtered = stored.filter((notif) => {
    if (deletedIds.has(notif.id)) return false;
    // System notifications are visible to everyone
    if (notif.category === 'system' || !notif.recipientEmail) return true;
    if (!userEmailLower && !currentUserId) return true; // Guest view gets general seed

    const matchesEmail = userEmailLower && notif.recipientEmail && notif.recipientEmail.trim().toLowerCase() === userEmailLower;
    const matchesId = currentUserId && notif.recipientId && notif.recipientId === currentUserId;
    return Boolean(matchesEmail || matchesId);
  });

  // Sort newest first
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return filtered;
}

/**
 * Mark a single notification as read
 */
export function markNotificationAsRead(notificationId: string): void {
  const list = loadStoredRawNotifications();
  const idx = list.findIndex((n) => n.id === notificationId);
  if (idx >= 0) {
    list[idx].read = true;
    list[idx].statusText = 'Read';
    list[idx].statusType = 'read';
    saveRawNotifications(list);
  }
}

/**
 * Toggle read / unread status for a notification
 */
export function toggleNotificationRead(notificationId: string): void {
  const list = loadStoredRawNotifications();
  const idx = list.findIndex((n) => n.id === notificationId);
  if (idx >= 0) {
    const nextRead = !list[idx].read;
    list[idx].read = nextRead;
    list[idx].statusText = nextRead ? 'Read' : 'Unread';
    list[idx].statusType = nextRead ? 'read' : 'unread';
    saveRawNotifications(list);
  }
}

/**
 * Mark all notifications as read for current user
 */
export function markAllNotificationsAsRead(
  currentUserId?: string | null,
  currentUserEmail?: string | null
): void {
  const list = loadStoredRawNotifications();
  const userEmailLower = currentUserEmail ? currentUserEmail.trim().toLowerCase() : null;

  const updated = list.map((notif) => {
    if (!userEmailLower || !notif.recipientEmail || notif.recipientEmail.toLowerCase() === userEmailLower) {
      return {
        ...notif,
        read: true,
        statusText: 'Read',
        statusType: 'read' as const,
      };
    }
    return notif;
  });

  saveRawNotifications(updated);
}

/**
 * Permanently delete or dismiss a single notification
 */
export function deleteNotification(notificationId: string): void {
  saveDeletedId(notificationId);
  const list = loadStoredRawNotifications();
  const filtered = list.filter((n) => n.id !== notificationId);
  saveRawNotifications(filtered);
}

/**
 * Clear all notifications for the user
 */
export function clearAllNotifications(
  currentUserId?: string | null,
  currentUserEmail?: string | null
): void {
  const list = loadStoredRawNotifications();
  const userEmailLower = currentUserEmail ? currentUserEmail.trim().toLowerCase() : null;

  // Mark all currently visible as deleted so synthesized ones won't immediately resurface
  list.forEach((notif) => {
    if (!userEmailLower || !notif.recipientEmail || notif.recipientEmail.toLowerCase() === userEmailLower) {
      saveDeletedId(notif.id);
    }
  });

  const remaining = userEmailLower
    ? list.filter((n) => n.recipientEmail && n.recipientEmail.toLowerCase() !== userEmailLower)
    : [];

  saveRawNotifications(remaining);
}

/**
 * Add a new custom or system notification
 */
export function addAppNotification(
  notification: Omit<AppNotificationItem, 'id' | 'timestamp'> & { timestamp?: string }
): AppNotificationItem {
  const newNotif: AppNotificationItem = {
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: notification.timestamp || new Date().toISOString(),
  };

  const list = loadStoredRawNotifications();
  list.unshift(newNotif);
  saveRawNotifications(list);
  return newNotif;
}

/**
 * Automatically route a newly submitted claim notification to the user who posted the found listing
 */
export function routeClaimNotificationToFinder(claim: ItemClaim, item?: ItemReport): AppNotificationItem {
  const targetItem = item || getStoredItems().find((i) => i.id === claim.itemId);
  const finderEmail = (targetItem?.userEmail || claim.finderEmail || '').toLowerCase();
  const finderId = targetItem?.userId || claim.finderId;

  const claimDetails: ClaimNotificationDetails = {
    claimantName: claim.claimantName,
    claimantUid: claim.claimantUid,
    claimantPhone: claim.claimantPhone,
    claimantEmail: claim.claimantEmail,
    proofDescription: claim.proofDescription,
    proofImageUrl: claim.proofImageUrl,
    serialNumberOrIdentifier: claim.serialNumberOrIdentifier,
    secretAnswer: claim.secretAnswer,
    status: claim.status,
    pickupLocation: claim.pickupLocation,
    rejectionReason: claim.rejectionReason,
    adminNotes: claim.adminNotes,
    finderName: claim.finderName || targetItem?.userName,
    finderEmail: finderEmail || undefined,
  };

  const notifId = `notif_claim_finder_${claim.id}_${claim.status}`;
  const newNotif: AppNotificationItem = {
    id: notifId,
    category: 'claim',
    title: `🚨 New Ownership Claim: "${claim.itemTitle}"`,
    description: `${claim.claimantName} (${claim.claimantUid}) filed a verification claim: "${claim.proofDescription.slice(0, 95)}...". Review proof details to accept or reject handover.`,
    timestamp: claim.createdAt || new Date().toISOString(),
    read: false,
    statusText: 'Needs Review',
    statusType: 'urgent',
    itemId: claim.itemId,
    itemTitle: claim.itemTitle,
    itemImage: targetItem?.imageUrl || claim.proofImageUrl,
    claimId: claim.id,
    actionLabel: 'Review Claim',
    actionType: 'review_claim',
    recipientId: finderId,
    recipientEmail: finderEmail,
    claimDetails,
  };

  const list = loadStoredRawNotifications();
  // Filter out any duplicate for this claim ID
  const cleanList = list.filter((n) => !n.id.startsWith(`notif_claim_finder_${claim.id}`));
  cleanList.unshift(newNotif);
  saveRawNotifications(cleanList);

  return newNotif;
}

/**
 * Route claim acceptance / rejection decision updates to both finder and claimant
 */
export function routeClaimDecisionNotification(
  claim: ItemClaim,
  decision: 'verified' | 'rejected',
  details?: { pickupLocation?: string; reason?: string; adminNotes?: string }
): void {
  const targetItem = getStoredItems().find((i) => i.id === claim.itemId);
  const finderEmail = (targetItem?.userEmail || claim.finderEmail || '').toLowerCase();
  const finderId = targetItem?.userId || claim.finderId;
  const claimantEmail = (claim.claimantEmail || '').toLowerCase();

  const claimDetails: ClaimNotificationDetails = {
    claimantName: claim.claimantName,
    claimantUid: claim.claimantUid,
    claimantPhone: claim.claimantPhone,
    claimantEmail: claim.claimantEmail,
    proofDescription: claim.proofDescription,
    proofImageUrl: claim.proofImageUrl,
    serialNumberOrIdentifier: claim.serialNumberOrIdentifier,
    secretAnswer: claim.secretAnswer,
    status: decision,
    pickupLocation: details?.pickupLocation || claim.pickupLocation,
    rejectionReason: details?.reason || claim.rejectionReason,
    adminNotes: details?.adminNotes || claim.adminNotes,
    finderName: claim.finderName || targetItem?.userName,
    finderEmail: finderEmail || undefined,
  };

  const list = loadStoredRawNotifications();
  const now = new Date().toISOString();

  // 1. Finder notification
  const finderNotifId = `notif_claim_finder_${claim.id}_${decision}`;
  const finderTitle = decision === 'verified'
    ? `Handover Approved for "${claim.itemTitle}"`
    : `Claim Rejected for "${claim.itemTitle}"`;
  const finderDesc = decision === 'verified'
    ? `You approved ${claim.claimantName}'s claim. Pickup location set to: ${details?.pickupLocation || claim.pickupLocation || 'Main Security Gate 1 Desk'}.`
    : `You rejected ${claim.claimantName}'s claim. Item remains active in the campus registry.`;

  const finderNotif: AppNotificationItem = {
    id: finderNotifId,
    category: 'claim',
    title: finderTitle,
    description: finderDesc,
    timestamp: now,
    read: true,
    statusText: decision === 'verified' ? 'Approved' : 'Rejected',
    statusType: decision === 'verified' ? 'success' : 'info',
    itemId: claim.itemId,
    itemTitle: claim.itemTitle,
    itemImage: targetItem?.imageUrl,
    claimId: claim.id,
    actionLabel: 'View Details',
    actionType: 'review_claim',
    recipientId: finderId,
    recipientEmail: finderEmail,
    claimDetails,
  };

  // 2. Claimant notification
  const claimantNotifId = `notif_claim_claimant_${claim.id}_${decision}`;
  const claimantTitle = decision === 'verified'
    ? `🎉 Claim Approved for "${claim.itemTitle}"!`
    : `Claim Not Approved: "${claim.itemTitle}"`;
  const claimantDesc = decision === 'verified'
    ? `The finder verified your ownership proof! Collect your belonging at: ${details?.pickupLocation || claim.pickupLocation || 'Main Security Gate 1 Desk'}.`
    : `The finder or security could not verify your claim. ${details?.reason ? `Reason: "${details.reason}"` : 'Details did not match identifying marks.'}`;

  const claimantNotif: AppNotificationItem = {
    id: claimantNotifId,
    category: 'claim',
    title: claimantTitle,
    description: claimantDesc,
    timestamp: now,
    read: false,
    statusText: decision === 'verified' ? 'Verified & Ready' : 'Not Approved',
    statusType: decision === 'verified' ? 'success' : 'warning',
    itemId: claim.itemId,
    itemTitle: claim.itemTitle,
    itemImage: targetItem?.imageUrl,
    claimId: claim.id,
    actionLabel: decision === 'verified' ? 'View Handover Pass' : 'View Details',
    actionType: 'view_claim',
    recipientId: claim.claimantId,
    recipientEmail: claimantEmail,
    claimDetails,
  };

  // Remove pending versions and prepend updated ones
  const filtered = list.filter((n) => 
    !n.id.startsWith(`notif_claim_finder_${claim.id}`) && 
    !n.id.startsWith(`notif_claim_claimant_${claim.id}`)
  );
  filtered.unshift(claimantNotif);
  filtered.unshift(finderNotif);
  saveRawNotifications(filtered);
}

/**
 * Calculate total unread count for badges
 */
export function getUnreadNotificationCount(
  currentUserId?: string | null,
  currentUserEmail?: string | null
): number {
  const list = getStoredNotifications(currentUserId, currentUserEmail);
  return list.filter((n) => !n.read).length;
}

// Automatically sync with storage changes
if (typeof window !== 'undefined') {
  subscribeToStorage(() => {
    notifyListeners();
  });
}
