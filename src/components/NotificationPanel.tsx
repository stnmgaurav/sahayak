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
  Package,
  Eye,
  CheckCircle2,
  XCircle,
  Phone,
  Copy,
  Lock,
  User,
  Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  AppNotificationItem, 
  ClaimNotificationDetails,
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
  onReviewClaim?: (claimId: string, itemId?: string, mode?: 'view' | 'accept' | 'reject' | 'proof') => void;
  onNavigateTab?: (tab: 'browse' | 'student-dashboard' | 'admin-dashboard') => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  onOpenChatForItem,
  onViewItemDetails,
  onOpenMatchComparison,
  onReviewClaim,
  onNavigateTab,
}) => {
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<AppNotificationItem[]>(() =>
    getStoredNotifications(currentUser?.id, currentUser?.email)
  );

  // Proof inspection modal state
  const [inspectingClaim, setInspectingClaim] = useState<ClaimNotificationDetails | null>(null);
  const [inspectingItemTitle, setInspectingItemTitle] = useState<string>('');
  const [inspectingClaimId, setInspectingClaimId] = useState<string>('');
  const [inspectingItemId, setInspectingItemId] = useState<string>('');
  const [copiedPhone, setCopiedPhone] = useState(false);

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

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inspectingClaim) {
          setInspectingClaim(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, inspectingClaim, onClose]);

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

  const handleReviewClaimAction = (item: AppNotificationItem, mode: 'view' | 'accept' | 'reject' | 'proof' = 'view') => {
    markNotificationAsRead(item.id);
    if (item.claimId) {
      if (onReviewClaim) {
        onReviewClaim(item.claimId, item.itemId, mode);
      } else {
        window.dispatchEvent(
          new CustomEvent('sahayak:review_claim', {
            detail: { claimId: item.claimId, itemId: item.itemId, mode },
          })
        );
      }
      onClose();
    }
  };

  const handleOpenProofInspection = (item: AppNotificationItem) => {
    markNotificationAsRead(item.id);
    if (item.claimDetails) {
      setInspectingClaim(item.claimDetails);
      setInspectingItemTitle(item.itemTitle || 'Found Item');
      setInspectingClaimId(item.claimId || '');
      setInspectingItemId(item.itemId || '');
    } else if (item.claimId) {
      handleReviewClaimAction(item, 'proof');
    }
  };

  const handleCopyInspectingPhone = (phone?: string) => {
    if (phone) {
      navigator.clipboard.writeText(phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
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
    } else if (item.actionType === 'review_claim' && item.claimId) {
      handleReviewClaimAction(item, 'view');
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
    <>
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
            /* Friendly Clean Empty State */
            <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center p-4 sm:p-6 space-y-4">
              {filter === 'unread' && notifications.length > 0 ? (
                /* Unread Filter Empty State */
                <>
                  <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/80 shadow-xs">
                    <CheckCheck className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <h3 className="text-base font-extrabold text-slate-950">
                      All Caught Up!
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      You've reviewed all your notifications. Switch back to "All" to browse your notification history anytime.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className="mt-2 px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-full text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                  >
                    View All ({notifications.length}) Notifications
                  </button>
                </>
              ) : (
                /* Zero State - Clean & Friendly */
                <>
                  <div className="relative">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-slate-100 via-red-50/60 to-amber-50/50 flex items-center justify-center border border-slate-200/90 shadow-xs">
                      <Bell className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shadow-xs">
                      <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    </div>
                  </div>

                  <div className="space-y-1.5 max-w-xs">
                    <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-950">
                      No Notifications Yet
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Only genuine interactions generate alerts. Your feed will automatically update when someone interacts with your campus listings.
                    </p>
                  </div>

                  {/* Informative Trigger Feature Strip */}
                  <div className="w-full max-w-sm grid grid-cols-1 gap-2 pt-2 text-left">
                    <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center gap-2.5 text-xs">
                      <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-[11px]">Finder &amp; Owner Chat</p>
                        <p className="text-[10px] text-slate-500 truncate">Direct messages about lost or found items</p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center gap-2.5 text-xs">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-[11px]">Ownership Claims</p>
                        <p className="text-[10px] text-slate-500 truncate">Verification requests &amp; handover approvals</p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-center gap-2.5 text-xs">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-[11px]">AI Smart Matches</p>
                        <p className="text-[10px] text-slate-500 truncate">Automated match suggestions for your listings</p>
                      </div>
                    </div>
                  </div>

                  {/* Clean CTA Actions */}
                  <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onNavigateTab) {
                          onNavigateTab('browse');
                        }
                      }}
                      className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-full text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>Browse Registry</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSettings();
                      }}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200/90 text-slate-800 rounded-full text-xs font-bold border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-600" />
                      <span>Alert Settings</span>
                    </button>
                  </div>
                </>
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

                    {/* Specialized Claim Evidence Preview for Finder Claims */}
                    {item.category === 'claim' && item.claimDetails && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-800 text-[11px]">
                            <User className="w-3 h-3 text-red-700" />
                            <span>{item.claimDetails.claimantName}</span>
                            <span className="text-slate-400">•</span>
                            <span className="font-mono text-slate-600">UID: {item.claimDetails.claimantUid}</span>
                          </span>

                          {item.claimDetails.claimantPhone && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyInspectingPhone(item.claimDetails?.claimantPhone);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 transition-colors cursor-pointer"
                              title="Click to copy contact phone"
                            >
                              <Phone className="w-2.5 h-2.5 text-slate-500" />
                              <span>{item.claimDetails.claimantPhone}</span>
                              <Copy className="w-2.5 h-2.5 text-slate-400" />
                            </button>
                          )}
                        </div>

                        {/* Distinctive Ownership Evidence */}
                        <div className="text-slate-700 font-medium bg-white p-2.5 rounded-lg border border-slate-100 text-[11px] leading-relaxed">
                          <span className="text-slate-500 font-bold block mb-0.5 text-[10px] uppercase tracking-wider">Submitted Proof:</span>
                          "{item.claimDetails.proofDescription}"
                        </div>

                        {/* Attached Proof Photo Thumbnail */}
                        {item.claimDetails.proofImageUrl && (
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <div className="flex items-center gap-2">
                              <img
                                src={item.claimDetails.proofImageUrl}
                                alt="Claim proof document"
                                className="w-9 h-9 rounded-lg object-cover border border-slate-200"
                              />
                              <span className="text-[11px] font-bold text-slate-700">Photo Proof Attached</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenProofInspection(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3 text-indigo-600" />
                              <span>Inspect Photo</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions Row */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      {/* Option A: Pending Finder Claim with Complete Actions Set */}
                      {item.category === 'claim' && (item.actionType === 'review_claim' || item.claimDetails?.status === 'pending') && item.statusType === 'urgent' ? (
                        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                          {/* 1. Review Claim */}
                          <button
                            type="button"
                            onClick={() => handleReviewClaimAction(item, 'view')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-full text-xs font-extrabold shadow-xs hover:shadow-sm active:scale-95 transition-all cursor-pointer"
                            title="Open full claim verification review dialog"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-rose-200" />
                            <span>Review Claim</span>
                          </button>

                          {/* 2. View Proof */}
                          <button
                            type="button"
                            onClick={() => handleOpenProofInspection(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/90 rounded-full text-xs font-bold active:scale-95 transition-all cursor-pointer"
                            title="Inspect claimant's ownership proof document"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-600" />
                            <span>View Proof</span>
                          </button>

                          {/* 3. Accept Handover */}
                          <button
                            type="button"
                            onClick={() => handleReviewClaimAction(item, 'accept')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-full text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                            title="Accept claim and designate handover point"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-100" />
                            <span>Accept</span>
                          </button>

                          {/* 4. Reject Handover */}
                          <button
                            type="button"
                            onClick={() => handleReviewClaimAction(item, 'reject')}
                            className="inline-flex items-center gap-1 px-2 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-full text-xs font-bold active:scale-95 transition-all cursor-pointer"
                            title="Reject claim with reason"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        /* Default Action Button for Messages, AI Matches, etc. */
                        item.actionLabel ? (
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
                        )
                      )}

                      {/* Item Quick Utilities (Mark as Read / Dismiss) */}
                      <div className="flex items-center gap-1 shrink-0 ml-auto">
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

    {/* Proof Inspection Lightbox Modal */}
      {inspectingClaim && (
        <div 
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setInspectingClaim(null)}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-800 via-red-900 to-slate-900 text-white p-5 pr-14 relative shrink-0">
              <button
                type="button"
                onClick={() => setInspectingClaim(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-200 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Submitted Ownership Evidence</span>
              </div>
              <h3 className="text-lg font-black text-white truncate">
                Claim for "{inspectingItemTitle}"
              </h3>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {/* Claimant Profile Strip */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{inspectingClaim.claimantName}</h4>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">UID / Roll: {inspectingClaim.claimantUid}</p>
                </div>
                {inspectingClaim.claimantPhone && (
                  <button
                    type="button"
                    onClick={() => handleCopyInspectingPhone(inspectingClaim.claimantPhone)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 bg-white border border-slate-200 shadow-2xs cursor-pointer"
                  >
                    <Phone className="w-3 h-3 text-slate-500" />
                    <span>{inspectingClaim.claimantPhone}</span>
                    {copiedPhone ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                )}
              </div>

              {/* Photo Proof */}
              {inspectingClaim.proofImageUrl ? (
                <div className="space-y-1.5">
                  <label className="font-extrabold text-slate-700 text-[11px] uppercase tracking-wider block">
                    Proof Photo / Bill / Identification Document:
                  </label>
                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-[300px]">
                    <img
                      src={inspectingClaim.proofImageUrl}
                      alt="Verification document"
                      className="max-h-[300px] w-auto object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl text-slate-500 text-center italic border border-slate-100">
                  No photographic document attached. Verification relies on distinctive marks description.
                </div>
              )}

              {/* Description */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700 text-[11px] uppercase tracking-wider block">
                  Distinctive Ownership Marks &amp; Content Description:
                </label>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 font-medium text-slate-800 leading-relaxed">
                  "{inspectingClaim.proofDescription}"
                </div>
              </div>

              {/* Serial / ID */}
              {inspectingClaim.serialNumberOrIdentifier && (
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700 text-[11px] uppercase tracking-wider block">
                    Serial Number / Device Identifier:
                  </label>
                  <div className="px-3 py-1.5 bg-slate-100 rounded-xl font-mono font-bold text-slate-900 border border-slate-200 inline-block">
                    {inspectingClaim.serialNumberOrIdentifier}
                  </div>
                </div>
              )}

              {/* Secret Answer */}
              {inspectingClaim.secretAnswer && (
                <div className="space-y-1 p-3 bg-amber-50/80 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Secret Challenge Answer:</span>
                  </div>
                  <div className="font-mono text-xs font-bold text-slate-900 bg-white p-2 rounded-lg border border-amber-300">
                    {inspectingClaim.secretAnswer}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Handover Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setInspectingClaim(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white rounded-full border border-slate-200 cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInspectingClaim(null);
                    onReviewClaim?.(inspectingClaimId, inspectingItemId, 'reject');
                    onClose();
                  }}
                  className="px-4 py-2 text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 border border-rose-300 rounded-full cursor-pointer transition-colors"
                >
                  Reject Claim
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInspectingClaim(null);
                    onReviewClaim?.(inspectingClaimId, inspectingItemId, 'accept');
                    onClose();
                  }}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 rounded-full shadow-md shadow-emerald-600/20 cursor-pointer transition-all active:scale-95"
                >
                  Accept Handover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
