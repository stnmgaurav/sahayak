import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Building2, 
  Phone, 
  Mail, 
  Lock, 
  FileText, 
  Eye, 
  AlertCircle,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  Calendar,
  MessageSquare,
  Image as ImageIcon
} from 'lucide-react';
import { ItemClaim, ItemReport } from '../types';
import { CU_CAMPUS_LOCATIONS } from '../data/mockData';

interface ReviewClaimModalProps {
  claim: ItemClaim | null;
  item: ItemReport | null;
  isOpen: boolean;
  initialDecisionMode?: 'view' | 'accept' | 'reject' | 'proof';
  onClose: () => void;
  onAcceptClaim: (claimId: string, pickupLocation: string, adminNotes?: string) => void;
  onRejectClaim: (claimId: string, reason: string) => void;
  onOpenChatWithClaimant?: (itemId: string) => void;
}

export const ReviewClaimModal: React.FC<ReviewClaimModalProps> = ({
  claim,
  item,
  isOpen,
  initialDecisionMode = 'view',
  onClose,
  onAcceptClaim,
  onRejectClaim,
  onOpenChatWithClaimant,
}) => {
  const [decisionMode, setDecisionMode] = useState<'view' | 'accept' | 'reject'>(() => {
    if (initialDecisionMode === 'accept') return 'accept';
    if (initialDecisionMode === 'reject') return 'reject';
    return 'view';
  });
  const [pickupLocation, setPickupLocation] = useState(() => 
    claim?.pickupLocation || item?.currentHoldingLocation || 'Main Security Gate 1 (NH-95 Entrance)'
  );
  const [customLocation, setCustomLocation] = useState('');
  const [acceptNotes, setAcceptNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('Details provided do not match distinctive marks of the item.');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [showFullProofImage, setShowFullProofImage] = useState(initialDecisionMode === 'proof');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [actionDone, setActionDone] = useState<'accepted' | 'rejected' | null>(null);

  // Sync mode whenever opened with a specific initialDecisionMode
  useEffect(() => {
    if (isOpen) {
      if (initialDecisionMode === 'accept') {
        setDecisionMode('accept');
        setShowFullProofImage(false);
      } else if (initialDecisionMode === 'reject') {
        setDecisionMode('reject');
        setShowFullProofImage(false);
      } else if (initialDecisionMode === 'proof') {
        setDecisionMode('view');
        setShowFullProofImage(true);
      } else {
        setDecisionMode('view');
        setShowFullProofImage(false);
      }
      setActionDone(null);
    }
  }, [isOpen, initialDecisionMode]);

  // Escape key listener to dismiss modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showFullProofImage) {
          setShowFullProofImage(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showFullProofImage, onClose]);

  if (!isOpen || !claim) return null;

  const targetPickup = customLocation.trim() || pickupLocation;

  const handleConfirmAccept = () => {
    onAcceptClaim(claim.id, targetPickup, acceptNotes.trim() || undefined);
    setActionDone('accepted');
    setTimeout(() => {
      setActionDone(null);
      setDecisionMode('view');
      onClose();
    }, 1600);
  };

  const handleConfirmReject = () => {
    const finalReason = customRejectReason.trim() || rejectReason;
    onRejectClaim(claim.id, finalReason);
    setActionDone('rejected');
    setTimeout(() => {
      setActionDone(null);
      setDecisionMode('view');
      onClose();
    }, 1600);
  };

  const handleCopyPhone = () => {
    if (claim.claimantPhone) {
      navigator.clipboard.writeText(claim.claimantPhone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9995] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-claim-title"
    >
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden my-auto flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header with Prominent Close Button */}
        <div className="sticky top-0 z-30 bg-gradient-to-r from-red-800 via-red-900 to-slate-900 text-white p-4 sm:p-6 pr-14 relative shrink-0 border-b border-red-800/40">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white/90 hover:text-white rounded-full bg-white/10 hover:bg-white/25 active:scale-95 transition-all cursor-pointer ring-1 ring-white/20 shadow-sm"
            aria-label="Close review dialog"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-200 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Ownership Claim Verification</span>
          </div>

          <h2 id="review-claim-title" className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Review Claim for "{claim.itemTitle}"</span>
          </h2>
          <p className="text-xs text-red-100/90 mt-1">
            Verify the student's submitted evidence, secret challenge answer, and proof photo before approving handover.
          </p>
        </div>

        {/* Action Done Feedback Banner */}
        {actionDone && (
          <div className={`p-4 text-center text-xs font-extrabold flex items-center justify-center gap-2 ${
            actionDone === 'accepted' 
              ? 'bg-emerald-600 text-white animate-in slide-in-from-top' 
              : 'bg-rose-600 text-white animate-in slide-in-from-top'
          }`}>
            {actionDone === 'accepted' ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                <span>Handover Approved! Notification dispatched to {claim.claimantName}.</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-rose-200" />
                <span>Claim Rejected. Listing returned to active campus found registry.</span>
              </>
            )}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Status Header Badge */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Claim Status:
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide border ${
                claim.status === 'verified'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : claim.status === 'rejected'
                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                  : claim.status === 'returned'
                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
              }`}>
                {claim.status === 'verified' ? 'Approved & Ready for Handover' : claim.status === 'rejected' ? 'Rejected' : claim.status === 'returned' ? 'Handover Completed' : 'Pending Finder Review'}
              </span>
            </div>

            <span className="text-[11px] text-slate-500 font-mono">
              ID: {claim.id}
            </span>
          </div>

          {/* 1. Item Quick Info */}
          {item && (
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center gap-3.5">
              {(item.imageUrl || (item.imageUrls && item.imageUrls[0])) ? (
                <img
                  src={item.imageUrl || item.imageUrls?.[0]}
                  alt={item.title}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Your Found Listing
                </span>
                <h4 className="text-sm font-extrabold text-slate-900 truncate mt-1">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  Found at: {item.locationBlock} • {item.color}
                </p>
                {item.currentHoldingLocation && (
                  <p className="text-[11px] text-slate-600 font-medium mt-0.5 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    <span>Current spot: {item.currentHoldingLocation}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 2. Claimant Student Profile */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Claimant Profile &amp; Contact
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                CU Verified Student
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div>
                <h3 className="text-base font-extrabold text-slate-950">
                  {claim.claimantName}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  UID / Roll: <strong className="text-slate-900">{claim.claimantUid}</strong>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Email: {claim.claimantEmail}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {claim.claimantPhone && (
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Click to copy mobile number"
                  >
                    <Phone className="w-3 h-3 text-slate-500" />
                    <span>{claim.claimantPhone}</span>
                    {copiedPhone ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                )}

                {item && onOpenChatWithClaimant && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenChatWithClaimant(item.id);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-slate-900 hover:bg-black transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3 text-slate-300" />
                    <span>Chat</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3. Submitted Ownership Evidence */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block">
              Submitted Verification Evidence
            </span>

            {/* Evidence Description */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Distinctive Marks &amp; Content Description:
              </label>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium">
                "{claim.proofDescription}"
              </div>
            </div>

            {/* Secret Verification Challenge (if any) */}
            {item?.secretVerificationQuestion && (
              <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Your Secret Challenge Question:</span>
                </div>
                <p className="text-xs text-amber-800 italic font-medium">
                  "{item.secretVerificationQuestion}"
                </p>
                <div className="pt-1">
                  <span className="text-[11px] font-bold text-slate-700">Claimant's Provided Answer:</span>
                  <div className="mt-1 p-2 bg-white rounded-lg border border-amber-300 font-mono text-xs font-bold text-slate-900">
                    {claim.secretAnswer || <span className="text-rose-500 font-normal italic">No answer provided</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Serial Number / IMEI */}
            {claim.serialNumberOrIdentifier && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Serial Number / Device Identifier:
                </label>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-mono font-bold text-slate-900 border border-slate-200">
                  <span>{claim.serialNumberOrIdentifier}</span>
                </div>
              </div>
            )}

            {/* Proof Document / Photo */}
            {claim.proofImageUrl && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Attached Invoice / Photo Proof:
                </label>
                <div className="flex items-start gap-3">
                  <div 
                    onClick={() => setShowFullProofImage(true)}
                    className="relative group cursor-pointer rounded-xl overflow-hidden border border-slate-300 shadow-2xs hover:shadow-md transition-shadow"
                  >
                    <img
                      src={claim.proofImageUrl}
                      alt="Claim verification proof"
                      className="w-24 h-24 sm:w-28 sm:h-28 object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                      <Eye className="w-4 h-4 mr-1" /> View Full
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1 pt-1">
                    <p className="font-semibold text-slate-800">Proof photo provided by claimant.</p>
                    <p>Click image thumbnail to inspect details full-screen.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Decision Actions Panel */}
          {claim.status === 'pending' && decisionMode === 'view' && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100/80 border border-slate-200 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                Finder Action: Handover Decision
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                If the details match, accept the claim and specify where you will meet or handover the belonging. If they do not match, reject the request so the item stays in the campus registry.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setDecisionMode('accept')}
                  className="flex-1 min-w-[140px] px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-full text-xs font-extrabold shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accept Handover</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDecisionMode('reject')}
                  className="flex-1 min-w-[140px] px-5 py-2.5 bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 rounded-full text-xs font-extrabold active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Reject Claim</span>
                </button>
              </div>
            </div>
          )}

          {/* Accept Handover Form */}
          {decisionMode === 'accept' && (
            <div className="p-4.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-950 uppercase tracking-wide">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Confirm Handover &amp; Set Pickup Point</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 block">
                  Designated Campus Handover Point <span className="text-red-600">*</span>
                </label>
                <select
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Main Security Gate 1 (NH-95 Entrance)">Main Security Gate 1 (NH-95 Entrance)</option>
                  <option value="Central Library (Circulation Desk)">Central Library (Circulation Desk)</option>
                  <option value="Student Welfare Center (Block C3)">Student Welfare Center (Block C3)</option>
                  <option value="Academic Block 1 (A1 - Computer Science & Engg)">Academic Block 1 (A1)</option>
                  <option value="Security Gate 2 (Hostel Entrance)">Security Gate 2 (Hostel Entrance)</option>
                  <option value="Custom Spot">Custom Location / Direct Handover...</option>
                </select>

                {pickupLocation === 'Custom Spot' && (
                  <input
                    type="text"
                    required
                    placeholder="Enter specific campus spot (e.g. Block B2 Food Court at 4 PM)..."
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 block">
                  Instructions / Notes for Claimant (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Bring your physical CU student ID card for identity match upon pickup..."
                  value={acceptNotes}
                  onChange={(e) => setAcceptNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDecisionMode('view')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white rounded-full border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAccept}
                  className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-full text-xs font-extrabold shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Handover &amp; Release</span>
                </button>
              </div>
            </div>
          )}

          {/* Reject Claim Form */}
          {decisionMode === 'reject' && (
            <div className="p-4.5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-extrabold text-rose-950 uppercase tracking-wide">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Reject Ownership Claim</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 block">
                  Reason for Rejection <span className="text-red-600">*</span>
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Details provided do not match distinctive marks of the item.">Details provided do not match distinctive marks of the item.</option>
                  <option value="Secret verification challenge answer was incorrect.">Secret verification challenge answer was incorrect.</option>
                  <option value="Serial number / IMEI does not match item hardware.">Serial number / IMEI does not match item hardware.</option>
                  <option value="Proof photo or invoice does not belong to this item model.">Proof photo or invoice does not belong to this item model.</option>
                  <option value="Custom Reason">Custom explanation...</option>
                </select>

                {rejectReason === 'Custom Reason' && (
                  <textarea
                    rows={2}
                    required
                    placeholder="Provide specific details why the claim was not approved..."
                    value={customRejectReason}
                    onChange={(e) => setCustomRejectReason(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDecisionMode('view')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white rounded-full border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-extrabold shadow-md shadow-rose-600/25 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </div>
          )}

          {/* Already Verified Notice */}
          {claim.status === 'verified' && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
              <span className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Handover Approved &amp; Scheduled</span>
              </span>
              <p className="text-emerald-800">
                You accepted this claim. The owner has been notified to collect the item at: <strong>{claim.pickupLocation || 'Main Security Gate 1 Desk'}</strong>.
              </p>
            </div>
          )}

          {/* Already Rejected Notice */}
          {claim.status === 'rejected' && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-1">
              <span className="font-extrabold text-rose-950 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Claim Marked Rejected</span>
              </span>
              <p className="text-rose-800">
                {claim.rejectionReason || 'Verification proofs did not match item specifications.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Chandigarh University SAHAYAK Registry</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-full font-bold transition-all cursor-pointer active:scale-95"
          >
            Close
          </button>
        </div>
      </div>

      {/* Full Proof Image Modal Overlay */}
      {showFullProofImage && claim.proofImageUrl && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setShowFullProofImage(false)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl p-2 overflow-hidden shadow-2xl">
            <button
              type="button"
              onClick={() => setShowFullProofImage(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={claim.proofImageUrl}
              alt="Full size proof"
              className="max-h-[82vh] w-auto mx-auto object-contain rounded-xl"
            />
            <p className="text-center text-xs text-slate-500 font-medium py-2">
              Claim verification document submitted by {claim.claimantName}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
