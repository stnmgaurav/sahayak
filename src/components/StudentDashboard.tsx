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
  Send
} from 'lucide-react';

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
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 bg-white/90 hover:bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Back to Campus Registry</span>
        </button>
      </div>

      {/* Student Welcome & Profile Bento Banner */}
      <div className="glass-panel rounded-3xl p-5 sm:p-8 shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-red-600/10 via-rose-500/5 to-transparent rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center gap-4 sm:gap-5 relative z-10">
          <button
            type="button"
            onClick={() => setNeedsProfileCompletion(true)}
            className="relative group shrink-0 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-2xl"
            title="Click to view student profile details"
          >
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-red-700/60 shadow-md shadow-red-900/20 bg-white group-hover:scale-102 transition-transform"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-red-700 via-red-800 to-red-950 text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-md shadow-red-900/20 group-hover:scale-102 transition-transform">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-white border border-slate-200 text-slate-700 p-1 rounded-full shadow-xs group-hover:text-red-700 group-hover:border-red-600 transition-colors">
              <Camera className="w-2.5 h-2.5" />
            </div>
          </button>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight truncate">{currentUser.name}</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-red-100/90 text-red-800 border border-red-200" title="UID is locked to student profile">
                <Lock className="w-2.5 h-2.5 text-red-700" />
                UID: {currentUser.uidOrRoll}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-200">
                Verified Student
              </span>
              <button
                type="button"
                onClick={() => setNeedsProfileCompletion(true)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-slate-600 hover:text-red-800 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-colors"
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

        {/* Quick Report Actions */}
        <div className="flex items-center gap-2 sm:gap-3 relative z-10 w-full md:w-auto">
          {currentUser && isUserAdmin(currentUser.email) && onOpenSecurityDesk && (
            <button
              type="button"
              onClick={onOpenSecurityDesk}
              className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-red-800 to-red-950 hover:from-red-900 hover:to-black text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-red-900/20 hover:shadow-md"
              title="Open Campus Security Desk Admin Console"
            >
              <Shield className="w-4 h-4 text-red-200 shrink-0" />
              <span>Security Desk</span>
            </button>
          )}
          <button
            onClick={() => onOpenReportModal('lost')}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-red-900/10 hover:shadow-md"
          >
            <PlusCircle className="w-4 h-4 text-red-200 shrink-0" />
            <span>I Lost Something</span>
          </button>
          <button
            onClick={() => onOpenReportModal('found')}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md"
          >
            <HandHeart className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>I Found Something</span>
          </button>
        </div>
      </div>

      {/* Bento Grid Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div 
          onClick={() => setActiveTab('lost')}
          className={`glass-panel p-5 rounded-2xl cursor-pointer transition-all duration-200 group ${
            activeTab === 'lost' 
              ? 'ring-2 ring-red-700/60 bg-red-50/40 shadow-md' 
              : 'hover:border-slate-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>My Lost Items</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-rose-700">{myLostItems.length}</span>
            <span className="text-xs font-semibold text-slate-400">Reports</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div 
          onClick={() => setActiveTab('found')}
          className={`glass-panel p-5 rounded-2xl cursor-pointer transition-all duration-200 group ${
            activeTab === 'found' 
              ? 'ring-2 ring-emerald-700/60 bg-emerald-50/40 shadow-md' 
              : 'hover:border-slate-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Items I Found</span>
            <HandHeart className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-emerald-700">{myFoundItems.length}</span>
            <span className="text-xs font-semibold text-slate-400">Turned In</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div 
          onClick={() => setActiveTab('matches')}
          className={`glass-panel p-5 rounded-2xl cursor-pointer transition-all duration-200 group ${
            activeTab === 'matches' 
              ? 'ring-2 ring-amber-500/60 bg-amber-50/40 shadow-md' 
              : 'hover:border-slate-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Campus Matches</span>
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-amber-600">{myMatches.length}</span>
            {myMatches.length > 0 ? (
              <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                Action Req
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-400">Scanning</span>
            )}
          </div>
        </div>

        {/* Metric 4 */}
        <div 
          onClick={() => setActiveTab('claims')}
          className={`glass-panel p-5 rounded-2xl cursor-pointer transition-all duration-200 group ${
            activeTab === 'claims' 
              ? 'ring-2 ring-sky-600/60 bg-sky-50/40 shadow-md' 
              : 'hover:border-slate-300 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>My Claims</span>
            <ShieldCheck className="w-4 h-4 text-sky-600" />
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-black text-sky-700">{myClaims.length}</span>
            <span className="text-xs font-semibold text-slate-400">Tracking</span>
          </div>
        </div>
      </div>

      {/* Frosted Glass Tabs Switcher */}
      <div className="glass-panel rounded-2xl p-1.5 shadow-2xs flex items-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('lost')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'lost' 
              ? 'bg-red-800 text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          My Lost Reports ({myLostItems.length})
        </button>
        <button
          onClick={() => setActiveTab('found')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'found' 
              ? 'bg-slate-950 text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          My Found Reports ({myFoundItems.length})
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'matches' 
              ? 'bg-amber-600 text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Suggested Matches ({myMatches.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'claims' 
              ? 'bg-sky-800 text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          My Claims &amp; Verification ({myClaims.length})
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'messages' 
              ? 'bg-emerald-800 text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white rounded-xl text-xs font-bold shadow-2xs transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report Lost Item</span>
            </button>
          </div>

          {myLostItems.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center shadow-md">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <PlusCircle className="w-6 h-6" />
              </div>
              <h3 className="font-black text-slate-900 text-lg">
                {statusFilter === 'recovered' ? 'No Recovered Items Yet' : 'No Lost Items Reported'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                {statusFilter === 'recovered'
                  ? 'When your reported lost belongings are found and recovered, they will be archived here in your personal history.'
                  : 'If you misplace an item anywhere on the Chandigarh University campus, report it here for security and peers to help find it.'}
              </p>
              {statusFilter !== 'recovered' && (
                <button
                  onClick={() => onOpenReportModal('lost')}
                  className="mt-4 px-5 py-2.5 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white rounded-xl text-xs font-bold shadow-sm"
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
                    className="glass-card rounded-2xl p-5 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-16 h-16 rounded-xl object-cover border border-slate-200/80 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-950 text-base">
                              {item.title}
                            </h4>
                            {item.status === 'recovered' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Recovered
                              </span>
                            ) : item.status === 'returned' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-900 text-white">
                                Returned
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800">
                                {item.status.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-red-700" />
                            <span>{item.locationBlock}</span>
                            <span>•</span>
                            <span>{new Date(item.dateTime).toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => onViewItemDetails(item)}
                          className="px-3.5 py-2 bg-white/80 hover:bg-white border border-slate-200/80 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
                        >
                          Details
                        </button>

                        {!isRecovered && (
                          <button
                            onClick={() => updateItemStatus(item.id, 'recovered', currentUser?.id, isAdmin)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                            title="Confirm recovery to remove this item from the campus dashboard"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            <span>Mark Recovered (Remove from Dashboard)</span>
                          </button>
                        )}

                        {allMessages.filter(m => m.itemId === item.id).length > 0 && (
                          <button
                            onClick={() => setActiveTab('messages')}
                            className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{allMessages.filter(m => m.itemId === item.id).length} Finder Message(s)</span>
                          </button>
                        )}

                        {onEditItem && (
                          <button
                            onClick={() => onEditItem(item)}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
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
                                deleteItem(item.id, currentUser?.id, isAdmin);
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

                    {/* Matched Banner if candidates exist */}
                    {!isRecovered && matches.length > 0 && (
                      <div className="p-3.5 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-950">
                        <div className="flex items-center gap-2 min-w-0">
                          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
                          <span className="truncate">
                            <strong>{matches.length} AI Match Found:</strong> "{matches[0].candidateItem.title}" at {matches[0].candidateItem.locationBlock} ({matches[0].matchScore}% match)
                          </span>
                        </div>
                        <button
                          onClick={() => onOpenMatchComparison(item, matches[0].candidateItem)}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-2xs"
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
                    className="glass-card rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200/80 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-950 text-base">{item.title}</h4>
                          {item.status === 'recovered' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Recovered
                            </span>
                          ) : item.status === 'returned' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-900 text-white">
                              Handed Over
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                              {item.status.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Found at {item.locationBlock}</span>
                          <span>•</span>
                          <span>{new Date(item.dateTime).toLocaleDateString()}</span>
                        </p>
                        {item.currentHoldingLocation && (
                          <p className="text-[11px] text-slate-600 font-semibold mt-1">
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
                          onClick={() => updateItemStatus(item.id, 'recovered', currentUser?.id, isAdmin)}
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
                              deleteItem(item.id, currentUser?.id, isAdmin);
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
                  className="glass-card rounded-2xl p-5 shadow-sm border-amber-200/60 hover:border-amber-400/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-900 border border-amber-500/30">
                        {match.matchScore}% Match Probability
                      </span>
                      <span className="text-xs text-slate-400">for your report:</span>
                      <strong className="text-xs text-slate-900 truncate font-black">{target.title}</strong>
                    </div>

                    <div className="flex items-center gap-3">
                      <img
                        src={match.candidateItem.imageUrl}
                        alt={match.candidateItem.title}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200/80 shrink-0"
                      />
                      <div>
                        <h4 className="font-bold text-slate-950 text-base">
                          {match.candidateItem.title}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Found at {match.candidateItem.locationBlock} • {match.reasons.join(' • ')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenMatchComparison(target, match.candidateItem)}
                    className="px-5 py-2.5 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-900/10 shrink-0 flex items-center justify-center gap-2"
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
                    className="glass-card rounded-2xl p-5 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-950 text-base">
                            {claim.itemTitle}
                          </h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
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
                        <p className="text-xs text-slate-500 mt-0.5">
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
                        className={`glass-card rounded-2xl p-5 shadow-xs space-y-4 border ${
                          msg.status === 'unread' ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200/80'
                        }`}
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
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                                Lost Item Report
                              </span>
                              <h4 className="text-sm font-bold text-slate-950 mt-1">
                                {targetItem ? targetItem.title : 'Reported Campus Item'}
                              </h4>
                              <p className="text-xs text-slate-500">
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
