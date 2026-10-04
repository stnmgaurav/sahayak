import React, { useState, useEffect, useId } from 'react';
import { useAuth } from '../context/AuthContext';
import { ItemReport, ItemClaim } from '../types';
import { saveClaim, uploadImageFile } from '../lib/storage';
import { deliverBrowserNotification } from '../lib/notifications';
import { routeClaimNotificationToFinder } from '../lib/notificationStore';
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
  ArrowLeft,
  Phone,
  Mail,
  User,
  Trash2,
  Image as ImageIcon
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
  
  // Verification contact info
  const [contactPhone, setContactPhone] = useState(currentUser?.phone || '');
  const [contactUid, setContactUid] = useState(currentUser?.uidOrRoll || '');
  const [contactEmail, setContactEmail] = useState(currentUser?.email || '');

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    if (currentUser) {
      if (!contactPhone && currentUser.phone) setContactPhone(currentUser.phone);
      if (!contactUid && currentUser.uidOrRoll) setContactUid(currentUser.uidOrRoll);
      if (!contactEmail && currentUser.email) setContactEmail(currentUser.email);
    }
  }, [currentUser]);

  const proofInputId = useId();

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

    if (!contactPhone.trim() && !currentUser.phone) {
      setError('Please enter your contact mobile number so the finder can coordinate handover.');
      return;
    }

    setSubmitting(true);
    try {
      const finderId = item.userId;
      const finderEmail = item.userEmail;
      const finderName = item.userName;

      const newClaim: ItemClaim = {
        id: `claim_${Date.now()}`,
        itemId: item.id,
        itemTitle: item.title,
        itemType: item.type,
        claimantId: currentUser.id,
        claimantName: currentUser.name,
        claimantEmail: contactEmail.trim() || currentUser.email,
        claimantPhone: contactPhone.trim() || currentUser.phone,
        claimantUid: contactUid.trim() || currentUser.uidOrRoll,
        finderId,
        finderEmail,
        finderName,
        proofDescription: proofDescription.trim(),
        serialNumberOrIdentifier: serialNumber.trim() || undefined,
        secretAnswer: secretAnswer.trim() || undefined,
        proofImageUrl: proofImageUrl || undefined,
        additionalNotes: additionalNotes.trim() || undefined,
        status: 'pending',
        pickupLocation: item.currentHoldingLocation || 'Main Security Gate 1 Lost & Found Desk',
        createdAt: new Date().toISOString(),
      };

      // 1. Save claim in central storage and update item status
      saveClaim(newClaim);

      // 2. Automatically route the claim details notification to the finder's Notification Panel
      routeClaimNotificationToFinder(newClaim, item);

      // 3. Dispatch browser push alert to finder
      deliverBrowserNotification({
        title: `🚨 New Ownership Claim: "${item.title}"`,
        body: `${currentUser.name} (${contactUid.trim() || currentUser.uidOrRoll}) submitted proof: "${proofDescription.slice(0, 80)}...". Click to review and accept/reject handover.`,
        icon: item.imageUrl || '/logo.svg',
        itemId: item.id,
        tag: `sahayak-claim-${newClaim.id}`,
        onClick: () => {
          window.focus();
          window.dispatchEvent(
            new CustomEvent('sahayak:review_claim', {
              detail: { claimId: newClaim.id, itemId: item.id },
            })
          );
        },
      });

      // 4. Dispatch custom event for real-time reactivity across active tabs
      window.dispatchEvent(
        new CustomEvent('sahayak:new_claim', {
          detail: { claim: newClaim, item },
        })
      );

      setSubmittedSuccess(true);
      setTimeout(() => {
        onClaimSubmitted(newClaim);
        onClose();
      }, 2000);
    } catch (err: any) {
      setError('Error submitting claim: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden my-auto max-h-[92vh] sm:max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header with Prominent Close Button */}
        <div className="sticky top-0 z-30 shrink-0 bg-gradient-to-r from-red-900 via-rose-900 to-red-950 text-white p-4 sm:p-6 pr-14 sm:pr-16 relative border-b border-red-800/40">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white/90 hover:text-white rounded-full bg-white/10 hover:bg-white/25 active:scale-95 transition-all cursor-pointer ring-1 ring-white/20 shadow-sm"
            aria-label="Close claim dialog"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-200 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Ownership Verification Protocol</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Claim This Campus Belonging
          </h2>
          <p className="text-xs sm:text-sm text-red-100/90 mt-1">
            To prevent wrongful handovers, Chandigarh University security requires specific verification proofs before release.
          </p>
        </div>

        {/* Item Summary Card */}
        <div className="bg-slate-50/90 border-b border-slate-200 p-3.5 sm:p-4 flex items-center gap-3.5 shrink-0">
          {(item.imageUrl || (item.imageUrls && item.imageUrls[0])) ? (
            <img
              src={item.imageUrl || item.imageUrls?.[0]}
              alt={item.title}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
              <ImageIcon className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0 flex-1 text-xs">
            <span className="font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
              Found Item
            </span>
            <h4 className="text-sm font-extrabold text-slate-900 truncate mt-1">
              {item.title}
            </h4>
            <p className="text-slate-500 font-medium truncate mt-0.5">
              Found at {item.locationBlock} • {item.color}
            </p>
            {item.currentHoldingLocation && (
              <p className="text-slate-600 font-semibold text-[11px] mt-1 flex items-center gap-1 truncate">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Held at: {item.currentHoldingLocation}</span>
              </p>
            )}
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

        {submittedSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-md border border-emerald-200">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-slate-900">Claim Details Routed to Finder!</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Your verification proof, distinctive marks description, and contact details have been automatically routed to <strong className="text-slate-900">{item.userName}</strong>'s Notification Panel.
              </p>
            </div>

            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl max-w-md mx-auto text-left text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-950">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Next Handover Steps:</span>
              </div>
              <ul className="text-emerald-900/90 space-y-1 list-disc list-inside text-[11px] leading-relaxed">
                <li>Finder will review your submitted evidence and photo proof</li>
                <li>Upon approval, you'll receive a handover alert with the exact campus pickup desk</li>
                <li>Track your claim status live under <strong className="text-emerald-950">Student Dashboard &gt; My Claims</strong></li>
              </ul>
            </div>
          </div>
        ) : (
        /* Form Body */
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Finder Routing Notice */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-red-700 shrink-0" />
              <span>
                Routing to Finder: <strong className="text-slate-900">{item.userName}</strong>
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              Direct Notification
            </span>
          </div>

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
              Distinctive Ownership Marks &amp; Content Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Describe unique marks, wallpapers, internal stickers, password patterns, or contents only the true owner would know..."
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
              Purchase Invoice, Bill, or Previous Photo Proof (Optional)
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <label
                  htmlFor={proofInputId}
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-full text-xs font-bold text-slate-700 shadow-2xs hover:shadow-xs transition-all active:scale-95"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>{proofImageUrl ? 'Change Proof Photo' : 'Upload Proof Photo / Bill'}</span>
                </label>
                <input
                  id={proofInputId}
                  type="file"
                  accept="image/*"
                  onChange={handleProofUpload}
                  className="hidden"
                />
                {uploading && <span className="text-xs text-slate-500">Uploading...</span>}
              </div>

              {proofImageUrl && (
                <div className="relative inline-flex items-center gap-2.5 p-2 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                  <img
                    src={proofImageUrl}
                    alt="Proof preview"
                    className="w-12 h-12 rounded-lg object-cover border border-emerald-300"
                  />
                  <div className="text-xs text-emerald-950 font-medium pr-7">
                    <span className="font-bold block">Proof Document Attached</span>
                    <span className="text-[11px] text-emerald-700">Will be routed to finder</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProofImageUrl('')}
                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                    title="Remove proof photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Claimant Contact Information */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
              Claimant Contact Details for Handover Coordination
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Contact Mobile / WhatsApp <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 9878XXXXXX"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  CU Student UID / Roll Number
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. 21BCS10482"
                    value={contactUid}
                    onChange={e => setContactUid(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-red-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Student Email
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  placeholder="student@cuchd.in"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-red-600 focus:outline-none"
                />
              </div>
            </div>
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
    </div>
  );
};
