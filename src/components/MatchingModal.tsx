import React, { useEffect } from 'react';
import { ItemReport, MatchSuggestion } from '../types';
import { evaluateMatch } from '../lib/matching';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  Tag, 
  Palette,
  Building2,
  ArrowLeft,
  Image as ImageIcon,
  MessageSquare
} from 'lucide-react';

interface MatchingModalProps {
  lostItem: ItemReport | null;
  foundItem: ItemReport | null;
  isOpen: boolean;
  onClose: () => void;
  onProceedToClaim: (foundItem: ItemReport) => void;
  onSendMessage?: (item: ItemReport) => void;
}

export const MatchingModal: React.FC<MatchingModalProps> = ({
  lostItem,
  foundItem,
  isOpen,
  onClose,
  onProceedToClaim,
  onSendMessage,
}) => {
  // Escape key listener to dismiss modal
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

  if (!isOpen || !lostItem || !foundItem) return null;

  const match = evaluateMatch(lostItem, foundItem);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden my-auto max-h-[92vh] sm:max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header with Prominent Close Button */}
        <div className="sticky top-0 z-30 shrink-0 bg-gradient-to-r from-amber-800 via-amber-700 to-amber-900 text-white p-4 sm:p-6 pr-14 sm:pr-16 relative border-b border-amber-600/40">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white/90 hover:text-white rounded-full bg-white/10 hover:bg-white/25 active:scale-95 transition-all cursor-pointer ring-1 ring-white/20 shadow-sm"
            aria-label="Close match comparison"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-200 mb-1">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Campus Intelligent Matching Engine</span>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Possible Campus Match
              </h2>
              <p className="text-xs sm:text-sm text-amber-100/90 mt-0.5">
                Comparing reported lost item against campus found registry.
              </p>
            </div>

            {/* Score Ring */}
            <div className="flex items-center gap-2 bg-amber-950/60 backdrop-blur-xs px-3.5 py-1.5 rounded-2xl border border-amber-400/40 shadow-inner">
              <span className="text-2xl font-black text-amber-300">{match.matchScore}%</span>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-100">
                Match Score
              </span>
            </div>
          </div>
        </div>

        {/* Side-by-Side Comparison Container */}
        <div className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Left: Lost Report */}
            <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-rose-700 text-white">
                  Reported Lost
                </span>
                <span className="text-[11px] font-semibold text-rose-700">
                  By {lostItem.userName}
                </span>
              </div>

              <div className="aspect-16/10 rounded-xl bg-white border border-rose-200 overflow-hidden flex items-center justify-center">
                {lostItem.imageUrl || (lostItem.imageUrls && lostItem.imageUrls[0]) ? (
                  <img
                    src={lostItem.imageUrl || lostItem.imageUrls?.[0]}
                    alt={lostItem.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-3 text-slate-400">
                    <ImageIcon className="w-6 h-6 mb-1 text-slate-400" />
                    <span className="text-[10px] font-bold">No Photo Available</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm">{lostItem.title}</h4>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{lostItem.description}</p>
              </div>

              <div className="text-xs space-y-1 text-slate-600 pt-2 border-t border-rose-200">
                <p><strong>Category:</strong> {lostItem.category}</p>
                <p><strong>Color:</strong> {lostItem.color}</p>
                <p><strong>Location:</strong> {lostItem.locationBlock}</p>
                <p><strong>Time:</strong> {new Date(lostItem.dateTime).toLocaleDateString()} {new Date(lostItem.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {/* Right: Found Report */}
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-emerald-700 text-white">
                  Reported Found
                </span>
                <span className="text-[11px] font-semibold text-emerald-700">
                  By {foundItem.userName}
                </span>
              </div>

              <div className="aspect-16/10 rounded-xl bg-white border border-emerald-200 overflow-hidden flex items-center justify-center">
                {foundItem.imageUrl || (foundItem.imageUrls && foundItem.imageUrls[0]) ? (
                  <img
                    src={foundItem.imageUrl || foundItem.imageUrls?.[0]}
                    alt={foundItem.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-3 text-slate-400">
                    <ImageIcon className="w-6 h-6 mb-1 text-slate-400" />
                    <span className="text-[10px] font-bold">No Photo Available</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm">{foundItem.title}</h4>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{foundItem.description}</p>
              </div>

              <div className="text-xs space-y-1 text-slate-600 pt-2 border-t border-emerald-200">
                <p><strong>Category:</strong> {foundItem.category}</p>
                <p><strong>Color:</strong> {foundItem.color}</p>
                <p><strong>Location:</strong> {foundItem.locationBlock}</p>
                <p><strong>Time:</strong> {new Date(foundItem.dateTime).toLocaleDateString()} {new Date(foundItem.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </div>

          {/* Factors Breakdown Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-600">
              Matching Factors Analysis
            </div>

            <div className="divide-y divide-slate-100">
              {match.factors.map((factor, idx) => (
                <div key={idx} className="px-4 py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    {factor.matched ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold text-slate-800">{factor.label}</span>
                      <p className="text-slate-500 text-[11px] mt-0.5">{factor.detail}</p>
                    </div>
                  </div>

                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                    factor.matched ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {factor.matched ? `+${factor.weight} pts` : '0 pts'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-20 shrink-0 p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50/95 backdrop-blur-md flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Back to Details</span>
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {onSendMessage && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSendMessage(foundItem);
                }}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-full text-xs font-extrabold shadow-sm transition-all cursor-pointer active:scale-95"
                title="Ask finder questions about your belongings"
              >
                <MessageSquare className="w-4 h-4 text-emerald-200" />
                <span>Ask Finder (Chat)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onProceedToClaim(foundItem);
              }}
              className="flex items-center justify-center gap-2 px-7 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white rounded-full text-xs font-extrabold shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>This is My Item — Claim</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
