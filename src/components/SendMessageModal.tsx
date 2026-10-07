import React, { useState, useEffect, useRef, useId, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ItemReport, ItemMessage } from '../types';
import { 
  saveMessage, 
  uploadImageFile, 
  getItemMessages, 
  markMessageAsRead,
  subscribeToStorage,
  getStoredUsers,
  getItemInquiriesForPoster,
  getItemThreadId,
  ItemInquiryThread
} from '../lib/storage';
import { DEMO_USERS } from '../data/mockData';
import { 
  Send, 
  MapPin, 
  Building2, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  Sparkles, 
  Clock, 
  Image as ImageIcon, 
  ShieldCheck, 
  ArrowLeft, 
  Copy, 
  Check, 
  CheckCheck,
  ThumbsUp, 
  Heart, 
  HandHeart,
  Maximize2, 
  ChevronRight, 
  User, 
  Users, 
  Lock, 
  Mail, 
  Phone,
  EyeOff,
  X, 
  ExternalLink,
  PanelRightClose,
  PanelRightOpen
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
    phone?: string;
    uid?: string;
    role?: string;
    avatarUrl?: string;
  } | null;
  initialThreadId?: string;
  onViewItemDetails?: (item: ItemReport) => void;
}

const QUICK_SUGGESTIONS_LOST = [
  'I have safely deposited this at Gate 1 Security Desk 🛡️',
  'Can we meet near Academic Block A1 to return this? 🤝',
  'I spotted this near the Student Center 📍',
  'I left it with the Central Library D6 circulation desk 📚',
  'Can you verify the color or any markings? 🏷️',
];

const QUICK_SUGGESTIONS_FOUND = [
  'Is this item still with you? 🔍',
  'Does it have any specific identification marks? 🏷️',
  'I lost a similar item, could you describe it further? ❓',
  'Can we meet near Academic Block A1 to verify? 🤝',
  'I have submitted an official claim, please review 🛡️',
  'Thank you so much! On my way to collect it now 🏃',
];

const POPULAR_CAMPUS_SPOTS = [
  'Security Gate 1 (Main Entrance)',
  'Security Gate 2 (Hostel Entrance)',
  'Central Library D6 Circulation Desk',
  'Academic Block A1 Helpdesk',
  'Block A3 Computer Lab Area',
  'South Campus Cafeteria (Block C3)',
  'Student Center & Fountain Park',
];

