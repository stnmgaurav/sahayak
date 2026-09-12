import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ItemReport, ItemClaim, MatchSuggestion } from '../types';
import { findMatchesForItem } from '../lib/matching';
import { updateItemStatus } from '../lib/storage';
import { 
  PlusCircle, 
  HandHeart, 
  Sparkles, 
  ShieldCheck, 
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
  ArrowUpRight
} from 'lucide-react';

interface StudentDashboardProps {
  items: ItemReport[];
  claims: ItemClaim[];
  onOpenReportModal: (type: 'lost' | 'found') => void;
  onViewItemDetails: (item: ItemReport) => void;
  onOpenMatchComparison: (lostItem: ItemReport, foundItem: ItemReport) => void;
  onViewReceipt: (claim: ItemClaim, item: ItemReport) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  items,
  claims,
  onOpenReportModal,
  onViewItemDetails,
  onOpenMatchComparison,
  onViewReceipt,
}) => {
  const { currentUser, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<'lost' | 'found' | 'matches' | 'claims'>('lost');

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
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

  // Filter items for current user
  const myLostItems = items.filter(i => i.userId === currentUser.id && i.type === 'lost');
  const myFoundItems = items.filter(i => i.userId === currentUser.id && i.type === 'found');
  const myClaims = claims.filter(c => c.claimantId === currentUser.id || c.claimantEmail === currentUser.email);

  // Compute all matches for this student's lost items
  const myMatches: { target: ItemReport; match: MatchSuggestion }[] = [];
  myLostItems.forEach(lostItem => {
    const matches = findMatchesForItem(lostItem, items, 45);
    matches.forEach(m => {
      myMatches.push({ target: lostItem, match: m });
    });
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Student Welcome & Profile Bento Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-red-600/10 via-rose-500/5 to-transparent rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-700 via-red-800 to-red-950 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-red-900/20 shrink-0">
            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-slate-950 tracking-tight">{currentUser.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-red-100/90 text-red-800 border border-red-200">
                UID: {currentUser.uidOrRoll}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-200">
                Verified Student
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {currentUser.department} • {currentUser.email}
            </p>
          </div>
        </div>

        {/* Quick Report Actions */}
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => onOpenReportModal('lost')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-red-900/10 hover:shadow-md"
          >
            <PlusCircle className="w-4 h-4 text-red-200" />
            <span>I Lost Something</span>
          </button>
          <button
            onClick={() => onOpenReportModal('found')}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-md"
          >
            <HandHeart className="w-4 h-4 text-emerald-400" />
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
      </div>

      {/* TAB 1: MY LOST ITEMS */}
      {activeTab === 'lost' && (
        <div className="space-y-4">
          {myLostItems.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center shadow-md">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <PlusCircle className="w-6 h-6" />
              </div>
              <h3 className="font-black text-slate-900 text-lg">No Lost Items Reported</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                If you misplace an item anywhere on the Chandigarh University campus, report it here for security and peers to help find it.
              </p>
              <button
                onClick={() => onOpenReportModal('lost')}
                className="mt-4 px-5 py-2.5 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Report a Lost Belonging
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myLostItems.map(item => {
                const matches = findMatchesForItem(item, items, 45);
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
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800">
                              {item.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-red-700" />
                            <span>{item.locationBlock}</span>
                            <span>•</span>
                            <span>{new Date(item.dateTime).toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onViewItemDetails(item)}
                          className="px-3.5 py-2 bg-white/80 hover:bg-white border border-slate-200/80 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
                        >
                          Details
                        </button>
                        {item.status !== 'returned' && (
                          <button
                            onClick={() => updateItemStatus(item.id, 'returned')}
                            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all"
                          >
                            Mark Recovered
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Matched Banner if candidates exist */}
                    {matches.length > 0 && (
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
          {myFoundItems.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center shadow-md">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <HandHeart className="w-6 h-6" />
              </div>
              <h3 className="font-black text-slate-900 text-lg">No Found Items Reported</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Found keys, a student card, or headphones on campus? Report them here to help return them safely to their rightful owner.
              </p>
              <button
                onClick={() => onOpenReportModal('found')}
                className="mt-4 px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Report a Found Belonging
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myFoundItems.map(item => (
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
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                          {item.status.replace('_', ' ')}
                        </span>
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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewItemDetails(item)}
                      className="px-3.5 py-2 bg-white/80 hover:bg-white border border-slate-200/80 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
                    >
                      View Report
                    </button>
                    {item.status !== 'returned' && (
                      <button
                        onClick={() => updateItemStatus(item.id, 'returned')}
                        className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-2xs"
                      >
                        Mark Handed Over
                      </button>
                    )}
                  </div>
                </div>
              ))}
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
    </div>
  );
};
