import React, { useEffect } from 'react';
import { ItemReport, ItemClaim } from '../types';
import { SahayakLogo } from './SahayakLogo';
import { 
  X, 
  Printer, 
  ShieldCheck, 
  QrCode, 
  Building2, 
  CheckCircle2, 
  Calendar, 
  UserCheck,
  ArrowLeft
} from 'lucide-react';

interface HandoverReceiptModalProps {
  claim: ItemClaim | null;
  item: ItemReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export const HandoverReceiptModal: React.FC<HandoverReceiptModalProps> = ({
  claim,
  item,
  isOpen,
  onClose,
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

  if (!isOpen || !claim || !item) return null;

  const receiptNumber = `CU-LF-${claim.id.slice(-6).toUpperCase()}`;
  const currentDate = new Date().toLocaleDateString('en-IN', {
    dateStyle: 'long',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden my-auto max-h-[92vh] sm:max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Actions Bar */}
        <div className="sticky top-0 z-30 shrink-0 bg-slate-950 text-white px-5 sm:px-6 py-3.5 flex items-center justify-between border-b border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Official Gate Pass &amp; Handover Certificate</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-extrabold transition-all cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Pass</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer ring-1 ring-white/15"
              aria-label="Close pass"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Certificate Paper */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 sm:p-8 space-y-6 text-slate-800 bg-white" id="printable-receipt">
          {/* Official CU Header */}
          <div className="border-b-2 border-red-900 pb-4 text-center">
            <div className="flex items-center justify-center gap-2.5 mb-1.5">
              <SahayakLogo className="w-9 h-9" />
              <h2 className="text-xl font-black text-red-900 tracking-tight">
                CHANDIGARH UNIVERSITY
              </h2>
            </div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Department of Campus Security &amp; Student Welfare
            </p>
            <p className="text-[11px] text-slate-500">
              NH-95, Chandigarh-Ludhiana Highway, Mohali, Punjab - 140413
            </p>
            <div className="mt-2 inline-block px-3 py-1 bg-red-50 border border-red-200 rounded text-[11px] font-extrabold text-red-900 uppercase tracking-widest">
              SAHAYAK — Property Handover Clearance Pass
            </div>
          </div>

          {/* Pass Meta */}
          <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-3">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Pass Reference No.</span>
              <strong className="text-slate-900 text-sm font-mono">{receiptNumber}</strong>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Issue Date</span>
              <span className="font-semibold text-slate-800">{currentDate}</span>
            </div>
          </div>

          {/* Item Specification */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
              <span>{item.title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
                STATUS: {claim.status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px]">
              <p><strong>Category:</strong> {item.category}</p>
              <p><strong>Color:</strong> {item.color}</p>
              <p><strong>Found At:</strong> {item.locationBlock}</p>
              <p><strong>Holding Location:</strong> {claim.pickupLocation || 'Main Security Gate 1'}</p>
            </div>
          </div>

          {/* Claimant Student Information */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-red-800" />
              <span>Verified Claimant / Owner Profile</span>
            </h4>
            <div className="grid grid-cols-2 gap-2 text-slate-700 text-[11px]">
              <p><strong>Name:</strong> {claim.claimantName}</p>
              <p><strong>Student UID / Roll:</strong> <span className="font-mono font-bold text-red-900">{claim.claimantUid}</span></p>
              <p><strong>Email:</strong> {claim.claimantEmail}</p>
              <p><strong>Phone:</strong> {claim.claimantPhone}</p>
            </div>
          </div>

          {/* QR Code & Authority Signatures */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-center text-slate-700">
                <QrCode className="w-10 h-10" />
              </div>
              <div className="text-[10px] text-slate-500 max-w-[150px] leading-tight">
                Scan at Security Desk for instant gate exit authorization.
              </div>
            </div>

            <div className="text-right text-xs">
              <div className="font-bold text-slate-900 text-sm">Satnam Singh</div>
              <div className="text-[10px] text-slate-500">Security Officer Incharge</div>
              <div className="text-[10px] font-semibold text-red-800">Campus Security Cell, CU</div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Back to Dashboard</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white rounded-full text-xs font-extrabold shadow-md shadow-rose-600/30 transition-all cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Pass</span>
          </button>
        </div>
      </div>
    </div>
  );
};
