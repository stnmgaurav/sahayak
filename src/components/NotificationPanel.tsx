import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellRing, 
  BellOff, 
  CheckCheck, 
  Trash2, 
  Settings, 
  X, 
  Check, 
  Sparkles, 
  MessageSquare, 
  ShieldCheck, 
  Shield, 
  Info, 
  ExternalLink, 
  Clock, 
  ArrowRight,
  Filter,
  Package
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  AppNotificationItem, 
  getStoredNotifications, 
  markNotificationAsRead, 
  toggleNotificationRead, 
  markAllNotificationsAsRead, 
  deleteNotification, 
  clearAllNotifications, 
  subscribeToNotificationStore 
} from '../lib/notificationStore';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenChatForItem?: (itemId: string, messageId?: string) => void;
  onViewItemDetails?: (itemId: string) => void;
  onOpenMatchComparison?: (lostItemId: string) => void;
  onNavigateTab?: (tab: 'browse' | 'student-dashboard' | 'admin-dashboard') => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  onOpenChatForItem,
  onViewItemDetails,
  onOpenMatchComparison,
  onNavigateTab,
}) => {
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<AppNotificationItem[]>(() =>
    getStoredNotifications(currentUser?.id, currentUser?.email)
  );

  // Sync notifications on mount and whenever the store updates
  useEffect(() => {
    const updateList = () => {
      setNotifications(getStoredNotifications(currentUser?.id, currentUser?.email));
    };

    updateList();
    const unsubscribe = subscribeToNotificationStore(updateList);
    return () => unsubscribe();
  }, [currentUser]);

  // Lock body scroll when panel is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayedNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead(currentUser?.id, currentUser?.email);
    setNotifications(getStoredNotifications(currentUser?.id, currentUser?.email));
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    clearAllNotifications(currentUser?.id, currentUser?.email);
    setNotifications(getStoredNotifications(currentUser?.id, currentUser?.email));
  };

  const handleItemAction = (item: AppNotificationItem) => {
    markNotificationAsRead(item.id);

    if (item.actionType === 'open_chat' && item.itemId) {
      if (onOpenChatForItem) {
        onOpenChatForItem(item.itemId, item.messageId);
      } else {
        window.dispatchEvent(
          new CustomEvent('sahayak:open_item_chat', {
            detail: { itemId: item.itemId, messageId: item.messageId },
          })
        );
      }
      onClose();
    } else if (item.actionType === 'compare_match' && item.itemId) {
      if (onOpenMatchComparison) {
        onOpenMatchComparison(item.itemId);
      } else if (onNavigateTab) {
        onNavigateTab('student-dashboard');
      }
      onClose();
    } else if (item.actionType === 'view_item' && item.itemId) {
      if (onViewItemDetails) {
        onViewItemDetails(item.itemId);
      } else {
        window.dispatchEvent(
          new CustomEvent('sahayak:view_item', {
            detail: { itemId: item.itemId },
          })
        );
      }
      onClose();
    } else if (item.actionType === 'view_claim') {
      if (onNavigateTab) {
        onNavigateTab('student-dashboard');
      }
      onClose();
    } else if (item.actionType === 'open_security') {
      if (onNavigateTab) {
        onNavigateTab('admin-dashboard');
      }
      onClose();
    }
  };

  const formatTimestamp = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (60 * 1000));
      const diffHours = Math.floor(diffMs / (3600 * 1000));
      const diffDays = Math.floor(diffMs / (24 * 3600 * 1000));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  const getCategoryBadge = (category: AppNotificationItem['category']) => {
    switch (category) {
      case 'match':
        return {
          icon: <Sparkles className="w-3.5 h-3.5" />,
          label: 'AI Match',
          className: 'bg-amber-50 text-amber-700 border-amber-200/80',
        };
      case 'message':
        return {
          icon: <MessageSquare className="w-3.5 h-3.5" />,
          label: 'Inquiry',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        };
      case 'claim':
        return {
          icon: <ShieldCheck className="w-3.5 h-3.5" />,
          label: 'Claim Update',
          className: 'bg-blue-50 text-blue-700 border-blue-200/80',
        };
      case 'security':
        return {
          icon: <Shield className="w-3.5 h-3.5" />,
          label: 'Security Desk',
          className: 'bg-rose-50 text-rose-700 border-rose-200/80',
        };
      default:
        return {
          icon: <Info className="w-3.5 h-3.5" />,
          label: 'System Notice',
          className: 'bg-slate-50 text-slate-700 border-slate-200',
        };
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9990] flex justify-end bg-slate-950/45 backdrop-blur-[2px] transition-opacity duration-200 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-panel-title"
    >
      {/* Sliding Notification Panel Container */}
      <div 
        className="relative w-full max-w-md sm:max-w-lg h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Panel Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-white sticky top-0 z-20 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-700 flex items-center justify-center shrink-0 border border-red-100 shadow-2xs">
                <BellRing className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="notification-panel-title" className="text-lg font-black tracking-tight text-slate-950">
                    Notifications
                  </h2>
                  {unreadCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-red-600 text-white shadow-2xs">
                      {unreadCount} new
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                      All caught up
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Campus lost &amp; found alerts, finder chats, and match notices
                </p>
              </div>
            </div>

            {/* Header Action Tools */}
            <div className="flex items-center gap-1">
              {/* Dedicated Settings Button - Opens dedicated settings modal */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                title="Notification Settings & Preferences"
                aria-label="Notification Settings"
              >
                <Settings className="w-4 h-4 text-slate-600" />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close notifications panel"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Actions & Segmented Filter Bar */}
          <div className="flex items-center justify-between gap-2 pt-1">
            {/* Filter Tabs: All vs Unread */}
            <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-full border border-slate-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  filter === 'all'
                    ? 'bg-white text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filter === 'unread'
                    ? 'bg-white text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Unread</span>
                {unreadCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                )}
              </button>
            </div>

            {/* Mark All Read & Clear Toolbar */}
            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-red-800 bg-slate-50 hover:bg-slate-100 rounded-full border border-slate-200/80 transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Mark all read</span>
                  <span className="sm:hidden">Read all</span>
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                  title="Clear all notifications"
                  aria-label="Clear all notifications"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Notification Items Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 divide-y divide-slate-100/80">
          {displayedNotifications.length === 0 ? (
            /* Empty State */
            <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200/60 shadow-2xs">
                {filter === 'unread' ? (
                  <Check className="w-7 h-7 text-emerald-600" />
                ) : (
                  <BellOff className="w-7 h-7 text-slate-400" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900">
                  {filter === 'unread' ? 'No Unread Notifications' : 'All Caught Up!'}
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  {filter === 'unread'
                    ? 'You have reviewed all campus notifications. Switch back to "All" to browse your history.'
                    : 'There are no active notifications at this moment. You will be alerted whenever someone messages, claims, or matches your items.'}
                </p>
              </div>

              {filter === 'unread' ? (
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className="mt-2 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-full text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  View All Notifications
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200/90 text-slate-800 rounded-full text-xs font-bold border border-slate-200 transition-all cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-500" />
                  <span>Configure Alert Settings</span>
                </button>
              )}
            </div>
          ) : (
            /* Items List */
            displayedNotifications.map((item) => {
              const categoryBadge = getCategoryBadge(item.category);

              return (
                <div
                  key={item.id}
                  className={`pt-3 first:pt-0 transition-all group ${
                    !item.read ? 'opacity-100' : 'opacity-85 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`rounded-2xl p-4 border transition-all ${
                      !item.read
                        ? 'bg-white border-l-4 border-l-red-600 border-slate-200/80 shadow-xs ring-1 ring-black/5'
                        : 'bg-slate-50/70 border-l-4 border-l-transparent border-slate-100 hover:bg-white hover:border-slate-200'
                    }`}
                  >
                    {/* Header Row: Category Badge + Status + Timestamp */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${categoryBadge.className}`}
                        >
                          {categoryBadge.icon}
                          <span>{categoryBadge.label}</span>
                        </span>

                        {item.statusText && (
                          <span
                            className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-md ${
                              item.statusType === 'urgent'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : item.statusType === 'success'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : item.statusType === 'unread'
                                ? 'bg-red-50 text-red-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.statusText}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-slate-500 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formatTimestamp(item.timestamp)}</span>
                      </div>
                    </div>

                    {/* Notification Title & Body */}
                    <div className="mt-2.5 flex items-start gap-3">
                      {item.itemImage && (
                        <img
                          src={item.itemImage}
                          alt={item.itemTitle || 'Item thumbnail'}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 mt-0.5 shadow-2xs"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <h4
                          className={`text-xs sm:text-sm font-extrabold tracking-tight leading-snug ${
                            !item.read ? 'text-slate-950' : 'text-slate-800'
                          }`}
                        >
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100/90 flex items-center justify-between gap-2">
                      {/* Primary Context Action */}
                      {item.actionLabel ? (
                        <button
                          type="button"
                          onClick={() => handleItemAction(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white rounded-full text-xs font-bold shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          <span>{item.actionLabel}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <div />
                      )}

                      {/* Item Quick Utilities (Mark as Read / Dismiss) */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleNotificationRead(item.id)}
                          className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            item.read
                              ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          }`}
                          title={item.read ? 'Mark as unread' : 'Mark as read'}
                          aria-label={item.read ? 'Mark as unread' : 'Mark as read'}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteNotification(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Dismiss notification"
                          aria-label="Dismiss notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Panel Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700">Live Sync Active</span>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-bold transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
};
