import React, { useState, useId } from 'react';
import { useAuth } from '../context/AuthContext';
import { ItemReport, ItemClaim } from '../types';
import { saveClaim, uploadImageFile } from '../lib/storage';
import { 
  X, 
  ShieldCheck, 
  FileText, 
  Upload, 
  CheckCircle2, 
  HelpCircle, 
  AlertCircle,
  Building2,
  Lock,
  ArrowLeft
} from 'lucide-react';

interface ClaimModalProps {
  item: ItemReport | null;
  isOpen: boolean;
  onClose: () => void;
  onClaimSubmitted: (claim: ItemClaim) => void;
}

export const ClaimModal: React.FC<ClaimModalProps> = ({
  item,
  isOpen,
  onClose,
  onClaimSubmitted,
}) => {
  const { currentUser, openAuthModal } = useAuth();
  const [proofDescription, setProofDescription] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [secretAnswer, setSecretAnswer] = useState('');
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const proofInputId = useId();

  if (!isOpen || !item) return null;

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const dataUrl = await uploadImageFile(file);
      setProofImageUrl(dataUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to upload proof document.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal('login');
      return;
    }

    if (!proofDescription.trim()) {
      setError('Please provide detailed evidence or identifying marks describing your ownership.');
      return;
    }

    setSubmitting(true);
    try {
      const newClaim: ItemClaim = {
        id: `claim_${Date.now()}`,
        itemId: item.id,
        itemTitle: item.title,
        itemType: item.type,
        claimantId: currentUser.id,
        claimantName: currentUser.name,
        claimantEmail: currentUser.email,
        claimantPhone: currentUser.phone,
        claimantUid: currentUser.uidOrRoll,
        proofDescription: proofDescription.trim(),
        serialNumberOrIdentifier: serialNumber.trim() || undefined,
        secretAnswer: secretAnswer.trim() || undefined,
        proofImageUrl: proofImageUrl || undefined,
        additionalNotes: additionalNotes.trim() || undefined,
        status: 'pending',
        pickupLocation: item.currentHoldingLocation || 'Main Security Gate 1 Lost & Found Desk',
        createdAt: new Date().toISOString(),
      };

      saveClaim(newClaim);
      setSubmittedSuccess(true);
      setTimeout(() => {
        onClaimSubmitted(newClaim);
        onClose();
      }, 1800);
    } catch (err: any) {
      setError('Error submitting claim: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl glass-panel rounded-3xl shadow-2xl border border-white/80 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900 via-red-800 to-red-950 text-white p-5 sm:p-7 pr-16 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white/90 hover:text-white p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
            aria-label="Close claim dialog"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-200 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Ownership Verification Protocol</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Claim This Campus Belonging
          </h2>
          <p className="text-xs sm:text-sm text-red-100/90 mt-1">
            To prevent wrongful handovers, Chandigarh University security requires specific verification proofs before release.
          </p>
        </div>

        {/* Item Summary Card */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5 flex items-center gap-4">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
          />
          <div className="min-w-0 flex-1 text-xs">
            <span className="font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Found Item
            </span>
            <h4 className="text-sm font-bold text-slate-900 truncate mt-1">
              {item.title}
            </h4>
            <p className="text-slate-500 truncate mt-0.5">
              Found at {item.locationBlock} • {item.color}
            </p>
            {item.currentHoldingLocation && (
              <p className="text-slate-600 font-medium text-[11px] mt-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" />
                <span>Safely held at: {item.currentHoldingLocation}</span>
              </p>
            )}
          </div>
        </div>

        {submittedSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Claim Registered Successfully!</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              This item has been removed from the public campus dashboard. Your claim is now under review by campus security desk. Track its real-time custody status in your Student Dashboard.
            </p>
          </div>
        ) : (
        /* Form Body */
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Secret Question if set by finder */}
          {item.secretVerificationQuestion && (
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <Lock className="w-4 h-4 text-amber-700" />
                <span>Finder's Verification Challenge:</span>
              </div>
              <p className="text-xs text-amber-800 font-medium italic">
                "{item.secretVerificationQuestion}"
              </p>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Your Answer <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Provide your exact answer to prove this is yours..."
                  value={secretAnswer}
                  onChange={e => setSecretAnswer(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Ownership Proof Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Distinctive Ownership Marks &amp; Proof Details <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Describe unique marks, wallpapers, internal stickers, passwords pattern, specific files or contents only the true owner would know..."
              value={proofDescription}
              onChange={e => setProofDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
            />
          </div>

          {/* Serial Number / Identifier */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Serial Number, IMEI, or Roll Number (if printed on item)
            </label>
            <input
              type="text"
              placeholder="e.g. Serial CNBA982, or Roll 21BCS10482 written inside cover"
              value={serialNumber}
              onChange={e => setSerialNumber(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
            />
          </div>

          {/* Proof Photo Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Purchase Invoice, Bill, or Previous Photo (Optional)
            </label>
            <div className="flex items-center gap-3">
              <label
                htmlFor={proofInputId}
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-full text-xs font-bold text-slate-700 shadow-2xs hover:shadow-xs transition-all active:scale-95"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Upload Proof Photo / Bill</span>
              </label>
              <input
                id={proofInputId}
                type="file"
                accept="image/*"
                onChange={handleProofUpload}
                className="hidden"
              />
              {uploading && <span className="text-xs text-slate-500">Uploading...</span>}
              {proofImageUrl && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Proof attached
                </span>
              )}
            </div>
          </div>

          {/* Claimant Identity Confirmation */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Claimant Student Profile: </span>
            {currentUser?.name} ({currentUser?.uidOrRoll}) • {currentUser?.email} • {currentUser?.phone}
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Back to Item</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-7 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white rounded-full text-xs font-extrabold shadow-md shadow-rose-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{submitting ? 'Submitting Verification...' : 'Submit Claim Request'}</span>
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
