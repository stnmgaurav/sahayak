import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ItemReport, MatchSuggestion } from '../types';
import { updateItemStatus } from '../lib/storage';
import { 
  X, 
  MapPin, 
  Calendar, 
  Tag, 
  Palette, 
  Sparkles, 
  ShieldCheck, 
  Building2, 
  CheckCircle2, 
  Clock, 
  HelpCircle,
  Share2,
  PackageCheck,
  UserCheck,
  ArrowLeft,
  Edit3,
  Trash2,
  MessageSquare
} from 'lucide-react';

interface ItemDetailModalProps {
  item: ItemReport | null;
  isOpen: boolean;
  onClose: () => void;
  matches: MatchSuggestion[];
  onClaim: (item: ItemReport) => void;
  onOpenMatchComparison: (lostItem: ItemReport, foundItem: ItemReport) => void;
  onEditItem?: (item: ItemReport) => void;
  onDeleteItem?: (itemId: string) => void;
  onSendMessage?: (item: ItemReport) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  matches,
  onClaim,
  onOpenMatchComparison,
  onEditItem,
  onDeleteItem,
  onSendMessage,
}) => {
  const { currentUser, isAdmin, isAuthenticated, openAuthModal } = useAuth();
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const isLost = item.type === 'lost';
  const isOwner = Boolean(
    currentUser && (
      currentUser.id === item.userId || 
      (currentUser.email && currentUser.email === item.userEmail) || 
      isAdmin
    )
  );

  // Status Flow Pipeline Steps
  const steps = [
    { key: isLost ? 'lost' : 'found', label: isLost ? 'Reported Lost' : 'Reported Found' },
    { key: 'match_found', label: 'Match Found' },
    { key: 'claim_pending', label: 'Claim Submitted' },
    { key: 'verified', label: 'Verified by Security' },
    { key: 'recovered', label: 'Recovered / Handed Over' },
  ];

  const getStepIndex = (status: ItemReport['status']) => {
    switch (status) {
      case 'lost':
      case 'found':
        return 0;
      case 'match_found':
        return 1;
      case 'claim_pending':
        return 2;
      case 'verified':
        return 3;
      case 'returned':
      case 'recovered':
        return 4;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(item.status);

  const handleMarkRecovered = () => {
    const success = updateItemStatus(item.id, 'recovered', currentUser?.id, isAdmin);
    if (success) {
      setActionSuccess('Item successfully marked as Recovered! It will now be archived from public search and listings.');
      setTimeout(() => {
        setActionSuccess(null);
        onClose();
      }, 1500);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to permanently delete "${item.title}"? This cannot be undone.`)) {
      if (onDeleteItem) {
        onDeleteItem(item.id);
        onClose();
      }
    }
  };

  const formattedDate = new Date(item.dateTime).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl glass-panel rounded-3xl shadow-2xl border border-white/80 overflow-hidden my-6">
        {/* Header */}
        <div className={`p-5 sm:p-7 pr-16 text-white relative ${
          isLost 
            ? 'bg-gradient-to-r from-red-900 via-red-800 to-red-950' 
            : 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950'
        }`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white/90 hover:text-white p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white backdrop-blur-xs">
              {isLost ? 'Campus Lost Report' : 'Campus Found Report'}
            </span>
            <span className="text-white/70 text-xs font-mono">ID: #{item.id.slice(-6)}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">{item.title}</h2>
          <p className="text-xs sm:text-sm text-white/80 mt-1">
            Reported by {item.userName} ({item.userUid || 'Student'}) • {item.locationBlock}
          </p>
        </div>

        {/* Action feedback notification */}
        {actionSuccess && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-3 flex items-center gap-2 text-xs font-bold text-emerald-950">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Status Pipeline Tracker */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-4 overflow-x-auto no-scrollbar">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 whitespace-nowrap">
            Item Status Pipeline: Lost → Match Found → Claim → Verified → Returned
          </p>

          <div className="relative flex items-center justify-between min-w-[340px] sm:min-w-0">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 w-full z-0"></div>
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-red-700 transition-all duration-500 z-0"
              style={{ width: `${(currentStepIdx / (steps.length - 1)) * 100}%` }}
            ></div>

            {steps.map((step, idx) => {
              const isPast = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <div key={step.key} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isPast
                        ? 'bg-red-700 text-white shadow-xs ring-4 ring-red-100'
                        : 'bg-white border-2 border-slate-300 text-slate-400'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`text-[10px] sm:text-[11px] font-semibold mt-1.5 text-center max-w-[70px] leading-tight ${
                    isCurrent ? 'text-red-900 font-bold' : isPast ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Image */}
            <div className="space-y-3">
              <div className="aspect-4/3 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shadow-2xs">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Safe Custody Note for Found items */}
              {item.type === 'found' && item.currentHoldingLocation && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Safe Custody Handover Point:</span>
                    <span className="text-emerald-800">{item.currentHoldingLocation}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Metadata Specifications */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase tracking-wider font-bold text-[10px] block">
                    Category
                  </span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                    {item.category}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase tracking-wider font-bold text-[10px] block">
                    Color
                  </span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                    {item.color}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase tracking-wider font-bold text-[10px] block">
                    Brand / Model
                  </span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                    {item.brandOrModel || 'Not Specified'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 uppercase tracking-wider font-bold text-[10px] block">
                    Current Status
                  </span>
                  <span className="font-bold text-red-800 text-sm mt-0.5 block capitalize">
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Campus Location */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="flex items-center gap-2 text-slate-500 font-semibold">
                  <MapPin className="w-4 h-4 text-red-700" />
                  <span>Reported Campus Location:</span>
                </div>
                <p className="font-bold text-slate-900 pl-6">
                  {item.locationBlock}
                </p>
                <p className="text-slate-600 pl-6">
                  Spot: {item.specificSpot || 'Not specified'}
                </p>
              </div>

              {/* Timestamp */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="flex items-center gap-2 text-slate-500 font-semibold">
                  <Calendar className="w-4 h-4 text-red-700" />
                  <span>Reported Timestamp:</span>
                </div>
                <p className="font-medium text-slate-800 pl-6">
                  {formattedDate}
                </p>
              </div>

              {/* Unique Identifying Mark */}
              {item.identifyingMark && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-amber-900 block">
                    Unique Identifying Mark / Feature:
                  </span>
                  <p className="text-amber-800">{item.identifyingMark}</p>
                </div>
              )}
            </div>
          </div>

          {/* Description Section */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Detailed Description
            </h4>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* Suggested Matches Section */}
          {matches.length > 0 && (
            <div className="border border-amber-200 bg-amber-50/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Automatically Detected Campus Matches ({matches.length})</span>
                </div>
                <span className="text-[11px] text-amber-700 font-medium">
                  AI Matching Engine
                </span>
              </div>

              <div className="space-y-2">
                {matches.map((match, idx) => (
                  <div
                    key={match.candidateItem.id}
                    className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between gap-3 shadow-2xs hover:border-amber-400 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={match.candidateItem.imageUrl}
                        alt={match.candidateItem.title}
                        className="w-12 h-12 rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 truncate">
                            {match.candidateItem.title}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900">
                            {match.matchScore}% Match
                          </span>
                        </div>
                        <p className="text-slate-500 truncate mt-0.5">
                          {match.candidateItem.locationBlock} • {match.reasons.slice(0, 2).join(', ')}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!isAuthenticated) {
                          onClose();
                          openAuthModal('login', 'Please sign in with your Chandigarh University ID to compare matches and claim your item.');
                          return;
                        }
                        if (isLost) {
                          onOpenMatchComparison(item, match.candidateItem);
                        } else {
                          onOpenMatchComparison(match.candidateItem, item);
                        }
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
                    >
                      Compare &amp; Claim
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/70 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-200/70 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Back to Registry</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {/* Owner Actions: Edit & Delete only for item owner */}
            {isOwner && (
              <>
                {item.status !== 'recovered' && item.status !== 'returned' && (
                  <button
                    type="button"
                    onClick={handleMarkRecovered}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark Recovered</span>
                  </button>
                )}

                {onEditItem && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEditItem(item);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Report</span>
                  </button>
                )}

                {onDeleteItem && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl text-xs font-bold transition-all"
                    title="Delete your uploaded item report"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                )}
              </>
            )}

            {/* If Lost item and not recovered, send message to owner button */}
            {item.type === 'lost' && item.status !== 'recovered' && !isOwner && onSendMessage && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSendMessage(item);
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Found This Item? Send Message to Owner</span>
              </button>
            )}

            {/* If Found item and not returned, Claim button */}
            {item.type === 'found' && item.status !== 'returned' && item.status !== 'recovered' && !isOwner && (
              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    onClose();
                    openAuthModal('login', 'Please sign in with your Chandigarh University ID to file an ownership claim for this found item.');
                    return;
                  }
                  onClose();
                  onClaim(item);
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>I Own This Item (File Claim)</span>
              </button>
            )}

            {/* If Lost item and has matches, button to view matches */}
            {item.type === 'lost' && item.status !== 'recovered' && matches.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    onClose();
                    openAuthModal('login', 'Please sign in with your Chandigarh University ID to view AI matched items and claim them.');
                    return;
                  }
                  onOpenMatchComparison(item, matches[0].candidateItem);
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>View Top Match ({matches[0].matchScore}%)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
