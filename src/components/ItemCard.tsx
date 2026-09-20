import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ItemReport } from '../types';
import { 
  MapPin, 
  Calendar, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  PackageCheck,
  MessageSquare,
  HandHeart,
  Eye,
  Check
} from 'lucide-react';

interface ItemCardProps {
  item: ItemReport;
  hasMatch?: boolean;
  matchScore?: number;
  onViewDetails: (item: ItemReport) => void;
  onClaimItem: (item: ItemReport) => void;
  onSendMessage?: (item: ItemReport) => void;
  onMarkRecovered?: (item: ItemReport) => void;
  onViewMatch?: (item: ItemReport) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  hasMatch,
  matchScore,
  onViewDetails,
  onClaimItem,
  onSendMessage,
  onMarkRecovered,
  onViewMatch,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const isLost = item.type === 'lost';

  const isOwner = Boolean(
    currentUser && (
      currentUser.id === item.userId || 
      (currentUser.email && item.userEmail && currentUser.email.toLowerCase() === item.userEmail.toLowerCase())
    )
  );

  // Format date readable
  const formattedDate = new Date(item.dateTime).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const getStatusBadge = () => {
    switch (item.status) {
      case 'recovered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs shadow-emerald-600/30 border border-white/20">
            <CheckCircle2 className="w-3 h-3 text-white" />
            <span>Recovered</span>
          </span>
        );
      case 'claimed':
      case 'returned':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-xs border border-white/20">
            <PackageCheck className="w-3 h-3 text-emerald-400" />
            <span>Claimed</span>
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xs shadow-blue-500/25 border border-white/20">
            <ShieldCheck className="w-3 h-3 text-white" />
            <span>Verified</span>
          </span>
        );
      case 'claim_pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs shadow-sky-500/25 border border-white/20">
            <Clock className="w-3 h-3 text-white" />
            <span>Claim Review</span>
          </span>
        );
      case 'match_found':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs shadow-amber-500/30 border border-white/20 animate-pulse">
            <Sparkles className="w-3 h-3 text-white" />
            <span>Match Alert</span>
          </span>
        );
      case 'found':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs shadow-emerald-500/30 border border-white/20">
            <HandHeart className="w-3 h-3 text-emerald-100" />
            <span>Available</span>
          </span>
        );
      case 'lost':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-xs shadow-rose-600/30 border border-white/20">
            <Clock className="w-3 h-3 text-rose-100" />
            <span>Active Lost</span>
          </span>
        );
    }
  };

  return (
    <div className="group rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-slate-200/70 border border-slate-100 hover:border-slate-200/80 bg-white">
      {/* Top Media & Badges */}
      <div>
        <div 
          onClick={() => {
            if (item.type === 'found' && !isOwner) {
              onClaimItem(item);
            } else {
              onViewDetails(item);
            }
          }}
          className="relative aspect-16/10 bg-slate-100 overflow-hidden cursor-pointer"
        >
          <img
            src={item.imageUrl}
            alt={item.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
            loading="lazy"
          />

          {/* Clean Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-black/20 pointer-events-none" />

          {/* Top Badges Bar */}
          <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1.5 pointer-events-none z-10">
            <span
              className={`pointer-events-auto px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-xs border shrink-0 ${
                isLost
                  ? 'bg-gradient-to-r from-rose-600/95 to-red-600/95 text-white border-white/25 shadow-rose-900/30'
                  : 'bg-gradient-to-r from-emerald-600/95 to-teal-600/95 text-white border-white/25 shadow-emerald-900/30'
              }`}
            >
              {isLost ? 'Lost Item' : 'Found Item'}
            </span>

            <div className="pointer-events-auto shrink-0 max-w-[65%] truncate">
              {getStatusBadge()}
            </div>
          </div>

          {/* Click to Claim Pill Overlay for Found Items */}
          {item.type === 'found' && (
            <div className="absolute bottom-2.5 left-3 right-3 pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/85 text-white text-[11px] font-bold backdrop-blur-md border border-white/20 shadow-md">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Click card to claim this item</span>
              </span>
            </div>
          )}
        </div>

        {/* Content Details */}
        <div className="p-4 space-y-3">
          {/* Category & Attributes Chips with vibrant modern accents */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
            <span className={`font-extrabold px-2.5 py-0.5 rounded-full text-[11px] transition-all duration-200 border ${
              isLost 
                ? 'bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100'
            }`}>
              {item.category}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600 font-semibold text-[11px] bg-slate-100/80 px-2 py-0.5 rounded-full">
              {item.color}
            </span>
            {item.brandOrModel && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 font-semibold text-[11px] truncate max-w-[110px] bg-slate-100/80 px-2 py-0.5 rounded-full">
                  {item.brandOrModel}
                </span>
              </>
            )}
          </div>

          {/* High-contrast dark title */}
          <h3 
            onClick={() => onViewDetails(item)}
            className="text-base font-extrabold text-slate-900 line-clamp-1 group-hover:text-red-700 cursor-pointer transition-colors tracking-tight"
          >
            {item.title}
          </h3>

          {/* Description snippet */}
          <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
            {item.description}
          </p>

          {/* Campus Location & Muted Metadata */}
          <div className="pt-2.5 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex items-start gap-1.5">
              <div className="w-5 h-5 rounded-full bg-red-50 text-red-700 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-3 h-3" />
              </div>
              <span className="line-clamp-1 font-bold text-slate-900 text-xs mt-0.5">
                {item.locationBlock}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-0.5">
              <div className="flex items-center gap-1 text-slate-500">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{formattedDate}</span>
              </div>
              <span className="text-slate-600 font-semibold">
                {item.userName ? `By ${item.userName.split(' ')[0]}` : 'Campus Member'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer Actions - Vibrant Modern App Buttons */}
      <div className="px-4 pb-4 pt-3 border-t border-slate-100 bg-gradient-to-b from-white to-slate-50/80 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onViewDetails(item)}
          className="py-2 px-3.5 text-xs font-bold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-100 border border-slate-200/90 hover:border-slate-300 rounded-full transition-all shadow-2xs hover:shadow-xs text-center flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          title="View full item details and safe custody location"
        >
          <Eye className="w-3.5 h-3.5 text-indigo-600" />
          <span>Details</span>
        </button>

        {/* 1. RULE: IF FOUND ITEM -> CLICK TO CLAIM OPTION (Vibrant Gradient CTA) */}
        {item.type === 'found' && (
          <button
            type="button"
            onClick={() => onClaimItem(item)}
            className="flex-1 py-2 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white rounded-full text-xs font-extrabold transition-all shadow-xs hover:shadow-md hover:shadow-rose-600/30 active:scale-95 text-center flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-rose-200" />
            <span>Claim Item</span>
          </button>
        )}

        {/* 2. RULE: IF LOST ITEM -> BUTTON TO SEND MESSAGE IF FOUND (Vibrant Emerald CTA) */}
        {item.type === 'lost' && !isOwner && onSendMessage && (
          <button
            type="button"
            onClick={() => onSendMessage(item)}
            className="flex-1 py-2 px-4 bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-700 hover:from-emerald-400 hover:via-teal-500 hover:to-emerald-600 text-white rounded-full text-xs font-extrabold transition-all shadow-xs hover:shadow-md hover:shadow-emerald-600/30 active:scale-95 text-center flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-200" />
            <span>Found This? Message</span>
          </button>
        )}

        {/* 3. RULE: IF LOST ITEM & OWNER -> BUTTON TO MARK RECOVERED */}
        {item.type === 'lost' && isOwner && onMarkRecovered && (
          <button
            type="button"
            onClick={() => onMarkRecovered(item)}
            className="flex-1 py-2 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:via-teal-500 hover:to-emerald-600 text-white rounded-full text-xs font-extrabold transition-all shadow-xs hover:shadow-md hover:shadow-emerald-600/30 active:scale-95 text-center flex items-center justify-center gap-1.5 cursor-pointer"
            title="Confirm you have recovered this lost item to remove it from the dashboard"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            <span>Mark Recovered</span>
          </button>
        )}
      </div>
    </div>
  );
};
