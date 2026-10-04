// Browser-Based Push Notification Engine for SAHAYAK Campus Lost & Found
import { ItemMessage, ItemReport } from '../types';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

let swRegistration: ServiceWorkerRegistration | null = null;
let broadcastChannel: BroadcastChannel | null = null;

// Initialize BroadcastChannel for cross-tab notification synchronization
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('sahayak_notifications_channel');
  } catch (e) {
    console.warn('BroadcastChannel not supported or restricted:', e);
  }
}

/**
 * Check if the current browser environment supports the Web Notification API
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationPermissionState;
}

/**
 * Register the push service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = reg;

    // Listen for messages from service worker (e.g., when user clicks a notification)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SAHAYAK_NOTIFICATION_CLICK') {
        const itemId = event.data.itemId;
        if (itemId) {
          window.dispatchEvent(
            new CustomEvent('sahayak:open_item_chat', {
              detail: { itemId, messageId: event.data.messageId },
            })
          );
        }
      }
    });

    return reg;
  } catch (error) {
    console.warn('Service Worker registration skipped or failed:', error);
    return null;
  }
}

/**
 * Prompt user for browser push notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return 'unsupported';

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerServiceWorker();
    }
    return permission as NotificationPermissionState;
  } catch (err) {
    console.warn('Notification permission request error:', err);
    return Notification.permission as NotificationPermissionState;
  }
}

/**
 * Play a pleasant university chime using Web Audio API (no external file needed)
 */
export function playNotificationChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Two-tone bell melody: 587Hz (D5) transitioning to 880Hz (A5)
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.12);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.46);
  } catch (e) {
    // Audio contexts may be blocked by autoplay policies until user gesture
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  itemId?: string;
  messageId?: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}

/**
 * Deliver a browser-based push notification even when the user is not focused on the app
 */
export async function deliverBrowserNotification(payload: PushNotificationPayload): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // 1. Play audio chime
  playNotificationChime();

  // 2. Broadcast in-app notification event so active screens display a floating alert banner
  window.dispatchEvent(
    new CustomEvent('sahayak:inapp_notification', {
      detail: payload,
    })
  );

  // 3. Check browser notification permission
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const title = payload.title;
  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon || '/logosahayak.png',
    badge: '/logosahayak.png',
    tag: payload.tag || `sahayak-msg-${Date.now()}`,
    data: {
      itemId: payload.itemId,
      messageId: payload.messageId,
    },
  };

  // Attempt using active ServiceWorker registration first (for background push reliability)
  try {
    if (!swRegistration && 'serviceWorker' in navigator) {
      swRegistration = await navigator.serviceWorker.ready.catch(() => null);
    }

    if (swRegistration && 'showNotification' in swRegistration) {
      await swRegistration.showNotification(title, options);
      return true;
    }
  } catch (swErr) {
    console.warn('ServiceWorker showNotification failed, using fallback:', swErr);
  }

  // Fallback to standard Window Notification
  try {
    const notif = new Notification(title, options);
    notif.onclick = () => {
      window.focus();
      notif.close();
      if (payload.onClick) {
        payload.onClick();
      } else if (payload.itemId) {
        window.dispatchEvent(
          new CustomEvent('sahayak:open_item_chat', {
            detail: { itemId: payload.itemId, messageId: payload.messageId },
          })
        );
      }
    };
    return true;
  } catch (err) {
    console.warn('Window Notification instantiation failed:', err);
    return false;
  }
}

/**
 * Trigger an instant test push notification so the user can verify their browser configuration
 */
export async function sendTestPushNotification(): Promise<boolean> {
  const perm = getNotificationPermission();
  if (perm !== 'granted') {
    const newPerm = await requestNotificationPermission();
    if (newPerm !== 'granted') return false;
  }

  return deliverBrowserNotification({
    title: '🔔 SAHAYAK Push Notifications Active',
    body: 'You will now receive instant desktop & mobile alerts when someone chats or messages about your reported campus items!',
    icon: '/logo.svg',
    tag: 'sahayak-test-alert',
  });
}

