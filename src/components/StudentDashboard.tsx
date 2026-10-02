import React, { useState } from 'react';
import { useAuth, isUserAdmin } from '../context/AuthContext';
import { ItemReport, ItemClaim, MatchSuggestion, ItemMessage } from '../types';
import { findMatchesForItem } from '../lib/matching';
import { updateItemStatus, deleteItem, getStoredMessages, updateMessage } from '../lib/storage';
import { 
  PlusCircle, 
  HandHeart, 
  Sparkles, 
  ShieldCheck, 
  Shield,
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  MapPin, 
  Calendar,
  Building2,
  PackageCheck,
  Printer,
  ChevronRight,
  HelpCircle,
  TrendingUp,
  Compass,
  ArrowUpRight,
  ArrowLeft,
  Edit3,
  Trash2,
  Lock,
  Camera,
  MessageSquare,
  Phone,
  Send,
  Bell,
  BellRing,
  Settings
} from 'lucide-react';
import { 
  getNotificationPermission, 
  NotificationPermissionState 
} from '../lib/notifications';
import { getUnreadNotificationCount, subscribeToNotificationStore } from '../lib/notificationStore';

interface StudentDashboardProps {
  items: ItemReport[];
  claims: ItemClaim[];
  onBackToBrowse: () => void;
  onOpenReportModal: (type: 'lost' | 'found') => void;
  onViewItemDetails: (item: ItemReport) => void;
  onOpenMatchComparison: (lostItem: ItemReport, foundItem: ItemReport) => void;
  onViewReceipt: (claim: ItemClaim, item: ItemReport) => void;
  onEditItem?: (item: ItemReport) => void;
  onDeleteItem?: (itemId: string) => void;
  onClaimItem?: (item: ItemReport) => void;
  onSendMessage?: (item: ItemReport) => void;
  onOpenSecurityDesk?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  items,
  claims,
  onBackToBrowse,
  onOpenReportModal,
  onViewItemDetails,
  onOpenMatchComparison,
  onViewReceipt,
  onEditItem,
  onDeleteItem,
  onClaimItem,
  onSendMessage,
  onOpenSecurityDesk,
}) => {
  const { currentUser, isAdmin, openAuthModal, setNeedsProfileCompletion } = useAuth();
  const [activeTab, setActiveTab] = useState<'lost' | 'found' | 'matches' | 'claims' | 'messages'>('lost');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'recovered'>('all');
  const [notifPermission, setNotifPermission] = useState<NotificationPermissionState>(() => getNotificationPermission());
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(() =>
    getUnreadNotificationCount(currentUser?.id, currentUser?.email)
  );

  // Sync unread notification count
  React.useEffect(() => {
    const updateCount = () => {
      setUnreadNotifCount(getUnreadNotificationCount(currentUser?.id, currentUser?.email));
      setNotifPermission(getNotificationPermission());
    };
    updateCount();
    const unsubscribe = subscribeToNotificationStore(updateCount);
    return () => unsubscribe();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <button
          onClick={onBackToBrowse}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 bg-white/80 hover:bg-white border border-slate-200 shadow-2xs transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Back to Campus Registry</span>
        </button>
        <div className="glass-panel rounded-3xl p-10 space-y-4 shadow-xl border border-white/80">
          <div className="w-16 h-16 bg-red-800/10 text-red-700 rounded-2xl flex items-center justify-center mx-auto border border-red-200">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-950">Student Portal Sign-In Required</h2>
          <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
            Sign in with your Chandigarh University student credentials or Google Workspace account to track your lost reports, monitor AI matches, and file claims.
          </p>
          <button
            onClick={() => openAuthModal('login')}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white rounded-2xl font-bold text-sm shadow-md shadow-red-900/20 transition-all hover:scale-102"
          >
            Sign In to Student Portal
          </button>
        </div>
      </div>
    );
  }

  // Filter all items uploaded by current user
  const userLostAll = items.filter(i => (i.userId === currentUser.id || (currentUser.email && i.userEmail === currentUser.email)) && i.type === 'lost');
  const userFoundAll = items.filter(i => (i.userId === currentUser.id || (currentUser.email && i.userEmail === currentUser.email)) && i.type === 'found');

  // Filter based on active vs recovered sub-filter
  const myLostItems = userLostAll.filter(item => {
    if (statusFilter === 'active') return item.status !== 'recovered' && item.status !== 'returned';
    if (statusFilter === 'recovered') return item.status === 'recovered' || item.status === 'returned';
    return true;
  });

  const myFoundItems = userFoundAll.filter(item => {
    if (statusFilter === 'active') return item.status !== 'recovered' && item.status !== 'returned';
    if (statusFilter === 'recovered') return item.status === 'recovered' || item.status === 'returned';
    return true;
  });

  const myClaims = claims.filter(c => c.claimantId === currentUser.id || c.claimantEmail === currentUser.email);

  // Compute all messages received by this user for their reported lost items
  const allMessages = getStoredMessages();
  const myReceivedMessages = allMessages.filter(m => 
    m.recipientId === currentUser.id || 
    (currentUser.email && m.recipientEmail && currentUser.email.toLowerCase() === m.recipientEmail.toLowerCase()) ||
    userLostAll.some(lost => lost.id === m.itemId)
  );
  const mySentMessages = allMessages.filter(m => 
    m.senderId === currentUser.id || 
    (currentUser.email && m.senderEmail && currentUser.email.toLowerCase() === m.senderEmail.toLowerCase())
  );
  const unreadMessagesCount = myReceivedMessages.filter(m => m.status === 'unread').length;

  const [messageSubTab, setMessageSubTab] = useState<'received' | 'sent'>('received');

  // Compute all matches for this student's lost items
  const myMatches: { target: ItemReport; match: MatchSuggestion }[] = [];
  userLostAll.forEach(lostItem => {
    const matches = findMatchesForItem(lostItem, items, 45);
    matches.forEach(m => {
      myMatches.push({ target: lostItem, match: m });
    });
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Back Navigation Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToBrowse}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200/90 shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Back to Campus Registry</span>
        </button>
      </div>

      {/* Student Welcome & Profile Banner */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-7 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-50/60 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center gap-3.5 sm:gap-5 relative z-10 min-w-0">
          <button
            type="button"
            onClick={() => setNeedsProfileCompletion(true)}
            className="relative group shrink-0 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-2xl cursor-pointer"
            title="Click to view student profile details"
          >
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-red-700/60 shadow-xs bg-white group-hover:scale-102 transition-transform shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-red-700 via-red-800 to-red-950 text-white flex items-center justify-center font-extrabold text-lg sm:text-2xl shadow-xs group-hover:scale-102 transition-transform shrink-0">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-white border border-slate-200 text-slate-700 p-1 rounded-full shadow-xs group-hover:text-red-700 group-hover:border-red-600 transition-colors">
              <Camera className="w-2.5 h-2.5" />
            </div>
          </button>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate max-w-full">{currentUser.name}</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase bg-red-50 text-red-800 border border-red-200/80 shrink-0" title="UID is locked to student profile">
                <Lock className="w-2.5 h-2.5 text-red-700" />
                UID: {currentUser.uidOrRoll}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shrink-0">
                Verified Student
              </span>
              <button
                type="button"
                onClick={() => setNeedsProfileCompletion(true)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold text-slate-600 hover:text-red-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-2xs transition-colors cursor-pointer shrink-0"
                title="View student profile details (UID & Mobile locked)"
              >
                <Edit3 className="w-3 h-3 text-slate-500" />
                <span>Profile Details</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 font-medium truncate">
              {currentUser.department} • {currentUser.email} • {currentUser.phone}
            </p>
          </div>
        </div>

        {/* Quick Report Action Pills - Vibrant Modern Style */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 relative z-10 w-full md:w-auto">
          {currentUser && isUserAdmin(currentUser.email) && onOpenSecurityDesk && (
            <button
              type="button"
              onClick={onOpenSecurityDesk}
              className="flex-1 sm:flex-initial min-w-[130px] flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 hover:from-black hover:to-slate-900 text-white rounded-full text-xs font-extrabold transition-all shadow-xs hover:shadow-md cursor-pointer active:scale-95"
              title="Open Campus Security Desk Admin Console"
            >
              <Shield className="w-4 h-4 text-rose-300 shrink-0" />
              <span>Security Desk</span>
            </button>
          )}
          <button
            onClick={() => onOpenReportModal('lost')}
            className="flex-1 sm:flex-initial min-w-[130px] flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white rounded-full text-xs font-extrabold transition-all shadow-md shadow-rose-600/25 hover:shadow-lg hover:shadow-rose-600/35 cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4 text-rose-100 shrink-0" />
            <span>I Lost Something</span>
          </button>
          <button
            onClick={() => onOpenReportModal('found')}
            className="flex-1 sm:flex-initial min-w-[130px] flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-700 hover:from-emerald-400 hover:via-teal-500 hover:to-emerald-600 text-white rounded-full text-xs font-extrabold transition-all shadow-md shadow-emerald-600/25 hover:shadow-lg hover:shadow-emerald-600/35 cursor-pointer active:scale-95"
          >
            <HandHeart className="w-4 h-4 text-emerald-100 shrink-0" />
            <span>I Found Something</span>
          </button>
        </div>
      </div>

      {/* Campus Notifications Bar - Clean, Focused, Distraction-Free */}
      <div className="bg-gradient-to-r from-white via-slate-50/50 to-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs bg-gradient-to-br from-red-600 via-rose-600 to-red-800 text-white shadow-rose-600/20">
            <BellRing className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Campus Activity &amp; Notifications
              </h3>
              {unreadNotifCount > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-red-100 text-red-800 border border-red-200 animate-pulse">
                  {unreadNotifCount} New Alert{unreadNotifCount > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-200">
                  All Caught Up
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
              Real-time feed for AI matches, finder chat messages, and official campus custody handovers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('sahayak:open_notifications'))}
            className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white rounded-full text-xs font-extrabold transition-all shadow-md shadow-rose-600/25 active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>View Notifications</span>
            {unreadNotifCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white text-red-700 text-[10px] font-black">
                {unreadNotifCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('sahayak:open_notification_settings'))}
            className="p-2 sm:p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full border border-slate-200/90 shadow-2xs transition-colors cursor-pointer"
            title="Notification Preferences & Push Settings"
            aria-label="Notification Preferences"
          >
            <Settings className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Grid Metrics Summary - Vibrant Colorful Modern App Action Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 w-full">
        {/* Metric 1 - My Lost Items */}
        <div 
          onClick={() => setActiveTab('lost')}
          className={`rounded-2xl border p-3.5 sm:p-5 cursor-pointer transition-all duration-300 group min-w-0 ${
            activeTab === 'lost' 
              ? 'bg-gradient-to-br from-rose-50 via-white to-white border-rose-300 ring-2 ring-rose-500/20 shadow-md shadow-rose-500/10' 
              : 'bg-white hover:bg-rose-50/20 border-slate-100 hover:border-rose-200 shadow-xs hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-500 group-hover:text-rose-600 transition-colors gap-1">
            <span className="truncate">My Lost Items</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-rose-50 group-hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2.5 sm:mt-3 gap-1">
            <span className="text-2xl sm:text-3xl font-black text-rose-600">{myLostItems.length}</span>
            <span className="text-[10px] sm:text-xs font-bold text-rose-800 bg-rose-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-rose-200/60 shrink-0">Reports</span>
          </div>
        </div>

        {/* Metric 2 - Items I Found */}
        <div 
          onClick={() => setActiveTab('found')}
          className={`rounded-2xl border p-3.5 sm:p-5 cursor-pointer transition-all duration-300 group min-w-0 ${
            activeTab === 'found' 
              ? 'bg-gradient-to-br from-emerald-50 via-white to-white border-emerald-300 ring-2 ring-emerald-500/20 shadow-md shadow-emerald-500/10' 
              : 'bg-white hover:bg-emerald-50/20 border-slate-100 hover:border-emerald-200 shadow-xs hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-500 group-hover:text-emerald-600 transition-colors gap-1">
            <span className="truncate">Items I Found</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors shrink-0">
              <HandHeart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2.5 sm:mt-3 gap-1">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">{myFoundItems.length}</span>
            <span className="text-[10px] sm:text-xs font-bold text-emerald-800 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">Turned In</span>
          </div>
        </div>

        {/* Metric 3 - Campus Matches */}
        <div 
          onClick={() => setActiveTab('matches')}
          className={`rounded-2xl border p-3.5 sm:p-5 cursor-pointer transition-all duration-300 group min-w-0 ${
            activeTab === 'matches' 
              ? 'bg-gradient-to-br from-amber-50 via-white to-white border-amber-300 ring-2 ring-amber-500/20 shadow-md shadow-amber-500/10' 
              : 'bg-white hover:bg-amber-50/20 border-slate-100 hover:border-amber-200 shadow-xs hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-500 group-hover:text-amber-600 transition-colors gap-1">
            <span className="truncate">Campus Matches</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-50 group-hover:bg-amber-100 text-amber-600 flex items-center justify-center transition-colors shrink-0">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2.5 sm:mt-3 gap-1">
            <span className="text-2xl sm:text-3xl font-black text-amber-600">{myMatches.length}</span>
            {myMatches.length > 0 ? (
              <span className="text-[10px] sm:text-xs font-black text-amber-900 bg-amber-100/90 px-1.5 sm:px-2 py-0.5 rounded-full border border-amber-300 animate-pulse shrink-0">
                Action Req
              </span>
            ) : (
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 bg-slate-100 px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">Scanning</span>
            )}
          </div>
        </div>

        {/* Metric 4 - My Claims */}
        <div 
          onClick={() => setActiveTab('claims')}
          className={`rounded-2xl border p-3.5 sm:p-5 cursor-pointer transition-all duration-300 group min-w-0 ${
            activeTab === 'claims' 
              ? 'bg-gradient-to-br from-sky-50 via-white to-white border-sky-300 ring-2 ring-sky-500/20 shadow-md shadow-sky-500/10' 
              : 'bg-white hover:bg-sky-50/20 border-slate-100 hover:border-sky-200 shadow-xs hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-500 group-hover:text-sky-600 transition-colors gap-1">
            <span className="truncate">My Claims</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-sky-50 group-hover:bg-sky-100 text-sky-600 flex items-center justify-center transition-colors shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-2.5 sm:mt-3 gap-1">
            <span className="text-2xl sm:text-3xl font-black text-sky-600">{myClaims.length}</span>
            <span className="text-[10px] sm:text-xs font-bold text-sky-800 bg-sky-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-sky-200/60 shrink-0">Tracking</span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher - Vibrant Pill Action Buttons */}
      <div className="bg-white rounded-2xl border border-slate-100 p-2 shadow-xs flex items-center gap-2 overflow-x-auto scrollbar-none no-scrollbar w-full">
        <button
          onClick={() => setActiveTab('lost')}
          className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer active:scale-95 shrink-0 ${
            activeTab === 'lost' 
              ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-sm shadow-rose-600/30' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          My Lost Reports ({myLostItems.length})
        </button>
        <button
          onClick={() => setActiveTab('found')}
          className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer active:scale-95 shrink-0 ${
            activeTab === 'found' 
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-sm shadow-emerald-600/30' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          My Found Reports ({myFoundItems.length})
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0 ${
            activeTab === 'matches' 
              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-sm shadow-amber-500/30' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Suggested Matches ({myMatches.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer active:scale-95 shrink-0 ${
            activeTab === 'claims' 
              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/30' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          My Claims &amp; Verification ({myClaims.length})
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0 ${
            activeTab === 'messages' 
              ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-sm shadow-violet-600/30' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-violet-300" />
          <span>Finder Inquiries ({myReceivedMessages.length})</span>
          {unreadMessagesCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          )}
        </button>
      </div>

      {/* TAB 1: MY LOST ITEMS */}
      {activeTab === 'lost' && (
        <div className="space-y-4">
          {/* Sub-filter for Active vs Recovered items */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 glass-panel-subtle rounded-2xl border border-slate-200/80 shadow-2xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-950 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                All ({userLostAll.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'active'
                    ? 'bg-red-800 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Active ({userLostAll.filter(i => i.status !== 'recovered' && i.status !== 'returned').length})
              </button>
              <button
                onClick={() => setStatusFilter('recovered')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'recovered'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Recovered ({userLostAll.filter(i => i.status === 'recovered' || i.status === 'returned').length})
              </button>
            </div>

            <button
              onClick={() => onOpenReportModal('lost')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white rounded-full text-xs font-extrabold shadow-sm shadow-rose-600/25 transition-all cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Lost Item</span>
            </button>
          </div>

          {myLostItems.length === 0 ? (
            <div className="rounded-3xl p-12 text-center border border-slate-100 bg-white shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 border border-rose-100">
                <PlusCircle className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                {statusFilter === 'recovered' ? 'No Recovered Items Yet' : 'No Lost Items Reported'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 max-w-sm mx-auto leading-relaxed">
                {statusFilter === 'recovered'
                  ? 'When your reported lost belongings are found and recovered, they will be archived here in your personal history.'
                  : 'If you misplace an item anywhere on the Chandigarh University campus, report it here for security and peers to help find it.'}
              </p>
              {statusFilter !== 'recovered' && (
                <button
                  onClick={() => onOpenReportModal('lost')}
                  className="mt-4 px-5 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white rounded-full text-xs font-extrabold shadow-md shadow-rose-600/25 transition-all cursor-pointer active:scale-95"
                >
                  Report a Lost Belonging
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {myLostItems.map(item => {
                const matches = findMatchesForItem(item, items, 45);
                const isRecovered = item.status === 'recovered' || item.status === 'returned';
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md border border-slate-100 hover:border-slate-200/80 bg-white space-y-4 transition-all duration-200 overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-slate-200/80 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-slate-950 text-sm sm:text-base truncate max-w-full">
                              {item.title}
                            </h4>
                            {item.status === 'recovered' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                                Recovered
                              </span>
                            ) : item.status === 'returned' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-900 text-white shrink-0">
                                Returned
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                                {item.status.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5 flex-wrap">
                            <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span className="truncate">{item.locationBlock}</span>
                            <span>•</span>
                            <span className="shrink-0">{new Date(item.dateTime).toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => onViewItemDetails(item)}
                          className="px-3.5 sm:px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 text-slate-700 rounded-full text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                        >
                          Details
                        </button>

                        {!isRecovered && (
                          <button
                            onClick={() => updateItemStatus(item.id, 'recovered', currentUser?.id, isAdmin, currentUser?.email)}
                            className="px-3.5 sm:px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:via-teal-500 hover:to-emerald-600 text-white rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-xs hover:shadow-md shadow-emerald-600/25 cursor-pointer active:scale-95"
                            title="Confirm recovery to remove this item from the campus dashboard"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            <span>Mark Recovered</span>
                          </button>
                        )}

                        {allMessages.filter(m => m.itemId === item.id).length > 0 && (
                          <button
                            onClick={() => setActiveTab('messages')}
                            className="px-3.5 sm:px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-white" />
                            <span>{allMessages.filter(m => m.itemId === item.id).length} Message(s)</span>
                          </button>
                        )}

                        {onEditItem && (
                          <button
                            onClick={() => onEditItem(item)}
                            className="px-3 sm:px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-full text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                            title="Edit this item report"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to permanently delete "${item.title}"?`)) {
                              if (onDeleteItem) {
                                onDeleteItem(item.id);
                              } else {
                                deleteItem(item.id, currentUser?.id, isAdmin, currentUser?.email);
                              }
                            }
                          }}
                          className="px-3 sm:px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                          title="Delete this report"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Matched Banner if candidates exist */}
                    {!isRecovered && matches.length > 0 && (
                      <div className="p-3.5 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
                          </div>
                          <span className="truncate text-xs">
                            <strong className="font-extrabold">{matches.length} AI Match Found:</strong> "{matches[0].candidateItem.title}" at {matches[0].candidateItem.locationBlock} ({matches[0].matchScore}% match)
                          </span>
                        </div>
                        <button
                          onClick={() => onOpenMatchComparison(item, matches[0].candidateItem)}
                          className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:via-orange-400 hover:to-amber-500 text-white rounded-full text-xs font-extrabold shrink-0 transition-all shadow-xs hover:shadow-md cursor-pointer active:scale-95 text-center"
                        >
                          Compare &amp; Claim
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY FOUND ITEMS */}
      {activeTab === 'found' && (
        <div className="space-y-4">
          {/* Sub-filter for Active vs Handed Over / Recovered items */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 glass-panel-subtle rounded-2xl border border-slate-200/80 shadow-2xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-950 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                All ({userFoundAll.length})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'active'
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Active ({userFoundAll.filter(i => i.status !== 'recovered' && i.status !== 'returned').length})
              </button>
              <button
                onClick={() => setStatusFilter('recovered')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'recovered'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Recovered / Handed Over ({userFoundAll.filter(i => i.status === 'recovered' || i.status === 'returned').length})
              </button>
            </div>

            <button
              onClick={() => onOpenReportModal('found')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-2xs transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Found Item</span>
            </button>
          </div>

          {myFoundItems.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center shadow-md">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <HandHeart className="w-6 h-6" />
              </div>
              <h3 className="font-black text-slate-900 text-lg">
                {statusFilter === 'recovered' ? 'No Handed Over / Recovered Items' : 'No Found Items Reported'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                {statusFilter === 'recovered'
                  ? 'Items you found and handed back to security or their rightful owners will be stored here in your history.'
                  : 'Found keys, a student card, or headphones on campus? Report them here to help return them safely to their rightful owner.'}
              </p>
              {statusFilter !== 'recovered' && (
                <button
                  onClick={() => onOpenReportModal('found')}
                  className="mt-4 px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Report a Found Belonging
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {myFoundItems.map(item => {
                const isRecovered = item.status === 'recovered' || item.status === 'returned';
                return (
                  <div
                    key={item.id}
                    className="glass-card rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden"
                  >
                    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-200/80 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-950 text-sm sm:text-base truncate max-w-full">{item.title}</h4>
                          {item.status === 'recovered' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Recovered
                            </span>
                          ) : item.status === 'returned' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-900 text-white shrink-0">
                              Handed Over
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 shrink-0">
                              {item.status.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">Found at {item.locationBlock}</span>
                          <span>•</span>
                          <span className="shrink-0">{new Date(item.dateTime).toLocaleDateString()}</span>
                        </p>
                        {item.currentHoldingLocation && (
                          <p className="text-[11px] text-slate-600 font-semibold mt-1 truncate">
                            Vault: {item.currentHoldingLocation}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => onViewItemDetails(item)}
                        className="px-3.5 py-2 bg-white/80 hover:bg-white border border-slate-200/80 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
                      >
                        View Report
                      </button>

                      {!isRecovered && (
                        <button
                          onClick={() => updateItemStatus(item.id, 'recovered', currentUser?.id, isAdmin, currentUser?.email)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5"
                          title="Mark this found item as handed over / recovered"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Handed Over / Recovered</span>
                        </button>
                      )}

                      {onEditItem && (
                        <button
                          onClick={() => onEditItem(item)}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                          title="Edit this report"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to permanently delete "${item.title}"?`)) {
                            if (onDeleteItem) {
                              onDeleteItem(item.id);
                            } else {
                              deleteItem(item.id, currentUser?.id, isAdmin, currentUser?.email);
                            }
                          }
                        }}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                        title="Delete this report"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SUGGESTED MATCHES */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          {myMatches.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center shadow-md">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-black text-slate-900 text-lg">No Matches Found Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                SAHAYAK's campus matching algorithm continuously compares your lost reports with newly reported found items across all Chandigarh University blocks.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myMatches.map(({ target, match }) => (
                <div
                  key={`${target.id}-${match.candidateItem.id}`}
                  className="glass-card rounded-2xl p-4 sm:p-5 shadow-sm border-amber-200/60 hover:border-amber-400/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden"
                >
                  <div className="space-y-3 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-900 border border-amber-500/30 shrink-0">
                        {match.matchScore}% Match Probability
                      </span>
                      <span className="text-xs text-slate-400 shrink-0">for your report:</span>
                      <strong className="text-xs text-slate-900 truncate font-black">{target.title}</strong>
                    </div>

                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={match.candidateItem.imageUrl}
                        alt={match.candidateItem.title}
                        className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl object-cover border border-slate-200/80 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-950 text-sm sm:text-base truncate">
                          {match.candidateItem.title}
                        </h4>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          Found at {match.candidateItem.locationBlock} • {match.reasons.join(' • ')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenMatchComparison(target, match.candidateItem)}
                    className="w-full md:w-auto px-5 py-2.5 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-900/10 shrink-0 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span>Compare &amp; Claim Item</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MY CLAIMS */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          {myClaims.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center shadow-md">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-black text-slate-900 text-lg">No Active Claims</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                When you spot a found item that belongs to you, submit a verification claim to safely recover it through campus security.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myClaims.map(claim => {
                const matchedItem = items.find(i => i.id === claim.itemId);
                const isVerified = claim.status === 'verified';
                const isReturned = claim.status === 'returned';

                return (
                  <div
                    key={claim.id}
                    className="glass-card rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-950 text-sm sm:text-base truncate">
                            {claim.itemTitle}
                          </h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                            isReturned
                              ? 'bg-slate-950 text-white'
                              : isVerified
                              ? 'bg-emerald-100 text-emerald-800'
                              : claim.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}>
                            {claim.status === 'pending' ? 'Verification Pending' : claim.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          Claim Ref: #{claim.id.slice(-6).toUpperCase()} • Filed on {new Date(claim.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* If verified or returned, option to print gate pass */}
                      {(isVerified || isReturned) && matchedItem && (
                        <button
                          onClick={() => onViewReceipt(claim, matchedItem)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-xl text-xs font-bold transition-colors shrink-0"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>View Official Gate Pass</span>
                        </button>
                      )}
                    </div>

                    {/* Claim Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1.5 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                        <span className="font-bold text-slate-800 block">Submitted Evidence:</span>
                        <p className="text-slate-600">{claim.proofDescription}</p>
                        {claim.serialNumberOrIdentifier && (
                          <p className="text-slate-600">
                            <strong>Identifier:</strong> {claim.serialNumberOrIdentifier}
                          </p>
                        )}
                        {claim.secretAnswer && (
                          <p className="text-amber-800 font-medium">
                            <strong>Secret Answer:</strong> {claim.secretAnswer}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                        <span className="font-bold text-slate-800 block">Collection Instructions:</span>
                        <p className="text-slate-700 font-medium">
                          Pickup Location: <strong>{claim.pickupLocation || 'Main Security Gate 1 Lost & Found Desk'}</strong>
                        </p>
                        <p className="text-slate-500 text-[11px]">
                          Please carry your physical Chandigarh University Student ID Card (UID: {claim.claimantUid}) for verification.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: FINDER INQUIRIES & DIRECT MESSAGES */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-700" />
                <span>In-App Messages &amp; Finder Chats</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Two-way messages between students and campus security discussing found items, holding locations, and safe returns.
              </p>
            </div>

            {/* Sub-tabs toggle */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setMessageSubTab('received')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  messageSubTab === 'received'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Inquiries on My Items ({myReceivedMessages.length})
              </button>
              <button
                type="button"
                onClick={() => setMessageSubTab('sent')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  messageSubTab === 'sent'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chats I Sent ({mySentMessages.length})
              </button>
            </div>
          </div>

          {/* Messages & Inquiries Header */}
          <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center shrink-0 border border-violet-100 shadow-2xs">
                <MessageSquare className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                  Direct Finder Inquiries &amp; Messages
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Holding coordinates, photos, and recovery verification threads
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('sahayak:open_notification_settings'))}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200/80 shadow-2xs transition-colors cursor-pointer"
              title="Notification Preferences & Push Alerts"
              aria-label="Notification Preferences"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* VIEW 1: RECEIVED INQUIRIES ON MY ITEMS */}
          {messageSubTab === 'received' && (
            <div>
              {myReceivedMessages.length === 0 ? (
                <div className="glass-panel rounded-3xl p-12 text-center shadow-md">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className="font-black text-slate-900 text-lg">No Finder Messages Yet</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                    When another student or campus authority spots your lost item and sends a message with its holding location, it will arrive here in real time.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myReceivedMessages.map(msg => {
                    const targetItem = items.find(i => i.id === msg.itemId);
                    const isItemRecovered = targetItem?.status === 'recovered' || targetItem?.status === 'returned';

                    return (
                      <div
                        key={msg.id}
                        className={`glass-card rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 border overflow-hidden ${
                          msg.status === 'unread' ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200/80'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          {/* Item Preview */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {targetItem?.imageUrl && (
                              <img
                                src={targetItem.imageUrl}
                                alt={targetItem.title}
                                className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-800 shrink-0">
                                Lost Item Report
                              </span>
                              <h4 className="text-sm font-bold text-slate-950 mt-1 truncate">
                                {targetItem ? targetItem.title : 'Reported Campus Item'}
                              </h4>
                              <p className="text-xs text-slate-500 truncate">
                                Lost at: {targetItem?.locationBlock || 'Campus Grounds'}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons: Open Chat and Confirm Recovery */}
                          <div className="flex flex-wrap items-center gap-2">
                            {targetItem && onSendMessage && (
                              <button
                                type="button"
                                onClick={() => onSendMessage(targetItem)}
                                className="px-3.5 py-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Open Chat &amp; Reply</span>
                              </button>
                            )}

                            {isItemRecovered ? (
                              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Recovered &amp; Closed</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  updateItemStatus(msg.itemId, 'recovered', currentUser?.id, isAdmin);
                                  updateMessage(msg.id, { status: 'resolved' });
                                }}
                                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                                title="Clicking this marks item recovered and removes it from the public campus dashboard"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Confirm Recovery</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Finder's Information Card */}
                        <div className="p-4 bg-white/80 rounded-xl border border-slate-200 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-100 pb-2.5">
                            <div>
                              <span className="text-slate-500 font-medium">Finder / Sender: </span>
                              <span className="font-bold text-slate-900">{msg.senderName}</span>
                              {msg.senderUid && (
                                <span className="text-slate-500 font-mono text-[11px] ml-1">
                                  (UID: {msg.senderUid})
                                </span>
                              )}
                            </div>
                            {msg.senderPhone && (
                              <a
                                href={`tel:${msg.senderPhone}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{msg.senderPhone}</span>
                              </a>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Reported Location / Custody: {msg.currentFoundLocation || 'Campus Security Desk'}</span>
                            </div>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 font-medium leading-relaxed">
                            "{msg.messageText}"
                          </div>

                          {msg.proofImageUrl && (
                            <div className="pt-2">
                              <span className="text-[11px] font-bold text-slate-600 block mb-1">
                                Finder's Verification Snapshot:
                              </span>
                              <img
                                src={msg.proofImageUrl}
                                alt="Finder proof"
                                className="w-32 h-32 rounded-xl object-cover border border-slate-200 shadow-2xs"
                              />
                            </div>
                          )}

                          <div className="text-[10px] text-slate-400 pt-1">
                            Received on {new Date(msg.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: MESSAGES I SENT (FINDER CHATS) */}
          {messageSubTab === 'sent' && (
            <div>
              {mySentMessages.length === 0 ? (
                <div className="glass-panel rounded-3xl p-12 text-center shadow-md">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Send className="w-6 h-6" />
                  </div>
                  <h3 className="font-black text-slate-900 text-lg">No Sent Messages Yet</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                    When you find someone's lost item on campus and click "Message Owner", your outgoing conversations will appear here so you can view their replies.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {mySentMessages.map(msg => {
                    const targetItem = items.find(i => i.id === msg.itemId);

                    return (
                      <div
                        key={msg.id}
                        className="glass-card rounded-2xl p-5 shadow-xs space-y-4 border border-slate-200/80"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          {/* Item Preview */}
                          <div className="flex items-center gap-3">
                            {targetItem?.imageUrl && (
                              <img
                                src={targetItem.imageUrl}
                                alt={targetItem.title}
                                className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                              />
                            )}
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                In Discussion With Owner
                              </span>
                              <h4 className="text-sm font-bold text-slate-950 mt-1">
                                {targetItem ? targetItem.title : (msg.itemTitle || 'Campus Item')}
                              </h4>
                              <p className="text-xs text-slate-500">
                                Recipient: {msg.recipientName || 'Item Owner'}
                              </p>
                            </div>
                          </div>

                          {/* Action Button: Open Chat & View Replies */}
                          <div className="flex items-center gap-2">
                            {targetItem && onSendMessage && (
                              <button
                                type="button"
                                onClick={() => onSendMessage(targetItem)}
                                className="px-3.5 py-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Open Chat &amp; View Replies</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Sent Content */}
                        <div className="p-4 bg-white/80 rounded-xl border border-slate-200 space-y-2">
                          {msg.currentFoundLocation && (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold">
                              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Custody Spot Reported: {msg.currentFoundLocation}</span>
                            </div>
                          )}

                          <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg text-xs text-slate-700 font-medium leading-relaxed">
                            "{msg.messageText}"
                          </div>

                          <div className="text-[10px] text-slate-400 pt-1">
                            Sent on {new Date(msg.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
