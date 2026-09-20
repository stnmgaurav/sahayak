import React, { useState, useEffect, useRef, useId } from 'react';
import { useAuth } from '../context/AuthContext';
import { ItemReport, ItemMessage } from '../types';
import { 
  saveMessage, 
  uploadImageFile, 
  getItemMessages, 
  markMessageAsRead,
  subscribeToStorage 
} from '../lib/storage';
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
  User,
  Clock,
  Image as ImageIcon,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';

interface SendMessageModalProps {
  item: ItemReport | null;
  isOpen: boolean;
  onClose: () => void;
  onMessageSent?: (msg: ItemMessage) => void;
  recipientUser?: {
    id?: string;
    email?: string;
    name?: string;
  } | null;
}

const QUICK_SUGGESTIONS = [
  'I found your item near the campus cafeteria.',
  'I have safely deposited it at Security Gate 1 Desk.',
  'Can we meet at the Academic Block to return this?',
  'Thank you so much! On my way to collect it.',
  'Is this item still available at the security desk?',
];

export const SendMessageModal: React.FC<SendMessageModalProps> = ({
  item,
  isOpen,
  onClose,
  onMessageSent,
  recipientUser,
}) => {
  const { currentUser, isAuthenticated, openAuthModal } = useAuth();
  
  const [messages, setMessages] = useState<ItemMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [currentFoundLocation, setCurrentFoundLocation] = useState('Campus Security Gate 1 Desk');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);

  const fileInputId = useId();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load and refresh messages for this item
  useEffect(() => {
    if (!isOpen || !item) return;

    const refreshThread = () => {
      const thread = getItemMessages(item.id);
      setMessages(thread);

      // Automatically mark incoming messages addressed to current user as read
      if (currentUser) {
        thread.forEach(msg => {
          const isForMe = 
            msg.recipientId === currentUser.id || 
            (currentUser.email && msg.recipientEmail && currentUser.email.toLowerCase() === msg.recipientEmail.toLowerCase()) ||
            (!msg.recipientId && msg.senderId !== currentUser.id && item.userId === currentUser.id);
          
          if (isForMe && msg.status === 'unread') {
            markMessageAsRead(msg.id);
          }
        });
      }
    };

    refreshThread();
    const unsubscribe = subscribeToStorage(refreshThread);
    return unsubscribe;
  }, [isOpen, item, currentUser]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen || !item) return null;

  // Determine who the other party is
  const isOwner = currentUser && (
    currentUser.id === item.userId || 
    (currentUser.email && item.userEmail && currentUser.email.toLowerCase() === item.userEmail.toLowerCase())
  );

  const chatPartnerName = recipientUser?.name || (isOwner ? 'Finder / Claimant' : (item.userName || 'Item Owner'));

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const url = await uploadImageFile(file);
      setProofImageUrl(url);
    } catch (err: any) {
      setError(err?.message || 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      openAuthModal('login', 'Please sign in with your Chandigarh University ID to chat with the reporter.');
      return;
    }

    if (!messageText.trim()) {
      setError('Please type a message before sending.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Determine recipient details
      let targetRecipientId = recipientUser?.id;
      let targetRecipientEmail = recipientUser?.email;
      let targetRecipientName = recipientUser?.name;

      if (!targetRecipientId) {
        if (isOwner) {
          // If current user is the owner, reply to the latest other sender in the thread
          const latestOther = [...messages].reverse().find(m => 
            m.senderId !== currentUser?.id && 
            (!currentUser?.email || m.senderEmail?.toLowerCase() !== currentUser.email.toLowerCase())
          );
          if (latestOther) {
            targetRecipientId = latestOther.senderId;
            targetRecipientEmail = latestOther.senderEmail;
            targetRecipientName = latestOther.senderName;
          }
        } else {
          // If current user is a peer/finder, message the item owner
          targetRecipientId = item.userId;
          targetRecipientEmail = item.userEmail;
          targetRecipientName = item.userName;
        }
      }

      const newMsg: ItemMessage = {
        id: `msg_${Date.now()}`,
        itemId: item.id,
        itemTitle: item.title,
        itemType: item.type,
        senderId: currentUser?.id || 'guest',
        senderName: currentUser?.name || 'Campus Student',
        senderEmail: currentUser?.email || 'student@cuchd.in',
        senderPhone: currentUser?.phone || '',
        senderUid: currentUser?.uidOrRoll || 'CU-STUDENT',
        senderRole: currentUser?.role || 'student',
        recipientId: targetRecipientId,
        recipientEmail: targetRecipientEmail,
        recipientName: targetRecipientName,
        messageText: messageText.trim(),
        currentFoundLocation: showLocationInput && currentFoundLocation.trim() ? currentFoundLocation.trim() : undefined,
        proofImageUrl: proofImageUrl || undefined,
        status: 'unread',
        createdAt: new Date().toISOString(),
      };

      saveMessage(newMsg);

      if (onMessageSent) {
        onMessageSent(newMsg);
      }

      // Reset form input
      setMessageText('');
      setProofImageUrl('');
      setShowPhotoInput(false);
      setShowLocationInput(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-2.5 sm:p-4 overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col h-[90vh] max-h-[720px]"
        onClick={e => e.stopPropagation()}
      >
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-950 text-white p-4 sm:p-5 pr-14 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Campus In-App Item Chat</span>
            </span>
            <span className="text-[10px] text-emerald-200/80">
              • Direct 2-Way Messenger
            </span>
          </div>

          <div className="flex items-center gap-3">
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-12 h-12 rounded-xl object-cover border border-white/20 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  {item.title}
                </h3>
                <span className={`px-2 py-0.2 rounded text-[9px] font-extrabold uppercase shrink-0 ${
                  item.type === 'lost' ? 'bg-red-500/30 text-red-200 border border-red-400/30' : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                }`}>
                  {item.type}
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 truncate flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{item.locationBlock}</span>
                <span>•</span>
                <span>Chatting with {chatPartnerName}</span>
              </p>
            </div>
          </div>
        </div>

        {/* CHAT TRANSCRIPT CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/60">
          
          {/* Item Context Banner */}
          <div className="p-3 bg-white/90 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-slate-600 truncate">
                Official Chandigarh University Lost &amp; Found thread. Always arrange handover at campus security gates or staffed help desks.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 shrink-0">
              ID: #{item.id.slice(-6).toUpperCase()}
            </span>
          </div>

          {messages.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Start the Discussion</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                {isOwner
                  ? 'No messages yet for your lost item. When someone finds it or asks for confirmation, their messages will arrive here.'
                  : `Have you found this item or do you have custody of it? Send a message to ${item.userName} with safe handover instructions.`}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isFromMe = currentUser && (
                msg.senderId === currentUser.id || 
                (currentUser.email && msg.senderEmail && currentUser.email.toLowerCase() === msg.senderEmail.toLowerCase())
              );

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isFromMe ? 'items-end' : 'items-start'}`}
                >
                  {/* Sender metadata bar */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1 px-1">
                    <span className="font-bold text-slate-700">
                      {isFromMe ? 'You' : msg.senderName}
                    </span>
                    {msg.senderUid && (
                      <span className="font-mono text-[10px] text-slate-400">
                        ({msg.senderUid})
                      </span>
                    )}
                    <span>•</span>
                    <span className="text-[10px]">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Speech Bubble */}
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] p-3.5 sm:p-4 rounded-2xl space-y-2 shadow-xs ${
                      isFromMe
                        ? 'bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-tr-xs'
                        : 'bg-white border border-slate-200 text-slate-900 rounded-tl-xs'
                    }`}
                  >
                    <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                      {msg.messageText}
                    </p>

                    {/* Holding / Safe custody location tag */}
                    {msg.currentFoundLocation && (
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                        isFromMe ? 'bg-white/20 text-emerald-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Holding Spot: {msg.currentFoundLocation}</span>
                      </div>
                    )}

                    {/* Verification photo if provided */}
                    {msg.proofImageUrl && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedPhotoPreview(msg.proofImageUrl || null)}
                          className="block group relative overflow-hidden rounded-xl border border-white/20"
                        >
                          <img
                            src={msg.proofImageUrl}
                            alt="Finder verification proof"
                            className="w-40 h-32 object-cover rounded-xl group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white rounded text-[9px] font-bold">
                            View Full Photo
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Contact details for non-hidden phone */}
                    {!isFromMe && msg.senderPhone && (
                      <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-slate-500">Contact Number:</span>
                        <a
                          href={`tel:${msg.senderPhone}`}
                          className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{msg.senderPhone}</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* QUICK SUGGESTIONS CAROUSEL */}
        <div className="px-4 py-2.5 bg-slate-50/90 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none no-scrollbar shrink-0">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Quick:
          </span>
          {QUICK_SUGGESTIONS.map((text, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setMessageText(text)}
              className="px-3 py-1.5 rounded-full bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200/90 hover:border-emerald-300 text-xs font-semibold whitespace-nowrap transition-all shrink-0 shadow-2xs cursor-pointer active:scale-95"
            >
              {text}
            </button>
          ))}
        </div>

        {/* COMPOSER / INPUT BAR */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0 space-y-2.5">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Optional Attachments Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowLocationInput(!showLocationInput)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer active:scale-95 ${
                  showLocationInput 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>{showLocationInput ? 'Custody Point Added' : '+ Add Custody Spot'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPhotoInput(!showPhotoInput)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer active:scale-95 ${
                  proofImageUrl || showPhotoInput
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                <span>{proofImageUrl ? 'Photo Attached' : '+ Attach Snapshot'}</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-400 font-medium">
              Press Send to reply instantly
            </span>
          </div>

          {/* Expandable Location Input */}
          {showLocationInput && (
            <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-2 animate-in fade-in">
              <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <input
                type="text"
                value={currentFoundLocation}
                onChange={e => setCurrentFoundLocation(e.target.value)}
                placeholder="e.g. Main Gate 1 Security Desk or Block B Reception"
                className="w-full bg-transparent text-xs font-semibold focus:outline-none"
              />
            </div>
          )}

          {/* Expandable Photo Uploader */}
          {showPhotoInput && (
            <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <label
                  htmlFor={fileInputId}
                  className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-full text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Choose Photo</span>
                </label>
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                {uploading && <span className="text-xs text-slate-500">Uploading snapshot...</span>}
                {proofImageUrl && (
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Snapshot attached
                  </span>
                )}
              </div>
              {proofImageUrl && (
                <button
                  type="button"
                  onClick={() => setProofImageUrl('')}
                  className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
          )}

          {/* Message Form */}
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                rows={2}
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder={
                  isAuthenticated
                    ? `Reply to ${chatPartnerName}...`
                    : 'Sign in to send a message...'
                }
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none transition-all shadow-inner font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !messageText.trim()}
              className="h-11 px-6 bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-700 hover:from-emerald-400 hover:via-teal-500 hover:to-emerald-600 active:scale-95 text-white rounded-full text-xs font-extrabold transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Full Photo Modal */}
      {selectedPhotoPreview && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          onClick={() => setSelectedPhotoPreview(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl">
            <button
              onClick={() => setSelectedPhotoPreview(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              aria-label="Close photo preview"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedPhotoPreview}
              alt="Finder proof full size"
              className="max-h-[80vh] w-auto rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