/**
 * Handle new incoming message and decide whether to alert the current user
 */
export function handleIncomingMessageNotification(
  message: ItemMessage,
  reportedItem?: ItemReport | null,
  currentUserId?: string | null,
  currentUserEmail?: string | null
): void {
  if (!currentUserId && !currentUserEmail) return;

  // Ignore messages sent by current user themselves
  const isSender =
    (currentUserId && message.senderId === currentUserId) ||
    (currentUserEmail && message.senderEmail?.toLowerCase() === currentUserEmail.toLowerCase());
  if (isSender) return;

  // Verify if current user is the intended recipient:
  // 1. Directly addressed recipient
  const isDirectRecipient =
    (currentUserId && message.recipientId === currentUserId) ||
    (currentUserEmail && message.recipientEmail?.toLowerCase() === currentUserEmail.toLowerCase());

  // 2. Owner of the reported item for which the message is about
  const isItemOwner =
    reportedItem &&
    ((currentUserId && reportedItem.userId === currentUserId) ||
      (currentUserEmail && reportedItem.userEmail?.toLowerCase() === currentUserEmail.toLowerCase()));

  if (!isDirectRecipient && !isItemOwner) {
    return;
  }

  // Compose rich notification
  const itemTitle = reportedItem?.title || message.itemTitle || 'Your Reported Item';
  const senderName = message.senderName || 'A Student / Finder';
  const cleanSnippet = message.messageText.length > 90
    ? message.messageText.slice(0, 90) + '...'
    : message.messageText;

  const bodyText = message.currentFoundLocation
    ? `📍 [Held at: ${message.currentFoundLocation}] ${senderName}: "${cleanSnippet}"`
    : `${senderName}: "${cleanSnippet}"`;

  deliverBrowserNotification({
    title: `💬 New Message for "${itemTitle}"`,
    body: bodyText,
    itemId: message.itemId,
    messageId: message.id,
    icon: reportedItem?.imageUrl || '/logo.svg',
    tag: `sahayak-item-${message.itemId}`,
    onClick: () => {
      window.focus();
      window.dispatchEvent(
        new CustomEvent('sahayak:open_item_chat', {
          detail: { itemId: message.itemId, messageId: message.id },
        })
      );
    },
  });
}

/**
 * Broadcast outgoing message to other tabs so the recipient tab gets notified instantly
 */
export function broadcastOutgoingMessage(message: ItemMessage): void {
  // 1. BroadcastChannel (fastest across browser contexts)
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({
        type: 'NEW_MESSAGE_EVENT',
        message,
      });
    } catch (e) {}
  }

  // 2. Storage event fallback (reliable cross-tab trigger across all browsers)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('sahayak_last_broadcast_msg', JSON.stringify({
        message,
        timestamp: Date.now(),
      }));
    } catch (e) {}

    // 3. Local custom event for same-window testing
    window.dispatchEvent(
      new CustomEvent('sahayak:internal_new_message', {
        detail: message,
      })
    );
  }
}

/**
 * Listen for cross-tab and background messages
 */
export function subscribeToCrossTabNotifications(
  callback: (message: ItemMessage) => void
): () => void {
  const bcHandler = (event: MessageEvent) => {
    if (event.data && event.data.type === 'NEW_MESSAGE_EVENT' && event.data.message) {
      callback(event.data.message);
    }
  };

  const storageHandler = (e: StorageEvent) => {
    if (e.key === 'sahayak_last_broadcast_msg' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && parsed.message) {
          callback(parsed.message);
        }
      } catch (err) {}
    }
  };

  const internalHandler = (e: Event) => {
    const custom = e as CustomEvent<ItemMessage>;
    if (custom.detail) {
      callback(custom.detail);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', bcHandler);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', storageHandler);
    window.addEventListener('sahayak:internal_new_message', internalHandler);
  }

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', bcHandler);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', storageHandler);
      window.removeEventListener('sahayak:internal_new_message', internalHandler);
    }
  };
}
