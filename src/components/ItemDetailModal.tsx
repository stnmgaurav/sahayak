import React, { useState, useEffect } from 'react';
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
  MessageSquare,
  Phone,
  EyeOff,
  Lock,
  Layers
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

  // Keyboard Escape listener to dismiss modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const isLost = item.type === 'lost';
  const isOwner = Boolean(
    currentUser && (
      currentUser.id === item.userId || 
      (currentUser.email && item.userEmail && currentUser.email.toLowerCase() === item.userEmail.toLowerCase())
    )
  );
  const canModify = Boolean(isAdmin || isOwner);

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
    const success = updateItemStatus(item.id, 'recovered', currentUser?.id, isAdmin, currentUser?.email);
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-detail-title"
    >
      <div 
        className="relative w-full max-w-3xl rounded-3xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden my-auto max-h-[92vh] sm:max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header with Clear Close 'X' Button */}
        <div 
          className={`sticky top-0 z-30 shrink-0 p-4 sm:p-6 pr-14 sm:pr-16 text-white transition-colors border-b ${
            isLost 
              ? 'bg-gradient-to-r from-red-900 via-rose-900 to-red-950 border-red-800/50' 
              : 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 border-slate-700/50'
          }`}
        >
          {/* Prominent High-Contrast Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white/90 hover:text-white rounded-full bg-white/10 hover:bg-white/25 active:scale-95 transition-all cursor-pointer ring-1 ring-white/20 shadow-sm"
            aria-label="Close item details"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Top Metadata Kicker Row */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white backdrop-blur-xs shadow-2xs">
              <span className={`w-1.5 h-1.5 rounded-full ${isLost ? 'bg-amber-300' : 'bg-emerald-300'}`} />
              <span>{isLost ? 'Campus Lost Report' : 'Campus Found Report'}</span>
            </span>

            <span className="text-white/70 text-xs font-mono">
              ID: #{item.id.slice(-6)}
            </span>

            <span className="text-white/40">•</span>

            <span className="text-xs font-semibold text-white/90 capitalize">
              {item.status.replace('_', ' ')}
            </span>
          </div>

          <h2 id="item-detail-title" className="text-xl sm:text-2xl font-black tracking-tight text-white leading-snug line-clamp-2">
            {item.title}
          </h2>

          <p className="text-xs sm:text-sm text-white/80 font-medium mt-1 truncate">
            Reported by <span className="text-white font-bold">{item.userName}</span> ({item.userUid || 'Student'}) • {item.locationBlock}
          </p>
        </div>

        {/* Action feedback notification */}
        {actionSuccess && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-3 flex items-center gap-2 text-xs font-bold text-emerald-950 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Scrollable Content Body with Polished Visual Hierarchy */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6">
          {/* Status Pipeline Tracker */}
          <div className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-4 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span className="uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-red-700" />
                <span>Resolution Pipeline</span>
              </span>
              <span className="font-extrabold text-red-700 capitalize">
                Stage {currentStepIdx + 1} of 5: {steps[currentStepIdx]?.label}
              </span>
            </div>

            <div className="relative flex items-center justify-between min-w-[280px] sm:min-w-0 w-full pt-1 pb-1">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 w-full z-0 rounded-full"></div>
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-red-700 transition-all duration-500 z-0 rounded-full"
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
                    <span className={`text-[10px] sm:text-[11px] font-bold mt-1.5 text-center max-w-[72px] leading-tight ${
                      isCurrent ? 'text-red-950 font-black' : isPast ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Section: Photo & Key Specifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* Left: Image Container */}
            <div className="space-y-3">
              <div className="aspect-4/3 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shadow-xs relative group">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute bottom-2.5 left-2.5 bg-slate-950/70 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                  <span>Photo Attachment</span>
                </div>
              </div>

              {/* Safe Custody Note for Found Items */}
              {item.type === 'found' && item.currentHoldingLocation && (
                <div className="p-3.5 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl text-xs text-emerald-950 flex items-start gap-2.5 shadow-2xs">
                  <Building2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-emerald-900 block text-[11px] uppercase tracking-wider">
                      Safe Custody Handover Point
                    </span>
                    <span className="text-emerald-800 font-semibold leading-relaxed mt-0.5 block">
                      {item.currentHoldingLocation}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Metadata Specifications */}
            <div className="space-y-3 flex flex-col justify-between">
              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80">
                  <span className="text-slate-500 uppercase tracking-wider font-extrabold text-[10px] block">
                    Category
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm mt-0.5 block truncate">
                    {item.category}
                  </span>
                </div>

                <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80">
                  <span className="text-slate-500 uppercase tracking-wider font-extrabold text-[10px] block">
                    Primary Color
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm mt-0.5 block truncate">
                    {item.color}
                  </span>
                </div>

                <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80">
                  <span className="text-slate-500 uppercase tracking-wider font-extrabold text-[10px] block">
                    Brand / Model
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm mt-0.5 block truncate">
                    {item.brandOrModel || 'Not Specified'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80">
                  <span className="text-slate-500 uppercase tracking-wider font-extrabold text-[10px] block">
                    Current Status
                  </span>
                  <span className="font-extrabold text-red-700 text-sm mt-0.5 block capitalize truncate">
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Campus Location Info */}
              <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-1 text-xs shadow-2xs">
                <div className="flex items-center gap-2 text-slate-500 font-extrabold text-[10px] uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-red-700" />
                  <span>Reported Campus Spot</span>
                </div>
                <p className="font-extrabold text-slate-900 text-sm">
                  {item.locationBlock}
                </p>
                <p className="text-slate-600 font-medium text-xs">
                  Specific Landmark: {item.specificSpot || 'Not specified'}
                </p>
              </div>

              {/* Reported Timestamp */}
              <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-0.5 text-xs shadow-2xs">
                <div className="flex items-center gap-2 text-slate-500 font-extrabold text-[10px] uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-red-700" />
                  <span>Reported Date &amp; Time</span>
                </div>
                <p className="font-semibold text-slate-800 text-xs pl-5">
                  {formattedDate}
                </p>
              </div>

              {/* Unique Identifying Mark */}
              {item.identifyingMark && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs space-y-0.5 shadow-2xs">
                  <span className="font-extrabold text-amber-900 block text-[10px] uppercase tracking-wider">
                    Unique Identifying Mark / Feature:
                  </span>
                  <p className="text-amber-900 font-medium">{item.identifyingMark}</p>
                </div>
              )}
            </div>
          </div>

          {/* Description Section */}
          <div className="p-4 sm:p-5 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-2 shadow-2xs">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Detailed Description &amp; Identifying Notes
            </h4>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
              {item.description}
            </p>
          </div>

          {/* Reporter Profile & Direct Contact Card */}
          <div className="p-4 sm:p-5 bg-slate-50/90 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-800 to-slate-900 text-white flex items-center justify-center font-black text-base shadow-sm ring-2 ring-white">
                {item.userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-sm">{item.userName}</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                    CU Student
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium block mt-0.5">UID: {item.userUid || 'Registered'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Phone privacy check */}
              {item.hidePhone ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-bold text-xs">
                  <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>Phone Kept Private</span>
                </span>
              ) : item.userPhone ? (
                <a
                  href={`tel:${item.userPhone}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-800 hover:text-slate-950 font-bold hover:bg-slate-50 transition-colors shadow-2xs"
                  title="Call reporter directly"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{item.userPhone}</span>
                </a>
              ) : null}

              {/* In-app chat button if not owner */}
              {!isOwner && onSendMessage && (
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      onClose();
                      openAuthModal('login', `Please sign in with your Chandigarh University ID to message ${item.userName}.`);
                      return;
                    }
                    onClose();
                    onSendMessage(item);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white rounded-full font-extrabold shadow-sm hover:shadow transition-all cursor-pointer active:scale-95 text-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat with {item.userName.split(' ')[0]}</span>
                </button>
              )}
            </div>
          </div>

          {/* Suggested Matches Section */}
          {matches.length > 0 && (
            <div className="border border-amber-200 bg-amber-50/50 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-950 font-black text-xs">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Automatically Detected Campus Matches ({matches.length})</span>
                </div>
                <span className="text-[11px] text-amber-800 font-bold">
                  AI Matching Engine
                </span>
              </div>

              <div className="space-y-2.5">
                {matches.map((match) => (
                  <div
                    key={match.candidateItem.id}
                    className="p-3 sm:p-3.5 bg-white rounded-2xl border border-amber-200 flex items-center justify-between gap-3 shadow-2xs hover:border-amber-400 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={match.candidateItem.imageUrl}
                        alt={match.candidateItem.title}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200"
                      />
                      <div className="min-w-0 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 truncate">
                            {match.candidateItem.title}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                            {match.matchScore}% Match
                          </span>
                        </div>
                        <p className="text-slate-500 font-medium truncate mt-0.5">
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
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-full text-xs font-extrabold shadow-sm shrink-0 transition-all cursor-pointer active:scale-95"
                    >
                      Compare &amp; Claim
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer Actions with Clear Hierarchy */}
        <div className="sticky bottom-0 z-20 shrink-0 p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50/95 backdrop-blur-md flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Close Details</span>
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Owner/Admin Actions: Edit & Delete strictly restricted to listing owner or admin */}
            {canModify && (
              <>
                {item.status !== 'recovered' && item.status !== 'returned' && (
                  <button
                    type="button"
                    onClick={handleMarkRecovered}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-full text-xs font-extrabold shadow-xs transition-all cursor-pointer active:scale-95"
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
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
                    title="Edit listing details"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Report</span>
                  </button>
                )}

                {onDeleteItem && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-95"
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
                  if (!isAuthenticated) {
                    onClose();
                    openAuthModal('login', `Please sign in with your Chandigarh University ID to message ${item.userName}.`);
                    return;
                  }
                  onClose();
                  onSendMessage(item);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-full text-xs font-extrabold shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Found This? Message Owner</span>
              </button>
            )}

            {/* If Found item and not returned, message finder option */}
            {item.type === 'found' && item.status !== 'returned' && item.status !== 'recovered' && !isOwner && onSendMessage && (
              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    onClose();
                    openAuthModal('login', `Please sign in with your Chandigarh University ID to message ${item.userName}.`);
                    return;
                  }
                  onClose();
                  onSendMessage(item);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Message Finder</span>
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
                className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white rounded-full text-xs font-extrabold shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Claim Item</span>
              </button>
            )}

            {/* If Owner, option to open Item Chat / Discussion thread */}
            {isOwner && onSendMessage && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSendMessage(item);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-full text-xs font-extrabold shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open Item Chat &amp; Replies</span>
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
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-full text-xs font-extrabold shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>View Matches ({matches[0].matchScore}%)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

