import React from 'react';
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
  ArrowLeft
} from 'lucide-react';

interface MatchingModalProps {
  lostItem: ItemReport | null;
  foundItem: ItemReport | null;
  isOpen: boolean;
  onClose: () => void;
  onProceedToClaim: (foundItem: ItemReport) => void;
}

export const MatchingModal: React.FC<MatchingModalProps> = ({
  lostItem,
  foundItem,
  isOpen,
  onClose,
  onProceedToClaim,
}) => {
  if (!isOpen || !lostItem || !foundItem) return null;

  const match = evaluateMatch(lostItem, foundItem);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl glass-panel rounded-3xl shadow-2xl border border-white/80 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-800 via-amber-700 to-amber-900 text-white p-5 sm:p-7 pr-16 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white/90 hover:text-white p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
            aria-label="Close match comparison"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-200 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Campus Intelligent Matching Engine</span>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                Possible Campus Match
              </h2>
              <p className="text-xs sm:text-sm text-amber-100/90 mt-0.5">
                Comparing reported lost item against campus found registry.
              </p>
            </div>

            {/* Score Ring */}
            <div className="flex items-center gap-2 bg-amber-950/50 backdrop-blur-xs px-4 py-2 rounded-2xl border border-amber-400/30 shadow-inner">
              <span className="text-2xl font-black">{match.matchScore}%</span>
              <span className="text-[11px] uppercase tracking-wider font-bold text-amber-200">
                Match Score
              </span>
            </div>
          </div>
        </div>

        {/* Side-by-Side Comparison Container */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
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

              <div className="aspect-16/10 rounded-xl bg-white border border-rose-200 overflow-hidden">
                <img
                  src={lostItem.imageUrl}
                  alt={lostItem.title}
                  className="w-full h-full object-cover"
                />
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

              <div className="aspect-16/10 rounded-xl bg-white border border-emerald-200 overflow-hidden">
                <img
                  src={foundItem.imageUrl}
                  alt={foundItem.title}
                  className="w-full h-full object-cover"
                />
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

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-200/70 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Back to Details</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onProceedToClaim(foundItem);
            }}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>This is My Item — Claim &amp; Verify</span>
          </button>
        </div>
      </div>
    </div>
  );
};
