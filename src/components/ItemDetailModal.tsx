import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ItemReport, MatchSuggestion } from '../types';
import { updateItemStatus } from '../lib/storage';
import { ItemProductGallery } from './ItemProductGallery';
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
  PackageCheck,
  UserCheck,
  ArrowLeft,
  Edit3,
  Trash2,
  MessageSquare,
  Phone,
  EyeOff,
  Lock,
  Layers,
  ChevronRight,
  User,
  AlertCircle
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
  const containerRef = useRef<HTMLDivElement>(null);
  const lastOpenedItemIdRef = useRef<string | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Reset scroll position ONLY once when opening or switching to a new item
  useEffect(() => {
    if (isOpen && item) {
      if (lastOpenedItemIdRef.current !== item.id) {
        lastOpenedItemIdRef.current = item.id;
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
      }
    } else {
      lastOpenedItemIdRef.current = null;
    }
  }, [isOpen, item?.id]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

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
    { key: 'verified', label: 'Verified by Desk' },
    { key: 'recovered', label: 'Recovered' },
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

  const getStatusBadge = () => {
    switch (item.status) {
      case 'recovered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Recovered / Handed Over</span>
          </span>
        );
      case 'claimed':
      case 'returned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-white">
            <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Claimed &amp; Resolved</span>
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Verified by Security Desk</span>
          </span>
        );
      case 'claim_pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>Claim Review in Progress</span>
          </span>
        );
      case 'match_found':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Potential Match Detected</span>
          </span>
        );
      case 'found':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Available for Claim</span>
          </span>
        );
      case 'lost':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
            <Clock className="w-3.5 h-3.5 text-rose-600" />
            <span>Actively Seeking</span>
          </span>
        );
    }
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto block text-slate-800 animate-in fade-in duration-200"
      style={{ WebkitOverflowScrolling: 'touch' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-detail-title"
    >
      <div className="min-h-full flex flex-col w-full pb-20 sm:pb-0">
      {/* Sticky Full-Page Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Left: Back Button & Breadcrumbs */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200/80 text-xs sm:text-sm font-extrabold transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0"
              title="Return to listings (Esc)"
              aria-label="Back to listings"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Back to Listings</span>
              <span className="sm:hidden">Back</span>
            </button>

            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-medium truncate">
              <span className="text-slate-400">SAHAYAK Registry</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className={`font-bold ${isLost ? 'text-rose-700' : 'text-emerald-700'}`}>
                {isLost ? 'Campus Lost Report' : 'Campus Found Report'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="font-mono text-slate-600 truncate">
                #{item.id.slice(-6)}
              </span>
            </div>
          </div>

          {/* Right: Status Pill & Direct Close 'X' */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block">
              {getStatusBadge()}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all active:scale-95 cursor-pointer border border-slate-200"
              title="Close full-page view (Esc)"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Action feedback toast / alert banner */}
      {actionSuccess && (
        <div className="bg-emerald-500 text-white px-4 sm:px-6 py-3 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Expansive Content Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        
        {/* Full-Width Resolution Pipeline Tracker */}
        <section aria-label="Resolution pipeline" className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700">
              <Layers className="w-4 h-4 text-red-700 shrink-0" />
              <span className="uppercase tracking-wider text-slate-500 font-extrabold text-[11px]">
                Item Resolution Status
              </span>
            </div>
            <div className="text-xs sm:text-sm font-extrabold text-red-700">
              Stage {currentStepIdx + 1} of 5: <span className="text-slate-900 capitalize">{steps[currentStepIdx]?.label}</span>
            </div>
          </div>

          <div className="relative pt-2 pb-2">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-slate-100 w-full z-0 rounded-full" />
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-red-700 transition-all duration-500 z-0 rounded-full"
              style={{ width: `${(currentStepIdx / (steps.length - 1)) * 100}%` }}
            />

            <div className="relative z-10 flex items-center justify-between">
              {steps.map((step, idx) => {
                const isPast = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;

                return (
                  <div key={step.key} className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                        isPast
                          ? 'bg-red-700 text-white shadow-sm ring-4 ring-red-100'
                          : 'bg-white border-2 border-slate-300 text-slate-400'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : idx + 1}
                    </div>
                    <span className={`text-[11px] sm:text-xs font-bold mt-2 text-center max-w-[85px] sm:max-w-[110px] leading-tight ${
                      isCurrent ? 'text-red-950 font-black' : isPast ? 'text-slate-800' : 'text-slate-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column (col-span-7): Product Gallery & Extensive Documentation */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Interactive E-Commerce Product Image Gallery */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-6 shadow-xs">
              <ItemProductGallery
                itemId={item.id}
                images={item.imageUrls}
                imageUrl={item.imageUrl}
                image={item.image}
                title={item.title}
                category={item.category}
                itemType={item.type}
                locationBlock={item.locationBlock}
                description={item.description}
              />
            </div>

            {/* Detailed Description & Identifying Notes */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span>Description &amp; Report Context</span>
              </h3>
              <p className="text-slate-800 text-sm sm:text-base leading-relaxed font-normal whitespace-pre-line">
                {item.description}
              </p>
            </div>

            {/* Unique Identifying Mark / Secret Identifier */}
            {item.identifyingMark && (
              <div className="p-5 sm:p-6 bg-amber-50/90 border border-amber-200/90 rounded-3xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 text-amber-950 font-extrabold text-xs uppercase tracking-wider">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Unique Identifying Feature / Mark</span>
                </div>
                <p className="text-sm font-semibold text-amber-900 pl-6 leading-relaxed">
                  {item.identifyingMark}
                </p>
              </div>
            )}

            {/* Safe Custody Handover Point for Found Items */}
            {item.type === 'found' && item.currentHoldingLocation && (
              <div className="p-5 sm:p-6 bg-emerald-50/90 border border-emerald-200/90 rounded-3xl text-emerald-950 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 text-emerald-950 font-extrabold text-xs uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Safe Custody &amp; Handover Location</span>
                </div>
                <p className="text-sm font-bold text-emerald-900 pl-6 leading-relaxed">
                  {item.currentHoldingLocation}
                </p>
                <p className="text-xs text-emerald-800/80 pl-6">
                  Items deposited in safe custody can be inspected and claimed during campus operational hours.
                </p>
              </div>
            )}

            {/* Secret Verification Question for Found Items */}
            {item.type === 'found' && item.secretVerificationQuestion && (
              <div className="p-5 sm:p-6 bg-slate-100/80 border border-slate-200/90 rounded-3xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 text-slate-700 font-extrabold text-xs uppercase tracking-wider">
                  <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Finder's Verification Challenge</span>
                </div>
                <p className="text-sm font-medium text-slate-800 pl-6">
                  {item.secretVerificationQuestion}
                </p>
                <p className="text-[11px] text-slate-500 pl-6">
                  When submitting a claim, you will be prompted to answer this question to establish ownership.
                </p>
              </div>
            )}

            {/* AI Automated Matches Section */}
            {matches.length > 0 && (
              <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-white border border-amber-200/90 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-amber-950 font-black text-sm">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Potential Automated Matches ({matches.length})</span>
                  </div>
                  <span className="text-xs font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-200">
                    Smart Match Engine
                  </span>
                </div>

                <p className="text-xs text-amber-900/80 leading-relaxed">
                  Our system identified complementary campus reports with high attribute similarity.
                </p>

                <div className="space-y-3 pt-1">
                  {matches.map((match) => (
                    <div
                      key={match.candidateItem.id}
                      className="p-4 bg-white rounded-2xl border border-amber-200 hover:border-amber-400 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={match.candidateItem.imageUrl || match.candidateItem.imageUrls?.[0] || ''}
                          alt={match.candidateItem.title}
                          className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200"
                        />
                        <div className="min-w-0 text-xs space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-sm truncate">
                              {match.candidateItem.title}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                              {match.matchScore}% Match
                            </span>
                          </div>
                          <p className="text-slate-500 font-medium truncate">
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
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-xl text-xs font-extrabold shadow-sm shrink-0 transition-all cursor-pointer active:scale-95 text-center"
                      >
                        Compare &amp; Claim
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column (col-span-5): Key Specs, Reporter Info & Elevated Primary Actions */}
          <div className="lg:col-span-5 space-y-6 self-start">
            
            {/* Item Title & Core Summary Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className={`font-black uppercase tracking-wider text-[11px] ${
                  isLost ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  {isLost ? 'Lost Item Report' : 'Found Item Listing'}
                </span>
                <span aria-hidden="true">·</span>
                <span>ID: #{item.id.slice(-6)}</span>
              </div>

              <h1 id="item-detail-title" className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                {item.title}
              </h1>

              {/* Status Banner */}
              <div className="pt-1">
                {getStatusBadge()}
              </div>

              {/* Specifications Grid */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Category
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 block truncate">
                    {item.category}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Color
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 block truncate">
                    {item.color}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Brand / Model
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 block truncate">
                    {item.brandOrModel || 'Not Specified'}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Date &amp; Time
                  </span>
                  <span className="text-xs font-extrabold text-slate-800 block truncate" title={formattedDate}>
                    {new Date(item.dateTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Campus Spot Landmark */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-red-700" />
                  <span>Reported Campus Spot</span>
                </div>
                <p className="font-extrabold text-slate-900 text-sm">
                  {item.locationBlock}
                </p>
                <p className="text-slate-500 font-medium text-xs mt-0.5">
                  Specific Landmark: {item.specificSpot || 'Not specified'}
                </p>
              </div>
            </div>

            {/* Reporter Profile & Direct Contact Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Listing Reporter
                </span>
                <span className="text-xs font-bold text-slate-500">
                  UID: {item.userUid || 'Student'}
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-800 to-slate-900 text-white flex items-center justify-center font-black text-lg shadow-sm">
                  {item.userName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-extrabold text-slate-900 truncate">
                    {item.userName}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium truncate">
                    Chandigarh University Registered User
                  </p>
                </div>
              </div>

              {/* Contact Options: Phone Call & Chat Button */}
              <div className="pt-2 flex flex-col gap-2.5">
                {/* Phone Call option */}
                {item.hidePhone ? (
                  <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 flex items-center gap-2 text-xs font-bold text-amber-900">
                    <EyeOff className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Phone number kept private by user</span>
                  </div>
                ) : item.userPhone ? (
                  <a
                    href={`tel:${item.userPhone}`}
                    className="w-full py-3 px-4 rounded-xl bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-900 font-extrabold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>Call Reporter ({item.userPhone})</span>
                  </a>
                ) : null}

                {/* Direct In-App Message Button */}
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
                    className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-white" />
                    <span>Chat with {item.userName.split(' ')[0]}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Elevated Primary Action Center */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-3.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Primary Actions
              </span>

              {/* If Found item and not returned: Claim Button and Ask Question / Chat with Finder */}
              {item.type === 'found' && item.status !== 'returned' && item.status !== 'recovered' && !isOwner && (
                <div className="space-y-2.5">
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
                    className="w-full py-3.5 px-6 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white rounded-2xl font-black text-sm shadow-md shadow-red-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-5 h-5 text-white" />
                    <span>Claim This Item</span>
                  </button>

                  {onSendMessage && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!isAuthenticated) {
                          onClose();
                          openAuthModal('login', `Please sign in with your Chandigarh University ID to chat with finder ${item.userName}.`);
                          return;
                        }
                        onClose();
                        onSendMessage(item);
                      }}
                      className="w-full py-3 px-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-2xl font-extrabold text-xs shadow-sm shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-200" />
                      <span>Ask Question About Belongings (Chat with Finder)</span>
                    </button>
                  )}
                </div>
              )}

              {/* If Lost item and not recovered: Message Reporter */}
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
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-2xl font-black text-sm shadow-md shadow-emerald-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <MessageSquare className="w-5 h-5 text-white" />
                  <span>Ask Question / Message Owner</span>
                </button>
              )}

              {/* Owner Chat Thread */}
              {isOwner && onSendMessage && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSendMessage(item);
                  }}
                  className="w-full py-3 px-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-2xl font-extrabold text-xs shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-white" />
                  <span>Open Item Chat &amp; Inquiries</span>
                </button>
              )}

              {/* Owner / Admin Management Operations */}
              {canModify && (
                <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                  {item.status !== 'recovered' && item.status !== 'returned' && (
                    <button
                      type="button"
                      onClick={handleMarkRecovered}
                      className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Mark as Recovered / Handed Over</span>
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {onEditItem && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onEditItem(item);
                        }}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Edit Report</span>
                      </button>
                    )}

                    {onDeleteItem && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Secondary Back Navigation button in sidebar */}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
                <span>Return to Campus Registry</span>
              </button>
            </div>

          </div>

        </div>

      </main>

      {/* Full-Page Bottom Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900">SAHAYAK</span>
            <span>— Chandigarh University Campus Lost &amp; Found Portal</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-slate-700 hover:text-red-700 font-bold cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Listings</span>
          </button>
        </div>
      </footer>
      </div>

      {/* Mobile Sticky Bottom Action Dock (Quick Chat & Claim access on phones) */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-3 shadow-lg flex sm:hidden items-center gap-2">
        {/* If Found Item & !isOwner */}
        {item.type === 'found' && item.status !== 'returned' && item.status !== 'recovered' && !isOwner && (
          <>
            {onSendMessage && (
              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    onClose();
                    openAuthModal('login', `Please sign in with your Chandigarh University ID to chat with finder ${item.userName}.`);
                    return;
                  }
                  onClose();
                  onSendMessage(item);
                }}
                className="flex-1 py-3 px-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 active:scale-[0.98] text-white rounded-xl font-black text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                title="Ask question about your belongings"
              >
                <MessageSquare className="w-4 h-4 text-emerald-200 shrink-0" />
                <span className="truncate">Ask Question / Chat</span>
              </button>
            )}
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
              className="flex-1 py-3 px-3 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 active:scale-[0.98] text-white rounded-xl font-black text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-white shrink-0" />
              <span className="truncate">Claim Item</span>
            </button>
          </>
        )}

        {/* If Lost Item & !isOwner */}
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
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 active:scale-[0.98] text-white rounded-xl font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-white shrink-0" />
            <span>Ask Question / Message Owner</span>
          </button>
        )}

        {/* If Owner */}
        {isOwner && onSendMessage && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onSendMessage(item);
            }}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 active:scale-[0.98] text-white rounded-xl font-black text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-white shrink-0" />
            <span>Open Inquiries &amp; Chat</span>
          </button>
        )}

        {/* If Recovered/Returned and !isOwner */}
        {(item.status === 'recovered' || item.status === 'returned') && !isOwner && (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Item Closed — Back to Registry</span>
          </button>
        )}
      </div>
    </div>
  );
};
