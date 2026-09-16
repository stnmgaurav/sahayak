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
      (currentUser.email && currentUser.email === item.userEmail) || 
      isAdmin
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white backdrop-blur-md border border-white/20 shadow-xs">
            <CheckCircle2 className="w-3 h-3 text-white" />
            <span>Recovered</span>
          </span>
        );
      case 'claimed':
      case 'returned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-900 text-white backdrop-blur-md border border-white/20 shadow-xs">
            <PackageCheck className="w-3 h-3 text-emerald-400" />
            <span>Claimed</span>
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-900 backdrop-blur-md border border-emerald-500/30 shadow-xs">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Verified</span>
          </span>
        );
      case 'claim_pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-500/20 text-sky-900 backdrop-blur-md border border-sky-500/30 shadow-xs">
            <Clock className="w-3 h-3 text-sky-600" />
            <span>Claim Review</span>
          </span>
        );
      case 'match_found':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/25 text-amber-950 backdrop-blur-md border border-amber-500/40 shadow-xs">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Match Alert</span>
          </span>
        );
      case 'found':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white backdrop-blur-md border border-emerald-500/40 shadow-xs">
            <HandHeart className="w-3 h-3 text-emerald-200" />
            <span>Available to Claim</span>
          </span>
        );
      case 'lost':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-800 text-white backdrop-blur-md border border-red-500/30 shadow-xs">
            <Clock className="w-3 h-3 text-red-200" />
            <span>Active Lost</span>
          </span>
        );
    }
  };

  return (
    <div className="group glass-card rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-slate-900/10 border border-slate-200/80 bg-white/90">
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
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />

          {/* Frosted Glass Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

          {/* Top Badges Bar */}
          <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1.5 pointer-events-none z-10">
            <span
              className={`pointer-events-auto px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs border shrink-0 ${
                isLost
                  ? 'bg-red-900/90 text-white border-red-500/40 shadow-red-900/30'
                  : 'bg-emerald-900/90 text-emerald-200 border-emerald-500/40'
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
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950/80 text-white text-[11px] font-bold backdrop-blur-md border border-white/20 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Click card to claim this item</span>
              </span>
            </div>
          )}
        </div>

        {/* Content Details */}
        <div className="p-4 space-y-3">
          {/* Category & Attributes */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
            <span className="font-bold text-slate-800 bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 rounded-md text-[11px]">
              {item.category}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600 font-medium text-[11px]">
              Color: {item.color}
            </span>
            {item.brandOrModel && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 font-medium text-[11px] truncate max-w-[110px]">
                  {item.brandOrModel}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h3 
            onClick={() => onViewDetails(item)}
            className="text-sm sm:text-base font-black text-slate-950 line-clamp-1 group-hover:text-red-800 cursor-pointer transition-colors"
          >
            {item.title}
          </h3>

          {/* Description snippet */}
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {item.description}
          </p>

          {/* Campus Location */}
          <div className="pt-2.5 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-700 shrink-0 mt-0.5" />
              <span className="line-clamp-1 font-bold text-slate-900 text-xs">
                {item.locationBlock}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{formattedDate}</span>
              </div>
              <span className="font-medium text-slate-500">
                {item.userName ? `By ${item.userName.split(' ')[0]}` : 'Campus Member'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer Actions - Real-world Action Buttons */}
      <div className="px-4 pb-4 pt-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onViewDetails(item)}
          className="py-2 px-3 text-xs font-bold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-100 border border-slate-200/90 rounded-xl transition-all shadow-2xs text-center flex items-center justify-center gap-1.5"
          title="View full item details and safe custody location"
        >
          <Eye className="w-3.5 h-3.5 text-slate-400" />
          <span>Details</span>
        </button>

        {/* 1. RULE: IF FOUND ITEM -> CLICK TO CLAIM OPTION */}
        {item.type === 'found' && (
          <button
            type="button"
            onClick={() => onClaimItem(item)}
            className="flex-1 py-2 px-3.5 bg-gradient-to-r from-red-800 to-red-900 hover:from-red-900 hover:to-red-950 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-900/20 text-center flex items-center justify-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-red-200" />
            <span>Claim Item</span>
          </button>
        )}

        {/* 2. RULE: IF LOST ITEM -> BUTTON TO SEND MESSAGE IF FOUND */}
        {item.type === 'lost' && !isOwner && onSendMessage && (
          <button
            type="button"
            onClick={() => onSendMessage(item)}
            className="flex-1 py-2 px-3.5 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/20 text-center flex items-center justify-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-200" />
            <span>Found This? Message</span>
          </button>
        )}

        {/* 3. RULE: IF LOST ITEM & OWNER -> BUTTON TO MARK RECOVERED & REMOVE FROM DASHBOARD */}
        {item.type === 'lost' && isOwner && onMarkRecovered && (
          <button
            type="button"
            onClick={() => onMarkRecovered(item)}
            className="flex-1 py-2 px-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/20 text-center flex items-center justify-center gap-1.5"
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