export const SendMessageModal: React.FC<SendMessageModalProps> = ({
  item,
  isOpen,
  onClose,
  onMessageSent,
  recipientUser,
  initialThreadId,
  onViewItemDetails,
}) => {
  const { currentUser, isAuthenticated, openAuthModal } = useAuth();
  
  const [messages, setMessages] = useState<ItemMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [currentFoundLocation, setCurrentFoundLocation] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [showItemSidebar, setShowItemSidebar] = useState(true);

  // 1-on-1 Thread Isolation & Inquiry Management State
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId || null);
  const [inquiryThreads, setInquiryThreads] = useState<ItemInquiryThread[]>([]);
  const [selectedInquiryClaimant, setSelectedInquiryClaimant] = useState<ItemInquiryThread | null>(null);

  // Reactions state stored per thread
  const currentThreadKey = activeThreadId || (item?.id ? `item_${item.id}` : 'temp');
  const [reactionsMap, setReactionsMap] = useState<Record<string, string>>(() => {
    try {
      if (currentThreadKey) {
        const saved = localStorage.getItem(`sahayak_chat_reactions_${currentThreadKey}`);
        if (saved) return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return {};
  });

  const [activeActionMsgId, setActiveActionMsgId] = useState<string | null>(null);
  const [animatingHeartMsgId, setAnimatingHeartMsgId] = useState<string | null>(null);
  const lastTapRef = useRef<{ [msgId: string]: number }>({});
  const [showPartnerProfile, setShowPartnerProfile] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);

  // Determine if active user is the poster of the item
  const isOwner = Boolean(
    currentUser && item && (
      currentUser.id === item.userId || 
      (currentUser.email && item.userEmail && currentUser.email.toLowerCase() === item.userEmail.toLowerCase())
    )
  );

  const fileInputId = useId();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (currentThreadKey) {
      try {
        const saved = localStorage.getItem(`sahayak_chat_reactions_${currentThreadKey}`);
        setReactionsMap(saved ? JSON.parse(saved) : {});
      } catch {
        setReactionsMap({});
      }
    }
  }, [currentThreadKey]);

  useEffect(() => {
    setAvatarImgError(false);
  }, [item?.id, recipientUser?.id, selectedInquiryClaimant?.claimantId]);

  // Background scroll lock & escape listener
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showPartnerProfile) {
          setShowPartnerProfile(false);
        } else if (selectedPhotoPreview) {
          setSelectedPhotoPreview(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, showPartnerProfile, selectedPhotoPreview]);

  // Synchronize and initialize 1-on-1 thread state
  useEffect(() => {
    if (!isOpen || !item) {
      setActiveThreadId(null);
      setSelectedInquiryClaimant(null);
      setInquiryThreads([]);
      return;
    }

    if (!isOwner) {
      // Claimant: private thread keyed by item and claimant
      const myThreadId = currentUser ? getItemThreadId(item.id, currentUser.id || currentUser.email) : '';
      setActiveThreadId(myThreadId);
      setSelectedInquiryClaimant(null);
    } else {
      // Poster: discover all distinct claimant inquiries
      const inquiries = getItemInquiriesForPoster(item.id, currentUser);
      setInquiryThreads(inquiries);

      if (initialThreadId) {
        setActiveThreadId(initialThreadId);
        const matched = inquiries.find(inq => inq.threadId === initialThreadId);
        setSelectedInquiryClaimant(matched || null);
      } else if (recipientUser?.id || recipientUser?.email) {
        const targetThreadId = getItemThreadId(item.id, recipientUser.id || recipientUser.email || '');
        setActiveThreadId(targetThreadId);
        const matched = inquiries.find(inq => inq.threadId === targetThreadId);
        setSelectedInquiryClaimant(matched || null);
      } else if (inquiries.length > 0) {
        setActiveThreadId(inquiries[0].threadId);
        setSelectedInquiryClaimant(inquiries[0]);
      } else {
        setActiveThreadId(null);
        setSelectedInquiryClaimant(null);
      }
    }
  }, [isOpen, item?.id, isOwner, initialThreadId, recipientUser?.id, currentUser?.id]);

  // Load and subscribe to real-time messages with strict 1-on-1 participant isolation
  useEffect(() => {
    if (!isOpen || !item) return;

    const refreshThread = () => {
      if (!currentUser) {
        setMessages([]);
        return;
      }

      if (!isOwner) {
        // Claimant: isolated to their own dialogue with poster
        const myThreadId = getItemThreadId(item.id, currentUser.id || currentUser.email);
        const thread = getItemMessages(item.id, currentUser, myThreadId);
        setMessages(thread);

        // Auto-mark incoming unread messages as read
        thread.forEach(msg => {
          if (msg.senderId !== currentUser.id && msg.status === 'unread') {
            markMessageAsRead(msg.id);
          }
        });
      } else {
        // Poster: update inquiries list and load active claimant thread
        const inquiries = getItemInquiriesForPoster(item.id, currentUser);
        setInquiryThreads(inquiries);

        const currentThreadId = activeThreadId || (inquiries.length > 0 ? inquiries[0].threadId : null);
        if (currentThreadId) {
          const thread = getItemMessages(item.id, currentUser, currentThreadId);
          setMessages(thread);

          const matchedInq = inquiries.find(inq => inq.threadId === currentThreadId);
          if (matchedInq) {
            setSelectedInquiryClaimant(matchedInq);
          }

          thread.forEach(msg => {
            if (msg.senderId !== currentUser.id && msg.status === 'unread') {
              markMessageAsRead(msg.id);
            }
          });
        } else {
          setMessages([]);
        }
      }
    };

    refreshThread();
    const unsubscribe = subscribeToStorage(refreshThread);
    return unsubscribe;
  }, [isOpen, item, currentUser, isOwner, activeThreadId]);

  // Smooth scroll to bottom on new messages
  useEffect(() => {
    if (isOpen && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages.length, isOpen]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      const timer = setTimeout(() => textareaRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const chatPartnerName = isOwner
    ? (selectedInquiryClaimant?.claimantName || recipientUser?.name || 'Claimant / Finder')
    : (recipientUser?.name || item?.userName || 'Item Reporter');

  const chatPartnerUid = isOwner
    ? (selectedInquiryClaimant?.claimantUid || recipientUser?.uid || 'CU Student')
    : (recipientUser?.uid || item?.userUid || 'CU Student');

  const chatPartnerEmail = isOwner
    ? (selectedInquiryClaimant?.claimantEmail || recipientUser?.email || '')
    : (recipientUser?.email || item?.userEmail || '');

  const chatPartnerPhone = isOwner
    ? (selectedInquiryClaimant?.claimantPhone || recipientUser?.phone)
    : (recipientUser?.phone || item?.userPhone);

  const chatPartnerRole = isOwner
    ? 'Claimant / Inquiring Student'
    : (item?.type === 'lost' ? 'Lost Item Reporter' : 'Found Item Finder');

  // Resolve chat partner's avatar
  const chatPartnerAvatar = useMemo(() => {
    if (!item) return '';

    if (isOwner) {
      if (selectedInquiryClaimant?.claimantAvatarUrl) return selectedInquiryClaimant.claimantAvatarUrl;
      if (recipientUser?.avatarUrl) return recipientUser.avatarUrl;
    } else {
      if (recipientUser?.avatarUrl) return recipientUser.avatarUrl;
      if (item.userAvatarUrl) return item.userAvatarUrl;
    }

    const partnerId = isOwner
      ? (selectedInquiryClaimant?.claimantId || recipientUser?.id)
      : (recipientUser?.id || item.userId);
    const partnerEmail = chatPartnerEmail?.toLowerCase();

    try {
      const storedUsers = getStoredUsers();
      const matched = storedUsers.find(u => 
        (partnerId && u.id === partnerId) || 
        (partnerEmail && u.email?.toLowerCase() === partnerEmail) ||
        (chatPartnerUid && u.uidOrRoll?.toLowerCase() === chatPartnerUid.toLowerCase())
      );
      if (matched?.avatarUrl) return matched.avatarUrl;
    } catch {
      // fallback
    }

    const demo = DEMO_USERS.find(d => 
      (partnerId && d.id === partnerId) || 
      (partnerEmail && d.email?.toLowerCase() === partnerEmail)
    );
    if (demo?.avatarUrl) return demo.avatarUrl;

    const seedStr = chatPartnerName + (partnerEmail || chatPartnerUid || '');
    const seed = seedStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const fallbackAvatars = [
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=250&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=250&auto=format&fit=crop&q=80',
    ];
    return fallbackAvatars[seed % fallbackAvatars.length];
  }, [recipientUser, isOwner, item, selectedInquiryClaimant, chatPartnerEmail, chatPartnerUid, chatPartnerName]);

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
      setError(err?.message || 'Failed to upload photo attachment.');
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !currentUser) {
      openAuthModal('login', 'Please sign in with your Chandigarh University ID to chat.');
      return;
    }

    if (!messageText.trim() && !proofImageUrl) {
      setError('Please type a message or attach a photo before sending.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let targetRecipientId = recipientUser?.id;
      let targetRecipientEmail = recipientUser?.email;
      let targetRecipientName = recipientUser?.name;

      if (!targetRecipientId) {
        if (isOwner) {
          if (selectedInquiryClaimant) {
            targetRecipientId = selectedInquiryClaimant.claimantId;
            targetRecipientEmail = selectedInquiryClaimant.claimantEmail;
            targetRecipientName = selectedInquiryClaimant.claimantName;
          }
        } else {
          targetRecipientId = item.userId;
          targetRecipientEmail = item.userEmail;
          targetRecipientName = item.userName;
        }
      }

      const threadId = isOwner
        ? (activeThreadId || (targetRecipientId ? getItemThreadId(item.id, targetRecipientId) : getItemThreadId(item.id, 'claimant')))
        : getItemThreadId(item.id, currentUser.id || currentUser.email || 'claimant');

      const newMsg: ItemMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        itemId: item.id,
        threadId,
        itemTitle: item.title,
        itemType: item.type,
        senderId: currentUser.id || 'guest',
        senderName: currentUser.name || 'Campus Student',
        senderEmail: currentUser.email || 'student@cuchd.in',
        senderPhone: currentUser.phone || '',
        senderUid: currentUser.uidOrRoll || 'CU-STUDENT',
        senderRole: currentUser.role || 'student',
        recipientId: targetRecipientId,
        recipientEmail: targetRecipientEmail,
        recipientName: targetRecipientName,
        messageText: messageText.trim() || (proofImageUrl ? 'Sent a verification photo attachment' : ''),
        currentFoundLocation: currentFoundLocation.trim() || undefined,
        proofImageUrl: proofImageUrl || undefined,
        status: 'unread',
        createdAt: new Date().toISOString(),
      };

      // FAST OPTIMISTIC UPDATE: add message to local state immediately (0ms perceptual lag)
      setMessages(prev => [...prev, newMsg]);

      // Save to storage & sync to Firestore
      saveMessage(newMsg);

      if (onMessageSent) {
        onMessageSent(newMsg);
      }

      // Reset composer
      setMessageText('');
      setProofImageUrl('');
      setCurrentFoundLocation('');
      setShowLocationPicker(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleToggleReaction = (msgId: string, emoji: string) => {
    setReactionsMap(prev => {
      const updated = {
        ...prev,
        [msgId]: prev[msgId] === emoji ? '' : emoji
      };
      if (item?.id) {
        try {
          localStorage.setItem(`sahayak_chat_reactions_${currentThreadKey}`, JSON.stringify(updated));
        } catch {
          // ignore
        }
      }
      return updated;
    });
  };

  const handleBubbleInteraction = (msgId: string) => {
    const now = Date.now();
    const lastTap = lastTapRef.current[msgId] || 0;
    if (now - lastTap < 350) {
      // Double tap: Heart reaction
      handleToggleReaction(msgId, '❤️');
      setAnimatingHeartMsgId(msgId);
      setTimeout(() => setAnimatingHeartMsgId(null), 800);
      setActiveActionMsgId(null);
    } else {
      setActiveActionMsgId(prev => (prev === msgId ? null : msgId));
    }
    lastTapRef.current[msgId] = now;
  };

  const quickSuggestions = item.type === 'found' ? QUICK_SUGGESTIONS_FOUND : QUICK_SUGGESTIONS_LOST;

  const itemCover = item.imageUrl || (item.imageUrls && item.imageUrls[0]) || '';

  return (
    <div 
      className="fixed inset-0 w-full h-[100dvh] z-50 bg-[#0A0E1A] text-white flex flex-col overflow-hidden font-sans select-none animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Dynamic Ambient Background Glow Elements */}
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-teal-500/10 blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-cyan-600/10 blur-[140px] pointer-events-none" />

      {/* TOP NAVIGATION BAR: Clean, Focused & High Performance */}
      <header className="sticky top-0 z-30 px-3 sm:px-6 py-2.5 bg-[#0D1424]/95 backdrop-blur-2xl border-b border-slate-800/80 shadow-md flex items-center justify-between gap-3 shrink-0">
        
        {/* Left: Back Button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="group flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] text-white border border-white/[0.1] hover:border-emerald-500/40 active:scale-95 transition-all cursor-pointer shadow-xs"
            title="Return to listings (Esc)"
            aria-label="Back to listings"
          >
            <ArrowLeft className="w-5 h-5 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Center: Partner Profile Card & Item Context */}
        <div 
          onClick={() => setShowPartnerProfile(true)}
          className="flex-1 min-w-0 flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-emerald-500/30 transition-all cursor-pointer group"
          title={`Click to view ${chatPartnerName}'s verified student profile`}
        >
          {/* User Avatar & Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              {chatPartnerAvatar && !avatarImgError ? (
                <img
                  src={chatPartnerAvatar}
                  alt={chatPartnerName}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover ring-2 ring-emerald-500/40 shadow-sm group-hover:ring-emerald-400 transition-all"
                  onError={() => setAvatarImgError(true)}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-sm flex items-center justify-center ring-2 ring-emerald-500/40 shadow-sm">
                  {chatPartnerName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0D1424] absolute -bottom-0.5 -right-0.5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-sm font-black text-white truncate leading-tight group-hover:text-emerald-300 transition-colors">
                  {chatPartnerName}
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                  <span>CU</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                <span className="font-mono text-emerald-300">{chatPartnerUid}</span>
                <span className="text-slate-600">•</span>
                <span className="truncate">{item.title}</span>
              </p>
            </div>
          </div>

          {/* Item Reference Pill (Medium+ Screens) */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] shrink-0">
            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
              item.type === 'lost' 
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}>
              {item.type === 'lost' ? 'Lost' : 'Found'}
            </span>
            <span className="text-xs font-bold text-slate-200 truncate max-w-[140px]">{item.title}</span>
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-emerald-300 shrink-0">
            <span className="hidden sm:inline text-[11px] font-semibold text-slate-400 group-hover:text-slate-200">Profile</span>
            <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onViewItemDetails && (
            <button
              type="button"
              onClick={() => onViewItemDetails(item)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 hover:text-white border border-white/[0.1] text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs"
              title="View full item details"
            >
              <span>Item Details</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          )}

          {/* Desktop Sidebar Toggle */}
          <button
            type="button"
            onClick={() => setShowItemSidebar(prev => !prev)}
            className="hidden md:flex items-center justify-center w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/[0.1] transition-all cursor-pointer"
            title={showItemSidebar ? 'Hide Item Dossier' : 'Show Item Dossier'}
          >
            {showItemSidebar ? <PanelRightClose className="w-4 h-4 text-slate-300" /> : <PanelRightOpen className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/[0.1] hover:border-rose-500/40 transition-all cursor-pointer active:scale-95"
            title="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* POSTER INQUIRY SELECTOR / INBOX BAR (if multiple claimants inquired) */}
      {isOwner && inquiryThreads.length > 1 && (
        <div className="px-3 sm:px-6 py-2 bg-[#0C1220]/95 backdrop-blur-xl border-b border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 z-20">
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-400 shrink-0 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Inquiries ({inquiryThreads.length}):
          </span>
          {inquiryThreads.map((inq) => {
            const isActive = inq.threadId === activeThreadId;
            return (
              <button
                key={inq.threadId}
                type="button"
                onClick={() => {
                  setActiveThreadId(inq.threadId);
                  setSelectedInquiryClaimant(inq);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/50 shadow-xs font-bold ring-1 ring-emerald-400/40'
                    : 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/[0.08]'
                }`}
              >
                {inq.claimantAvatarUrl ? (
                  <img src={inq.claimantAvatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-700 text-[10px] font-bold flex items-center justify-center text-white">
                    {inq.claimantName.charAt(0)}
                  </div>
                )}
                <span className="truncate max-w-[120px]">{inq.claimantName}</span>
                {inq.unreadCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-[9px] font-black text-white flex items-center justify-center animate-pulse">
                    {inq.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* MAIN BODY: Chat Canvas + Collapsible Item Sidebar */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">

        {/* CHAT STREAM CANVAS */}
        <div className="flex-1 min-h-0 flex flex-col min-w-0 relative">
          
          {/* Messages Scroll Area */}
          <div 
            ref={messagesContainerRef}
            onClick={() => setActiveActionMsgId(null)}
            className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-8 py-3 sm:py-4 space-y-3.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent flex flex-col select-text"
          >
            
            {/* Top Security & Privacy Notice */}
            <div className="max-w-md mx-auto my-1 p-3 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] text-xs text-white/90 shadow-sm text-center space-y-0.5 shrink-0">
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Isolated Campus 1-on-1 Dialogue</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed font-medium">
                {isOwner
                  ? `Private chat with ${chatPartnerName}. Other students cannot view this conversation.`
                  : `Private inquiry with ${chatPartnerName} (${item.userName}). Only you and the item poster have access.`}
              </p>
            </div>

            {/* Date Separator */}
            <div className="flex justify-center my-1 shrink-0">
              <span className="px-3 py-0.5 rounded-full bg-white/[0.06] backdrop-blur-md text-slate-400 text-[10px] font-semibold border border-white/[0.08]">
                {new Date(item.dateTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {/* Empty Thread / Auth Gate State */}
            {!isAuthenticated ? (
              <div className="py-16 px-4 text-center space-y-4 max-w-sm mx-auto my-auto animate-in fade-in">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                  <Lock className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-base font-black text-white">Private 1-on-1 Student Chat</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-normal">
                  To protect student privacy, item communications are restricted to authenticated students. Sign in with your Chandigarh University ID to participate.
                </p>
                <button
                  type="button"
                  onClick={() => openAuthModal('login', 'Please sign in with your Chandigarh University ID to chat.')}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer transition-all"
                >
                  Sign In with CU ID
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-3.5 max-w-sm mx-auto my-auto">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                  {isOwner ? <Users className="w-7 h-7" /> : <MessageSquare className="w-7 h-7" />}
                </div>
                <h3 className="text-base font-black text-white">
                  {isOwner ? 'No Claimant Inquiries Yet' : 'Start Campus Conversation'}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-normal">
                  {isOwner
                    ? 'No inquiries yet for this item. When students message you or submit an ownership claim, their threads will appear here.'
                    : (item.type === 'found'
                        ? `Have questions about this ${item.title}? Ask ${chatPartnerName} to clarify distinguishing marks, custody location, or return verification.`
                        : `Have you spotted or recovered this ${item.title}? Reach out to ${chatPartnerName} to arrange a safe campus handover.`
                      )}
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {messages.map((msg, index) => {
                  const isFromMe = currentUser && (
                    msg.senderId === currentUser.id || 
                    (currentUser.email && msg.senderEmail && currentUser.email.toLowerCase() === msg.senderEmail.toLowerCase())
                  );

                  const currentReaction = reactionsMap[msg.id];

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col group ${isFromMe ? 'items-end' : 'items-start'} transition-all`}
                    >
                      {/* Sender & Timestamp */}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 px-1.5">
                        <span className="font-bold text-slate-300">
                          {isFromMe ? 'You' : msg.senderName}
                        </span>
                        {msg.senderUid && (
                          <span className="font-mono text-[10px] text-slate-500">
                            ({msg.senderUid})
                          </span>
                        )}
                        <span>·</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Bubble */}
                      <div className="relative max-w-[88%] sm:max-w-[70%]">
                        <div
                          onClick={() => handleBubbleInteraction(msg.id)}
                          className={`p-3.5 sm:p-4 rounded-2xl space-y-2 transition-all text-xs sm:text-sm font-normal leading-relaxed cursor-pointer relative ${
                            isFromMe
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-xs shadow-md shadow-emerald-950/30 border border-emerald-400/20 active:brightness-95'
                              : 'bg-slate-800/90 text-slate-100 backdrop-blur-2xl border border-slate-700/70 rounded-tl-xs shadow-sm active:bg-slate-700/80'
                          }`}
                          title="Double-tap for heart • Tap for reactions"
                        >
                          {/* Double tap heart animation */}
                          {animatingHeartMsgId === msg.id && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in zoom-in-50 fade-in duration-150">
                              <span className="text-4xl animate-bounce drop-shadow-[0_4px_16px_rgba(244,63,94,0.9)]">
                                ❤️
                              </span>
                            </div>
                          )}

                          {/* Message Text */}
                          <p className="whitespace-pre-wrap break-words">
                            {msg.messageText}
                          </p>

                          {/* Campus Custody Point */}
                          {msg.currentFoundLocation && (
                            <div className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold ${
                              isFromMe 
                                ? 'bg-black/25 text-emerald-100 border border-white/10' 
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}>
                              <Building2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                              <div className="min-w-0">
                                <span className="text-[9px] opacity-75 uppercase tracking-wider block font-extrabold">Campus Handover Location</span>
                                <span className="truncate block font-semibold">{msg.currentFoundLocation}</span>
                              </div>
                            </div>
                          )}

                          {/* Photo Attachment */}
                          {msg.proofImageUrl && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPhotoPreview(msg.proofImageUrl || null);
                                }}
                                className="group/photo relative block rounded-xl overflow-hidden border border-white/20 shadow-sm max-w-xs cursor-pointer"
                              >
                                <img
                                  src={msg.proofImageUrl}
                                  alt="Attachment"
                                  className="w-full max-h-48 object-cover group-hover/photo:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                  <Maximize2 className="w-4 h-4" />
                                  <span>Enlarge Photo</span>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Floating Reaction Pill */}
                        {currentReaction ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleReaction(msg.id, currentReaction);
                            }}
                            className={`absolute -bottom-2 ${isFromMe ? 'left-2' : 'right-2'} px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-xs shadow-md flex items-center gap-1 z-10 active:scale-75 transition-transform cursor-pointer`}
                            title="Tap to remove reaction"
                          >
                            <span>{currentReaction}</span>
                          </button>
                        ) : null}

                        {/* Action & Reaction Bar (Hover / Tap) */}
                        <div
                          className={`absolute z-30 transition-all duration-150 ${
                            activeActionMsgId === msg.id
                              ? 'opacity-100 scale-100 pointer-events-auto'
                              : 'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'
                          } ${
                            isFromMe
                              ? '-top-8 right-1 sm:top-1/2 sm:-translate-y-1/2 sm:right-auto sm:-left-28'
                              : '-top-8 left-1 sm:top-1/2 sm:-translate-y-1/2 sm:left-auto sm:-right-28'
                          } flex items-center gap-1 p-1 rounded-full bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-xl`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleReaction(msg.id, '👍');
                              setActiveActionMsgId(null);
                            }}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-75 cursor-pointer ${
                              currentReaction === '👍' ? 'bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-400' : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                            title="Like"
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleReaction(msg.id, '❤️');
                              setAnimatingHeartMsgId(msg.id);
                              setTimeout(() => setAnimatingHeartMsgId(null), 800);
                              setActiveActionMsgId(null);
                            }}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-75 cursor-pointer ${
                              currentReaction === '❤️' ? 'bg-rose-500/30 text-rose-300 ring-1 ring-rose-400' : 'bg-white/10 hover:bg-white/20 text-rose-400'
                            }`}
                            title="Heart"
                          >
                            <Heart className="w-3 h-3 fill-rose-400" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleReaction(msg.id, '🤝');
                              setActiveActionMsgId(null);
                            }}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-75 cursor-pointer ${
                              currentReaction === '🤝' ? 'bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-400' : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                            title="Handshake"
                          >
                            <HandHeart className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyMessage(msg.id, msg.messageText);
                              setActiveActionMsgId(null);
                            }}
                            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-transform active:scale-75 cursor-pointer"
                            title="Copy text"
                          >
                            {copiedMsgId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Delivery Status */}
                      {isFromMe && index === messages.length - 1 && (
                        <span className="text-[10px] text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Delivered</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div ref={messagesEndRef} className="h-0 shrink-0" />
          </div>

          {/* QUICK SUGGESTIONS RIBBON */}
          <div className="px-3 sm:px-6 py-1.5 bg-[#0D1424]/90 backdrop-blur-md border-t border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Quick:
            </span>
            {quickSuggestions.map((text, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setMessageText(text);
                  textareaRef.current?.focus();
                }}
                className="px-3 py-1 rounded-full bg-white/[0.06] hover:bg-emerald-500/20 text-slate-300 hover:text-white border border-white/[0.08] hover:border-emerald-500/40 text-xs font-semibold whitespace-nowrap transition-all shrink-0 active:scale-95 cursor-pointer shadow-2xs"
              >
                {text}
              </button>
            ))}
          </div>

          {/* COMPOSER DOCK */}
          <div className="p-2.5 sm:p-4 bg-[#0D1424]/98 backdrop-blur-2xl border-t border-slate-800 shrink-0 space-y-2">
            {error && (
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/30 text-rose-200 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="truncate">{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-rose-300 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Meetup Location Picker Expandable Bar */}
            {showLocationPicker && (
              <div className="p-3 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl space-y-2 animate-in slide-in-from-bottom-2 shadow-lg">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    <span>Select Campus Handover Spot</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowLocationPicker(false)}
                    className="text-slate-400 hover:text-white text-xs font-semibold"
                  >
                    Done
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {POPULAR_CAMPUS_SPOTS.map((spot, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentFoundLocation(spot)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        currentFoundLocation === spot
                          ? 'bg-emerald-500 text-white shadow-xs font-bold'
                          : 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/[0.08]'
                      }`}
                    >
                      {spot}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={currentFoundLocation}
                  onChange={e => setCurrentFoundLocation(e.target.value)}
                  placeholder="Or enter specific spot (e.g., Gate 1 Guard Room)..."
                  className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 font-medium"
                />
              </div>
            )}

            {/* Attached Photo Preview */}
            {proofImageUrl && (
              <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <img src={proofImageUrl} alt="Attachment" className="w-9 h-9 rounded-lg object-cover border border-emerald-400/40" />
                  <span className="text-xs text-emerald-200 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Photo attached
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setProofImageUrl('')}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2 py-0.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}

            {/* Composer Bar */}
            <form onSubmit={handleSendMessage} className="flex items-end gap-2">
              {/* Attachment Actions */}
              <div className="flex items-center gap-1 pb-1">
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(prev => !prev)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                    currentFoundLocation || showLocationPicker
                      ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-300 shadow-xs'
                      : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.08] text-slate-300 hover:text-white'
                  }`}
                  title="Add handover campus spot"
                  aria-label="Add location"
                >
                  <Building2 className="w-4 h-4 text-emerald-400" />
                </button>

                <label
                  htmlFor={fileInputId}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                    proofImageUrl
                      ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-300 shadow-xs'
                      : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.08] text-slate-300 hover:text-white'
                  }`}
                  title="Attach verification snapshot"
                  aria-label="Attach photo"
                >
                  <ImageIcon className="w-4 h-4 text-teal-400" />
                </label>
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </div>

              {/* Textarea */}
              <div className="flex-1 relative bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-2 focus-within:border-emerald-400/60 focus-within:ring-2 focus-within:ring-emerald-500/30 transition-all shadow-inner">
                <textarea
                  ref={textareaRef}
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
                      ? `Type message to ${chatPartnerName}...`
                      : 'Sign in to message...'
                  }
                  className="w-full bg-transparent text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none resize-none max-h-24 font-medium px-1.5 py-0.5 leading-relaxed"
                />

                {uploading && (
                  <span className="text-[10px] text-emerald-400 font-medium px-1 block animate-pulse">
                    Uploading snapshot attachment...
                  </span>
                )}
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={submitting || (!messageText.trim() && !proofImageUrl)}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-90 text-white flex items-center justify-center transition-all shadow-md shadow-emerald-500/25 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Send message (Enter)"
                aria-label="Send message"
              >
                <Send className="w-4 h-4 text-white -mr-0.5" />
              </button>
            </form>
          </div>

        </div>

        {/* RIGHT SIDEBAR: ITEM DOSSIER & CONTEXT PANEL (Desktop / Collapsible) */}
        {showItemSidebar && (
          <aside className="w-80 lg:w-92 bg-[#0D1424]/90 backdrop-blur-2xl border-l border-slate-800 p-5 overflow-y-auto hidden md:flex flex-col space-y-4 shrink-0 animate-in slide-in-from-right duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                Item Information
              </span>
              <span className="text-xs text-slate-400 font-mono">
                #{item.id.slice(-6).toUpperCase()}
              </span>
            </div>

            {/* Thumbnail Preview */}
            <div className="relative aspect-16/10 rounded-2xl overflow-hidden border border-slate-800 bg-black/40 shadow-sm group">
              {itemCover ? (
                <img src={itemCover} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                  <ImageIcon className="w-7 h-7 mb-1" />
                  <span className="text-xs font-semibold">No Image</span>
                </div>
              )}
              
              <div className="absolute top-2.5 left-2.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                  item.type === 'lost' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {item.type === 'lost' ? 'Lost Item' : 'Found Item'}
                </span>
              </div>
            </div>

            {/* Item Title & Specs */}
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white leading-snug">
                {item.title}
              </h3>
              <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Core Specs Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Category</span>
                <span className="font-bold text-white truncate block">{item.category}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Color</span>
                <span className="font-bold text-white truncate block">{item.color}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-0.5 col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Reported Location</span>
                <span className="font-bold text-white truncate block flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{item.locationBlock}</span>
                </span>
              </div>
            </div>

            {/* Safe Custody Note if Found */}
            {item.type === 'found' && item.currentHoldingLocation && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 space-y-0.5 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-300 font-extrabold text-[10px] uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Current Holding Desk</span>
                </div>
                <p className="font-bold text-emerald-100 pl-5 text-xs">
                  {item.currentHoldingLocation}
                </p>
              </div>
            )}

            {/* View Full Item Details Button */}
            {onViewItemDetails && (
              <button
                type="button"
                onClick={() => onViewItemDetails(item)}
                className="w-full py-2 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.08] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              >
                <span>View Full Item Listing</span>
                <ChevronRight className="w-4 h-4 text-emerald-400" />
              </button>
            )}

            {/* Reporter Contact Information */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                Reporter Identity
              </span>
              <button
                type="button"
                onClick={() => setShowPartnerProfile(true)}
                className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/[0.04] transition-colors text-left cursor-pointer group/rep"
              >
                <div className="relative shrink-0">
                  {chatPartnerAvatar && !avatarImgError ? (
                    <img
                      src={chatPartnerAvatar}
                      alt={chatPartnerName}
                      className="w-9 h-9 rounded-xl object-cover ring-1.5 ring-emerald-500/40"
                      onError={() => setAvatarImgError(true)}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-slate-800 text-white font-black text-xs flex items-center justify-center">
                      {chatPartnerName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0D1424] absolute -bottom-0.5 -right-0.5" />
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <span className="font-extrabold text-white truncate block group-hover/rep:text-emerald-300 transition-colors">
                    {chatPartnerName}
                  </span>
                  <span className="text-slate-500 text-[11px] block">{chatPartnerUid}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover/rep:text-emerald-400 group-hover/rep:translate-x-0.5 transition-all" />
              </button>
            </div>

          </aside>
        )}

      </div>

      {/* FULL CONTACT PROFILE MODAL */}
      {showPartnerProfile && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={() => setShowPartnerProfile(false)}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="relative w-full max-w-md bg-[#0F172A] border border-white/15 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 text-white"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
                <User className="w-4 h-4 text-emerald-400" />
                <span>Verified Campus Profile</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPartnerProfile(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Avatar & Identity Card */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
              <div className="relative shrink-0">
                {chatPartnerAvatar && !avatarImgError ? (
                  <img
                    src={chatPartnerAvatar}
                    alt={chatPartnerName}
                    className="w-13 h-13 rounded-2xl object-cover ring-2 ring-emerald-500/50 shadow-md"
                    onError={() => setAvatarImgError(true)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-lg flex items-center justify-center ring-2 ring-emerald-500/40 shadow-md">
                    {chatPartnerName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#0F172A] absolute -bottom-0.5 -right-0.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-white truncate">
                    {chatPartnerName}
                  </h3>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    CU Verified
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Chandigarh University Student
                </p>
                <span className="inline-block mt-1 text-[11px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  UID: {chatPartnerUid}
                </span>
              </div>
            </div>

            {/* Verified Details Grid */}
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <span className="text-slate-400 font-medium">Role in Thread:</span>
                <span className="font-extrabold text-white">{chatPartnerRole}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>University Email:</span>
                </span>
                <span className="font-mono text-emerald-300 font-semibold truncate max-w-[200px]">
                  {chatPartnerEmail || 'student@cuchd.in'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Contact Phone:</span>
                </span>
                {(!isOwner && item.hidePhone) ? (
                  <span className="text-amber-300 font-bold flex items-center gap-1">
                    <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kept Private</span>
                  </span>
                ) : chatPartnerPhone ? (
                  <span className="font-bold text-emerald-400">
                    {chatPartnerPhone}
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">In-app chat only</span>
                )}
              </div>
            </div>

            {/* Campus Security Footnote */}
            <p className="text-[11px] text-slate-400 text-center leading-relaxed pt-1">
              🛡️ All communication on SAHAYAK is logged under university safety guidelines. Please meet at campus security gates for item returns.
            </p>
          </div>
        </div>
      )}

      {/* PHOTO ATTACHMENT LIGHTBOX */}
      {selectedPhotoPreview && (
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in"
          onClick={() => setSelectedPhotoPreview(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-white/20"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPhotoPreview(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 hover:bg-black text-white transition-colors cursor-pointer border border-white/20"
              aria-label="Close photo"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedPhotoPreview}
              alt="Verification Snapshot Full View"
              className="max-h-[80vh] w-auto rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
