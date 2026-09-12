import React from 'react';
import { ItemReport } from '../types';
import { 
  MapPin, 
  Calendar, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  PackageCheck,
  ArrowRight,
  HandHeart,
  Eye
} from 'lucide-react';

interface ItemCardProps {
  item: ItemReport;
  hasMatch?: boolean;
  matchScore?: number;
  onViewDetails: (item: ItemReport) => void;
  onClaimItem: (item: ItemReport) => void;
  onViewMatch?: (item: ItemReport) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  hasMatch,
  matchScore,
  onViewDetails,
  onClaimItem,
  onViewMatch,
}) => {
  const isLost = item.type === 'lost';

  // Format date readable
  const formattedDate = new Date(item.dateTime).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const getStatusBadge = () => {
    switch (item.status) {
      case 'returned':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-900/90 text-white backdrop-blur-md border border-white/20 shadow-xs">
            <PackageCheck className="w-3 h-3 text-emerald-400" />
            <span>Returned</span>
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-800 backdrop-blur-md border border-emerald-500/30 shadow-xs">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Verified Custody</span>
          </span>
        );
      case 'claim_pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-sky-500/15 text-sky-800 backdrop-blur-md border border-sky-500/30 shadow-xs">
            <Clock className="w-3 h-3 text-sky-600" />
            <span>Claim Under Review</span>
          </span>
        );
      case 'match_found':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-900 backdrop-blur-md border border-amber-500/40 shadow-xs animate-pulse">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>AI Match Found</span>
          </span>
        );
      case 'found':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-900 backdrop-blur-md border border-emerald-500/30 shadow-xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Available to Claim</span>
          </span>
        );
      case 'lost':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-800 backdrop-blur-md border border-rose-500/30 shadow-xs">
            <Clock className="w-3 h-3 text-rose-600" />
            <span>Active Search</span>
          </span>
        );
    }
  };

  return (
    <div className="group glass-card rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-slate-900/5">
      {/* Top Media & Badges */}
      <div>
        <div className="relative aspect-16/10 bg-slate-100 overflow-hidden">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />

          {/* Frosted Glass Gradient Overlay for text contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

          {/* Type Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm border ${
                isLost
                  ? 'bg-red-800/90 text-white border-red-500/40 shadow-red-900/30'
                  : 'bg-slate-950/85 text-emerald-300 border-white/20'
              }`}
            >
              {isLost ? 'Lost Item' : 'Found Item'}
            </span>
          </div>

          {/* Status Badge */}
          <div className="absolute top-3 right-3">
            {getStatusBadge()}
          </div>

          {/* AI Match Notification Pill */}
          {(hasMatch || item.status === 'match_found') && (
            <div className="absolute bottom-2.5 left-3 right-3 glass-dark text-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-lg border border-amber-500/30">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                <span className="text-[11px] font-bold">
                  {matchScore ? `${matchScore}% Match Score` : 'AI Match Detected'}
                </span>
              </span>
              {onViewMatch && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewMatch(item);
                  }}
                  className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 rounded-md text-[10px] font-extrabold uppercase tracking-wide transition-colors"
                >
                  Compare
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content Details */}
        <div className="p-4 space-y-3">
          {/* Category & Attributes */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
            <span className="font-bold text-slate-700 bg-slate-100/90 border border-slate-200/60 px-2.5 py-0.5 rounded-md text-[11px]">
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
            className="text-sm sm:text-base font-bold text-slate-950 line-clamp-1 group-hover:text-red-800 cursor-pointer transition-colors"
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
              <span className="line-clamp-1 font-semibold text-slate-800 text-xs">
                {item.locationBlock}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{formattedDate}</span>
              </div>
              <span className="font-medium text-slate-400">
                By {item.userName.split(' ')[0]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="px-4 pb-4 pt-3 border-t border-slate-100/80 bg-slate-50/40 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onViewDetails(item)}
          className="flex-1 py-2 px-2.5 text-xs font-bold text-slate-700 hover:text-slate-950 bg-white/80 hover:bg-white border border-slate-200/80 rounded-xl transition-all shadow-2xs hover:shadow-xs text-center flex items-center justify-center gap-1.5"
        >
          <Eye className="w-3.5 h-3.5 text-slate-400" />
          <span>Details</span>
        </button>

        {/* Claim item action for found items */}
        {item.type === 'found' && item.status !== 'returned' && (
          <button
            type="button"
            onClick={() => onClaimItem(item)}
            className="flex-1 py-2 px-3 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-red-900/10 text-center flex items-center justify-center gap-1.5"
          >
            <HandHeart className="w-3.5 h-3.5 text-emerald-300" />
            <span>Claim</span>
          </button>
        )}

        {/* Match action for lost items with active candidates */}
        {item.type === 'lost' && (item.status === 'match_found' || hasMatch) && onViewMatch && (
          <button
            type="button"
            onClick={() => onViewMatch(item)}
            className="flex-1 py-2 px-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm text-center flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>Match</span>
          </button>
        )}
      </div>
    </div>
  );
};
