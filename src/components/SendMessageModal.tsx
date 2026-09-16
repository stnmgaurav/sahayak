import React, { useState, useId } from 'react';
import { useAuth } from '../context/AuthContext';
import { ItemReport, ItemMessage } from '../types';
import { saveMessage, uploadImageFile } from '../lib/storage';
import { 
  X, 
  Send, 
  MapPin, 
  Building2, 
  Phone, 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

interface SendMessageModalProps {
  item: ItemReport | null;
  isOpen: boolean;
  onClose: () => void;
  onMessageSent?: (msg: ItemMessage) => void;
}

export const SendMessageModal: React.FC<SendMessageModalProps> = ({
  item,
  isOpen,
  onClose,
  onMessageSent,
}) => {
  const { currentUser, isAuthenticated, openAuthModal } = useAuth();
  
  const [senderName, setSenderName] = useState(currentUser?.name || '');
  const [senderPhone, setSenderPhone] = useState(currentUser?.phone || '');
  const [senderUid, setSenderUid] = useState(currentUser?.uidOrRoll || '');
  const [currentFoundLocation, setCurrentFoundLocation] = useState('Campus Security Gate 1 Desk');
  const [messageText, setMessageText] = useState('');
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  const fileInputId = useId();

  if (!isOpen || !item) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const url = await uploadImageFile(file);
      setProofImageUrl(url);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      openAuthModal('login', 'Please sign in with your Chandigarh University ID to send a found notification to the owner.');
      return;
    }

    if (!messageText.trim()) {
      setError('Please enter a brief message describing where you found the item.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const newMsg: ItemMessage = {
        id: `msg_${Date.now()}`,
        itemId: item.id,
        itemTitle: item.title,
        itemType: item.type,
        senderId: currentUser?.id || 'guest',
        senderName: senderName.trim() || currentUser?.name || 'Campus Student',
        senderEmail: currentUser?.email || 'student@cuchd.in',
        senderPhone: senderPhone.trim() || currentUser?.phone || '',
        senderUid: senderUid.trim() || currentUser?.uidOrRoll || 'CU-STUDENT',
        recipientId: item.userId,
        recipientEmail: item.userEmail,
        recipientName: item.userName,
        messageText: messageText.trim(),
        currentFoundLocation: currentFoundLocation.trim(),
        proofImageUrl: proofImageUrl || undefined,
        status: 'unread',
        createdAt: new Date().toISOString(),
      };

      saveMessage(newMsg);

      if (onMessageSent) {
        onMessageSent(newMsg);
      }

      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl glass-panel rounded-3xl shadow-2xl border border-white/80 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-950 text-white p-5 sm:p-6 pr-14 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center text-white/80 hover:text-white rounded-full bg-black/20 hover:bg-black/40 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Campus Good Samaritan Helper</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Found This Item? Notify Owner
          </h2>
          <p className="text-xs text-emerald-100/90 mt-1">
            Send an instant notification to {item.userName} ({item.userUid || 'Student'}) with details on where you found it or where it is safely kept.
          </p>
        </div>

        {/* Item Summary Card */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-3.5">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
          />
          <div className="min-w-0 flex-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-red-100 text-red-800">
                Reported Lost
              </span>
              <span className="text-slate-400 text-[11px]">ID: #{item.id.slice(-6)}</span>
            </div>
            <h4 className="text-sm font-black text-slate-900 truncate mt-0.5">
              {item.title}
            </h4>
            <p className="text-slate-500 truncate text-[11px] flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-red-700" />
              <span>Reported lost at {item.locationBlock}</span>
            </p>
          </div>
        </div>

        {sentSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">Message Sent Successfully!</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              The owner has been notified with your contact details and holding location. Thank you for helping keep Chandigarh University safe!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[68vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Message Body */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Your Message to the Owner <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Hi! I found your belongings near the Block C3 cafeteria table. I have handed it over to the Security Desk at Gate 1."
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
              />
            </div>

            {/* Where is it deposited or kept */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Current Holding Location / Safe Custody Point</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Handed to Gate 1 Security Desk, or With me at Hostel 4"
                value={currentFoundLocation}
                onChange={e => setCurrentFoundLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
              />
            </div>

            {/* Finder Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Your Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Contact Phone / WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={senderPhone}
                  onChange={e => setSenderPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
                />
              </div>
            </div>

            {/* Photo Upload (Optional) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Photo of the Found Item (Optional)
              </label>
              <div className="flex items-center gap-3">
                <label
                  htmlFor={fileInputId}
                  className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Attach Photo</span>
                </label>
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                {uploading && <span className="text-xs text-slate-500">Uploading photo...</span>}
                {proofImageUrl && (
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Photo attached
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
                <span>Cancel</span>
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Sending Message...' : 'Send Message to Owner'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
