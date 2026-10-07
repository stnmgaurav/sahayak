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
  resolveMessageThreadId,
  ItemInquiryThread
} from '../lib/storage';
import { DEMO_USERS } from '../data/mockData';
import { 
  Send, 
  MapPin, 
  Building2, 
  Phone, 
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Upload, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare,
  Sparkles,
  Clock, 
  Image as ImageIcon,
  ShieldCheck,
  EyeOff,
  ArrowLeft,
  Copy,
  Check,
  ThumbsUp,
  Heart,
  Maximize2,
  ChevronRight,
  User,
  Users,
  Lock,
  Mail,
  X,
  ExternalLink
} from 'lucide-react';
import {
  WebRTCCallClient,
  WebRTCCallSession,
  subscribeToThreadCall,
  formatCallDuration,
  playIncomingRingtoneSound,
  playOutgoingRingSound,
  playCallConnectedSound,
  playCallEndedSound,
  stopAllCallSounds
} from '../lib/webrtcCallService';

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
  autoAcceptCallSession?: WebRTCCallSession | null;
}

const QUICK_SUGGESTIONS = [
  'I have safely deposited this at Gate 1 Security Desk 🛡️',
  'Can we meet near Academic Block A1 to return this? 🤝',
  'Is this item still with you? 🔍',
  'Thank you so much! On my way to collect it now 🏃',
  'Can you verify the color or any markings? 🏷️',
  'I left it with the Central Library circulation desk 📚',
];

const POPULAR_CAMPUS_SPOTS = [
  'Security Gate 1 (NH-95 Main Entrance)',
  'Security Gate 2 (Hostel Entrance)',
  'Central Library D6 Circulation Desk',
  'Academic Block A1 Ground Floor Helpdesk',
  'Academic Block A3 Computer Lab Area',
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
  autoAcceptCallSession,
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

  // WebRTC In-App Audio Calling State
  const [callState, setCallState] = useState<'idle' | 'outgoing' | 'incoming' | 'connected' | 'ended'>('idle');
  const [activeCallSession, setActiveCallSession] = useState<WebRTCCallSession | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [callError, setCallError] = useState<string | null>(null);
  const callClientRef = useRef<WebRTCCallClient | null>(null);

  // Determine if active user is the poster of the item
  const isOwner = Boolean(
    currentUser && item && (
      currentUser.id === item.userId || 
      (currentUser.email && item.userEmail && currentUser.email.toLowerCase() === item.userEmail.toLowerCase())
    )
  );

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

  const fileInputId = useId();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Background scroll lock & escape listener
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Prevent any background parent page scrolling
    window.scrollTo({ top: 0, left: 0 });

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
      // Access control: Unauthenticated users are strictly barred from viewing messages
      if (!currentUser) {
        setMessages([]);
        return;
      }

      if (!isOwner) {
        // Claimant: isolated to their own dialogue
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

  // Smooth scroll to bottom on new messages inside the messages container
  useEffect(() => {
    if (isOpen) {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [messages, isOpen]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // WebRTC Audio Calling Subscription on Active 1-on-1 Thread
  useEffect(() => {
    if (!isOpen || !item || !currentUser || !activeThreadId) {
      if (callClientRef.current) {
        callClientRef.current.cleanup();
        callClientRef.current = null;
      }
      stopAllCallSounds();
      setCallState('idle');
      setActiveCallSession(null);
      setCallDuration(0);
      setIsMuted(false);
      setCallError(null);
      return;
    }

    const currentUid = (currentUser.id || '').toLowerCase();
    const currentEmail = (currentUser.email || '').toLowerCase();

    const unsubscribe = subscribeToThreadCall(
      activeThreadId,
      currentUser.id,
      currentUser.email,
      (remoteSession) => {
        // Strict participant check: Only the designated caller and receiver can participate
        const rReceiverId = (remoteSession.receiverId || '').toLowerCase();
        const rReceiverEmail = (remoteSession.receiverEmail || '').toLowerCase();
        const rCallerId = (remoteSession.callerId || '').toLowerCase();
        const rCallerEmail = (remoteSession.callerEmail || '').toLowerCase();

        const isReceiver = (currentUid && rReceiverId === currentUid) || (currentEmail && rReceiverEmail === currentEmail);
        const isCaller = (currentUid && rCallerId === currentUid) || (currentEmail && rCallerEmail === currentEmail);

        if (!isReceiver && !isCaller) {
          return; // Strict 1-on-1 privacy: ignore calls for other people
        }

        if (remoteSession.status === 'ringing') {
          if (isReceiver && callState === 'idle') {
            setActiveCallSession(remoteSession);
            setCallState('incoming');
            playIncomingRingtoneSound();
          }
        } else if (remoteSession.status === 'connected') {
          setActiveCallSession(remoteSession);
          if (callState === 'outgoing' || callState === 'incoming') {
            setCallState('connected');
          }
        } else if (
          remoteSession.status === 'ended' ||
          remoteSession.status === 'rejected' ||
          remoteSession.status === 'busy' ||
          remoteSession.status === 'missed'
        ) {
          if (callState !== 'idle') {
            stopAllCallSounds();
            playCallEndedSound();
            setCallState('ended');
            if (remoteSession.durationSeconds) {
              setCallDuration(remoteSession.durationSeconds);
            }
            if (callClientRef.current) {
              callClientRef.current.cleanup();
            }
            setTimeout(() => {
              setCallState('idle');
              setActiveCallSession(null);
              setCallDuration(0);
            }, 2500);
          }
        }
      }
    );

    return () => {
      unsubscribe();
      if (callClientRef.current) {
        callClientRef.current.cleanup();
        callClientRef.current = null;
      }
      stopAllCallSounds();
    };
  }, [isOpen, item?.id, currentUser?.id, activeThreadId, callState]);

  // Support auto-accepting when answering from external incoming call toast
  useEffect(() => {
    if (autoAcceptCallSession && isOpen && currentUser) {
      setActiveCallSession(autoAcceptCallSession);
      const timer = setTimeout(() => {
        handleAcceptCallWithSession(autoAcceptCallSession);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [autoAcceptCallSession, isOpen, currentUser?.id]);

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

  // Resolve chat partner's avatar / profile photo (Hook must be called unconditionally on every render)
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

    // Stable deterministic fallback student avatar
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

  // Early return after ALL hooks have been registered
  if (!isOpen || !item) return null;

  const handleAcceptCallWithSession = async (session: WebRTCCallSession) => {
    if (!currentUser) return;
    stopAllCallSounds();
    setCallError(null);
    setIsMuted(false);

    const client = new WebRTCCallClient(currentUser.id, currentUser.email);
    callClientRef.current = client;

    client.onStatusChange = (status, durSec) => {
      if (status === 'connected') {
        setCallState('connected');
        setCallDuration(durSec);
      } else if (status === 'ended' || status === 'rejected' || status === 'busy' || status === 'missed') {
        setCallState('ended');
        setCallDuration(durSec);
        setTimeout(() => {
          setCallState('idle');
          setActiveCallSession(null);
          setCallDuration(0);
        }, 2500);
      }
    };

    client.onError = (errText) => {
      setCallError(errText);
      setCallState('idle');
      stopAllCallSounds();
    };

    const ok = await client.acceptIncomingCall(session);
    if (ok) {
      setCallState('connected');
    } else {
      setCallState('idle');
    }
  };

  const handleInitiateCall = async () => {
    if (!isAuthenticated || !currentUser) {
      openAuthModal('login', 'Please sign in with your Chandigarh University ID to make in-app voice calls.');
      return;
    }

    if (!activeThreadId) {
      setError('Chat thread is initializing. Please wait a moment.');
      return;
    }

    if (callState !== 'idle') return;

    // Resolve target recipient details
    let targetRecipientId = recipientUser?.id;
    let targetRecipientEmail = recipientUser?.email;
    let targetRecipientName = recipientUser?.name;
    let targetRecipientUid = recipientUser?.uid;
    let targetRecipientAvatarUrl = recipientUser?.avatarUrl;

    if (!targetRecipientId && !targetRecipientEmail) {
      if (isOwner) {
        if (selectedInquiryClaimant) {
          targetRecipientId = selectedInquiryClaimant.claimantId;
          targetRecipientEmail = selectedInquiryClaimant.claimantEmail;
          targetRecipientName = selectedInquiryClaimant.claimantName;
          targetRecipientUid = selectedInquiryClaimant.claimantUid;
          targetRecipientAvatarUrl = selectedInquiryClaimant.claimantAvatarUrl;
        }
      } else {
        targetRecipientId = item.userId;
        targetRecipientEmail = item.userEmail;
        targetRecipientName = item.userName;
        targetRecipientUid = item.userUid;
        targetRecipientAvatarUrl = item.userAvatarUrl;
      }
    }

    targetRecipientName = targetRecipientName || chatPartnerName;
    targetRecipientUid = targetRecipientUid || chatPartnerUid;
    targetRecipientAvatarUrl = targetRecipientAvatarUrl || chatPartnerAvatar;
    targetRecipientEmail = targetRecipientEmail || chatPartnerEmail;

    // Cross-link ID, Email, and UID using user directory to ensure cross-phone recipient matching
    if (targetRecipientEmail || targetRecipientId || targetRecipientUid) {
      try {
        const storedUsers = getStoredUsers();
        const found = storedUsers.find(u => 
          (targetRecipientEmail && u.email?.toLowerCase() === targetRecipientEmail?.toLowerCase()) ||
          (targetRecipientId && u.id === targetRecipientId) ||
          (targetRecipientUid && u.uidOrRoll?.toLowerCase() === targetRecipientUid?.toLowerCase())
        );
        if (found) {
          if (!targetRecipientId) targetRecipientId = found.id;
          if (!targetRecipientEmail) targetRecipientEmail = found.email;
          if (!targetRecipientUid) targetRecipientUid = found.uidOrRoll;
          if (!targetRecipientName) targetRecipientName = found.name;
          if (!targetRecipientAvatarUrl) targetRecipientAvatarUrl = found.avatarUrl;
        }
      } catch {}
    }

    setCallError(null);
    setIsMuted(false);
    setCallDuration(0);

    const client = new WebRTCCallClient(currentUser.id, currentUser.email);
    callClientRef.current = client;

    client.onStatusChange = (status, durSec) => {
      if (status === 'ringing') {
        setCallState('outgoing');
      } else if (status === 'connected') {
        setCallState('connected');
        setCallDuration(durSec);
      } else if (status === 'ended' || status === 'rejected' || status === 'busy' || status === 'missed') {
        setCallState('ended');
        setCallDuration(durSec);
        setTimeout(() => {
          setCallState('idle');
          setActiveCallSession(null);
          setCallDuration(0);
        }, 2500);
      }
    };

    client.onError = (errText) => {
      setCallError(errText);
      setCallState('idle');
      stopAllCallSounds();
    };

    setCallState('outgoing');

    const success = await client.startCall({
      threadId: activeThreadId,
      itemId: item.id,
      itemTitle: item.title,
      callerId: currentUser.id,
      callerName: currentUser.name || 'CU Student',
      callerEmail: currentUser.email,
      callerAvatarUrl: currentUser.avatarUrl,
      callerUid: currentUser.uidOrRoll || 'CU-STUDENT',
      receiverId: targetRecipientId || '',
      receiverName: targetRecipientName,
      receiverEmail: targetRecipientEmail || '',
      receiverAvatarUrl: targetRecipientAvatarUrl,
      receiverUid: targetRecipientUid || 'CU-STUDENT',
    });

    if (!success) {
      setCallState('idle');
    }
  };

  const handleAcceptCall = async () => {
    if (!activeCallSession || !currentUser) return;
    await handleAcceptCallWithSession(activeCallSession);
  };

  const handleRejectCall = async () => {
    stopAllCallSounds();
    if (activeCallSession && currentUser) {
      if (!callClientRef.current) {
        callClientRef.current = new WebRTCCallClient(currentUser.id, currentUser.email);
      }
      await callClientRef.current.rejectCall(activeCallSession);
    }
    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      setActiveCallSession(null);
      setCallDuration(0);
    }, 1500);
  };

  const handleEndCall = async () => {
    stopAllCallSounds();
    if (callClientRef.current) {
      await callClientRef.current.endCall();
    }
    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      setActiveCallSession(null);
      setCallDuration(0);
    }, 2000);
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    callClientRef.current?.setMute(next);
  };

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

    if (!isAuthenticated) {
      openAuthModal('login', 'Please sign in with your Chandigarh University ID to chat with the reporter.');
      return;
    }

    if (!messageText.trim() && !proofImageUrl) {
      setError('Please type a message or attach a snapshot before sending.');
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

      // Compute isolated 1-on-1 threadId
      const threadId = isOwner
        ? (activeThreadId || (targetRecipientId ? getItemThreadId(item.id, targetRecipientId) : getItemThreadId(item.id, 'claimant')))
        : getItemThreadId(item.id, currentUser?.id || currentUser?.email || 'claimant');

      const newMsg: ItemMessage = {
        id: `msg_${Date.now()}`,
        itemId: item.id,
        threadId,
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
        messageText: messageText.trim() || (proofImageUrl ? 'Sent a photo attachment' : ''),
        currentFoundLocation: currentFoundLocation.trim() || undefined,
        proofImageUrl: proofImageUrl || undefined,
        status: 'unread',
        createdAt: new Date().toISOString(),
      };

      saveMessage(newMsg);

      if (onMessageSent) {
        onMessageSent(newMsg);
      }

      // Reset form
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
          localStorage.setItem(`sahayak_chat_reactions_${item.id}`, JSON.stringify(updated));
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
      // Double tap detected: instant Heart reaction with burst animation
      handleToggleReaction(msgId, '❤️');
      setAnimatingHeartMsgId(msgId);
      setTimeout(() => setAnimatingHeartMsgId(null), 850);
      setActiveActionMsgId(null);
    } else {
      // Single tap: toggle action reaction dock (mobile friendly)
      setActiveActionMsgId(prev => (prev === msgId ? null : msgId));
    }
    lastTapRef.current[msgId] = now;
  };

  const itemCover = item.imageUrl || (item.imageUrls && item.imageUrls[0]) || '';

  return (
    <div 
      className="fixed inset-0 w-full h-[100dvh] z-50 bg-[#0B0F19] text-white flex flex-col overflow-hidden font-sans animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Dynamic Ambient Background Glow Elements for Glassmorphic Sheen */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-teal-500/12 blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none" />

      {/* TOP NAVIGATION BAR: High-Contrast, Clean & Readable (Full Width Utilization) */}
      <header className="sticky top-0 z-30 px-3 sm:px-6 py-2 sm:py-3 bg-[#0D1322]/95 backdrop-blur-2xl border-b border-slate-700/60 shadow-lg flex items-center justify-between gap-2.5 sm:gap-4 shrink-0">
        
        {/* Left: Prominent Back Button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="group flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-white/[0.08] hover:bg-white/[0.16] text-white border border-white/[0.12] hover:border-emerald-500/40 active:scale-95 transition-all cursor-pointer shadow-sm"
            title="Return to listings (Esc)"
            aria-label="Back to listings"
          >
            <ArrowLeft className="w-5 h-5 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Center / Main: Full-Width Interactive Profile & Item Briefing Banner */}
        <button
          type="button"
          onClick={() => setShowPartnerProfile(true)}
          className="flex-1 min-w-0 flex items-center justify-between gap-3 sm:gap-5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] hover:border-emerald-500/40 active:scale-[0.995] transition-all cursor-pointer text-left group shadow-xs"
          title={`Click to view ${chatPartnerName}'s full campus profile & credentials`}
          aria-label={`View profile of ${chatPartnerName}`}
        >
          {/* Section 1: User Avatar & Student Profile Info */}
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 shrink-0 lg:shrink">
            <div className="relative shrink-0">
              {chatPartnerAvatar && !avatarImgError ? (
                <img
                  src={chatPartnerAvatar}
                  alt={chatPartnerName}
                  className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl object-cover ring-2 ring-emerald-400/40 shadow-md group-hover:ring-emerald-400 transition-all"
                  onError={() => setAvatarImgError(true)}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-800 text-white font-black text-xs sm:text-base flex items-center justify-center ring-2 ring-emerald-400/40 shadow-md group-hover:ring-emerald-400 transition-all">
                  {chatPartnerName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400 ring-2 ring-[#0D1322] absolute -bottom-0.5 -right-0.5 shadow-xs" title="Active on SAHAYAK" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 truncate">
                <h2 className="text-sm sm:text-base font-extrabold text-white truncate leading-tight group-hover:text-emerald-300 transition-colors">
                  {chatPartnerName}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span className="hidden sm:inline">CU Verified</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                <span className="font-mono text-emerald-300">{chatPartnerUid}</span>
                <span className="text-slate-500 hidden sm:inline">•</span>
                <span className="text-slate-400 hidden sm:inline truncate">{chatPartnerRole}</span>
                <span className="text-slate-500 sm:hidden">•</span>
                <span className="text-emerald-300 sm:hidden truncate font-semibold">{item.title}</span>
              </p>
            </div>
          </div>

          {/* Section 2: Wide-Screen Item Context Card (Fills Center Space Elegantly) */}
          <div className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] min-w-0 flex-1 max-w-md lg:max-w-xl mx-2">
            {itemCover ? (
              <img
                src={itemCover}
                alt={item.title}
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/20 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4 text-slate-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider shrink-0 ${
                  item.type === 'lost' 
                    ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40' 
                    : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {item.type === 'lost' ? 'Lost Item' : 'Found Item'}
                </span>
                <span className="text-xs font-bold text-white truncate">{item.title}</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">{item.locationBlock}</span>
              </p>
            </div>
          </div>

          {/* Section 3: Action Prompt & Chevron */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 group-hover:text-emerald-300 shrink-0 pl-1">
            <span className="hidden lg:inline text-[11px] font-semibold text-slate-300 group-hover:text-white transition-colors">
              Campus Profile
            </span>
            <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Right: Calling Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Primary: In-App Peer-to-Peer Numberless Audio Call */}
          <button
            type="button"
            onClick={handleInitiateCall}
            disabled={callState !== 'idle'}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95 ${
              callState !== 'idle'
                ? 'bg-emerald-500/10 text-emerald-400/50 border border-emerald-500/20 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500/25 to-teal-500/25 hover:from-emerald-500/35 hover:to-teal-500/35 text-emerald-300 hover:text-emerald-200 border border-emerald-500/50 hover:border-emerald-400 shadow-emerald-500/10'
            }`}
            title="Start secure, 100% numberless In-App Voice Call"
            aria-label="In-App Voice Call"
          >
            <PhoneCall className={`w-4 h-4 text-emerald-400 ${callState === 'idle' ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline font-extrabold">Voice Call</span>
            <span className="sm:hidden font-bold">Call</span>
            <span className="hidden md:inline px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
              Private
            </span>
          </button>

          {/* Secondary: Cellular Dial fallback only if available and not hidden */}
          {!item.hidePhone && chatPartnerPhone && (
            <a
              href={`tel:${chatPartnerPhone}`}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.1] transition-all text-xs"
              title={`Direct cellular dial: ${chatPartnerPhone}`}
              aria-label="Cellular phone"
            >
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-medium text-slate-400">Cellular</span>
            </a>
          )}
        </div>
      </header>

      {/* WEB-RTC IN-APP AUDIO CALL DOCK / ACTIVE CALL CONTROLS */}
      {callState !== 'idle' && (
        <div className="z-25 px-3 sm:px-6 py-2.5 bg-gradient-to-r from-slate-900/98 via-[#0D1527]/98 to-slate-900/98 backdrop-blur-2xl border-b border-emerald-500/30 shadow-2xl transition-all animate-in slide-in-from-top-3 duration-200">
          
          {/* Outgoing Call State */}
          {callState === 'outgoing' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl mx-auto py-1">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  {chatPartnerAvatar ? (
                    <img src={chatPartnerAvatar} alt="" className="w-11 h-11 rounded-2xl object-cover ring-2 ring-emerald-400" />
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-emerald-700 text-white font-bold flex items-center justify-center text-sm">
                      {chatPartnerName.charAt(0)}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900 animate-ping" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-sm truncate">
                      Calling {chatPartnerName}...
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                      <Radio className="w-2.5 h-2.5 text-emerald-400" />
                      Ringing
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 flex items-center gap-1.5 mt-0.5">
                    <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Numberless Voice Call • Re: <span className="text-white font-semibold">{item.title}</span></span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isMuted
                      ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50'
                      : 'bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 border border-white/[0.12]'
                  }`}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-slate-300" />}
                  <span>{isMuted ? 'Muted' : 'Mute'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleEndCall}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-extrabold shadow-lg shadow-rose-900/40 transition-all cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>Cancel Call</span>
                </button>
              </div>
            </div>
          )}

          {/* Incoming Call State */}
          {callState === 'incoming' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl mx-auto py-1">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  {chatPartnerAvatar ? (
                    <img src={chatPartnerAvatar} alt="" className="w-11 h-11 rounded-2xl object-cover ring-2 ring-emerald-400 animate-pulse" />
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-emerald-700 text-white font-bold flex items-center justify-center text-sm">
                      {chatPartnerName.charAt(0)}
                    </div>
                  )}
                  <span className="absolute -inset-1 rounded-2xl border-2 border-emerald-400/60 animate-ping pointer-events-none" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-white text-sm sm:text-base truncate">
                      Incoming Call from {chatPartnerName}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 animate-pulse">
                      <PhoneIncoming className="w-3 h-3 text-emerald-400" />
                      Incoming
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 flex items-center gap-1.5 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>In-App Audio Call • Item: <span className="text-white font-semibold">{item.title}</span></span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleRejectCall}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 active:scale-95 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>Decline</span>
                </button>
                <button
                  type="button"
                  onClick={handleAcceptCall}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-white text-xs font-black shadow-lg shadow-emerald-600/40 ring-2 ring-emerald-400/50 transition-all cursor-pointer animate-pulse"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Accept Voice Call</span>
                </button>
              </div>
            </div>
          )}

          {/* Connected Call State */}
          {callState === 'connected' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl mx-auto py-1">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  {chatPartnerAvatar ? (
                    <img src={chatPartnerAvatar} alt="" className="w-11 h-11 rounded-2xl object-cover ring-2 ring-emerald-400 shadow-md" />
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-emerald-700 text-white font-bold flex items-center justify-center text-sm">
                      {chatPartnerName.charAt(0)}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-extrabold text-white text-sm sm:text-base truncate">
                      {chatPartnerName}
                    </span>
                    {/* Live Voice Waves Equalizer Animation */}
                    <div className="flex items-center gap-0.5 px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/40" title="Audio connected">
                      <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-0.5 h-4 bg-emerald-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-0.5 h-2.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      <span className="w-0.5 h-3.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:75ms]" />
                    </div>
                    <span className="font-mono font-black text-emerald-300 text-sm tracking-wider">
                      {formatCallDuration(callDuration)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 flex items-center gap-1.5 mt-0.5">
                    <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Connected • Encrypted P2P Voice • Re: <span className="text-white font-semibold">{item.title}</span></span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isMuted
                      ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-xs'
                      : 'bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 border border-white/[0.12]'
                  }`}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                  <span>{isMuted ? 'Muted' : 'Mute'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleEndCall}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-extrabold shadow-lg shadow-rose-900/40 transition-all cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>End Call</span>
                </button>
              </div>
            </div>
          )}

          {/* Ended State */}
          {callState === 'ended' && (
            <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto py-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <PhoneOff className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white text-xs sm:text-sm">Voice Call Ended</span>
                  {callDuration > 0 && (
                    <span className="text-slate-400 text-xs ml-2">Duration: {formatCallDuration(callDuration)}</span>
                  )}
                </div>
              </div>
              <span className="text-[11px] text-slate-400">Call record logged to 1-on-1 thread</span>
            </div>
          )}
        </div>
      )}

      {/* Call Error Banner */}
      {callError && (
        <div className="z-25 px-4 py-2 bg-rose-950/90 border-b border-rose-500/40 text-xs text-rose-200 flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">{callError}</span>
          </div>
          <button
            type="button"
            onClick={() => setCallError(null)}
            className="p-1 rounded-md text-rose-300 hover:text-white hover:bg-rose-800/40 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* POSTER INQUIRY SELECTOR / INBOX BAR */}
      {isOwner && inquiryThreads.length > 1 && (
        <div className="px-3 sm:px-6 py-2 bg-[#0C1220]/95 backdrop-blur-xl border-b border-slate-700/60 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 z-20">
          <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-400 shrink-0 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Claimant Threads ({inquiryThreads.length}):
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
                    ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/50 shadow-sm font-bold ring-1 ring-emerald-400/40'
                    : 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 border border-white/[0.1]'
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

      {/* MAIN BODY: 2-COLUMN DESKTOP (iMessage Chat Canvas + Glass Item Sidebar) */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">

        {/* CHAT STREAM CANVAS */}
        <div className="flex-1 min-h-0 flex flex-col min-w-0 relative">
          
          {/* Messages Scroll Area */}
          <div 
            ref={messagesContainerRef}
            onClick={() => setActiveActionMsgId(null)}
            className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-8 py-3 sm:py-4 space-y-3.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent flex flex-col"
          >
            
            {/* Top Item Summary Notice Pill (iMessage Context) */}
            <div className="max-w-md mx-auto my-1.5 p-3 sm:p-3.5 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.12] text-xs text-white/90 shadow-lg text-center space-y-1 shrink-0">
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-extrabold text-[11px] uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Private 1-on-1 Dialogue Channel</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed font-medium">
                {isOwner
                  ? `Isolated dialogue with ${chatPartnerName}. Other students cannot view this conversation.`
                  : `Private inquiry with ${chatPartnerName} (${item.userName}). Only you and the item poster can access this thread.`}
              </p>
            </div>

            {/* Date Separator Pill */}
            <div className="flex justify-center my-1.5 shrink-0">
              <span className="px-3.5 py-0.5 rounded-full bg-white/[0.08] backdrop-blur-md text-slate-300 text-[11px] font-semibold border border-white/[0.12] shadow-2xs">
                {new Date(item.dateTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {/* Empty Thread / Auth Gate State */}
            {!isAuthenticated ? (
              <div className="py-16 px-4 text-center space-y-4 max-w-sm mx-auto my-auto animate-in fade-in">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
                  <Lock className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-black text-white">Private 1-on-1 Student Chat</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  To protect student privacy, item communications are restricted to private 1-on-1 dialogues. Sign in with your Chandigarh University account to view or start this discussion.
                </p>
                <button
                  type="button"
                  onClick={() => openAuthModal('login', 'Please sign in with your Chandigarh University ID to chat with the reporter.')}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer transition-all"
                >
                  Sign In with CU ID
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-4 max-w-sm mx-auto my-auto">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
                  {isOwner ? <Users className="w-8 h-8" /> : <MessageSquare className="w-8 h-8" />}
                </div>
                <h3 className="text-lg font-black text-white">
                  {isOwner ? 'No Claimant Inquiries Yet' : 'Start Private Campus Conversation'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  {isOwner
                    ? 'No inquiries yet for this item. When students message you or submit an ownership claim, their private 1-on-1 threads will appear here.'
                    : `Have you spotted or recovered this ${item.title}? Reach out to ${chatPartnerName} with custody spot and return instructions. Only ${chatPartnerName} will see your messages.`}
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
                    {/* Timestamp & Sender Name */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 px-1.5">
                      <span className="font-bold text-slate-200">
                        {isFromMe ? 'You' : msg.senderName}
                      </span>
                      {msg.senderUid && (
                        <span className="font-mono text-[10px] text-slate-400">
                          ({msg.senderUid})
                        </span>
                      )}
                      <span>·</span>
                      <span className="text-[10px]">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Speech Bubble Container with Reaction Button Anchor */}
                    <div className="relative max-w-[88%] sm:max-w-[70%]">
                      {/* Modern iMessage Bubble */}
                      <div
                        onClick={() => handleBubbleInteraction(msg.id)}
                        className={`p-3.5 sm:p-4 rounded-3xl space-y-2.5 transition-all text-xs sm:text-sm font-normal leading-relaxed cursor-pointer select-text relative ${
                          isFromMe
                            ? 'bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white rounded-tr-xs shadow-lg shadow-emerald-950/40 border border-emerald-400/25 active:brightness-95'
                            : 'bg-white/[0.1] hover:bg-white/[0.14] text-slate-100 backdrop-blur-2xl border border-white/[0.16] rounded-tl-xs shadow-md active:bg-white/[0.16]'
                        }`}
                        title="Double-tap to heart • Tap to react"
                      >
                        {/* Double tap heart pop animation */}
                        {animatingHeartMsgId === msg.id && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in zoom-in-50 fade-in duration-150">
                            <span className="text-5xl animate-bounce drop-shadow-[0_4px_16px_rgba(244,63,94,0.9)]">
                              ❤️
                            </span>
                          </div>
                        )}

                        {msg.messageText.startsWith('📞 In-App Voice Call:') ? (
                          <div className="flex items-center gap-2.5 py-1">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              msg.messageText.includes('Declined') || msg.messageText.includes('Cancelled')
                                ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                                : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                            }`}>
                              {msg.messageText.includes('Declined') || msg.messageText.includes('Cancelled') ? (
                                <PhoneOff className="w-4 h-4 text-rose-400" />
                              ) : (
                                <PhoneCall className="w-4 h-4 text-emerald-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="font-extrabold text-xs block leading-tight">
                                {msg.messageText.replace('📞 In-App Voice Call:', '').trim() || 'In-App Voice Call'}
                              </span>
                              <span className="text-[10px] opacity-80 flex items-center gap-1 mt-0.5 font-medium">
                                <Lock className="w-2.5 h-2.5 text-emerald-400" />
                                <span>Numberless & Encrypted Audio</span>
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">
                            {msg.messageText}
                          </p>
                        )}

                        {/* Custody / Campus Meeting Spot Badge */}
                        {msg.currentFoundLocation && (
                          <div className={`flex items-center gap-2 p-2.5 rounded-2xl text-xs font-bold ${
                            isFromMe 
                              ? 'bg-black/25 text-emerald-100 border border-white/15' 
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}>
                            <Building2 className="w-4 h-4 shrink-0 text-emerald-400" />
                            <div className="min-w-0">
                              <span className="text-[10px] opacity-80 uppercase tracking-wider block font-extrabold">Handover Custody Point</span>
                              <span className="truncate block font-semibold">{msg.currentFoundLocation}</span>
                            </div>
                          </div>
                        )}

                        {/* Photo Snapshot Attachment */}
                        {msg.proofImageUrl && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPhotoPreview(msg.proofImageUrl || null);
                              }}
                              className="group/photo relative block rounded-2xl overflow-hidden border border-white/20 shadow-md max-w-xs cursor-pointer"
                            >
                              <img
                                src={msg.proofImageUrl}
                                alt="Finder snapshot"
                                className="w-full max-h-48 object-cover group-hover/photo:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                                <Maximize2 className="w-4 h-4" />
                                <span>Expand Photo</span>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Floating Reaction Pill if added */}
                      {currentReaction ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleReaction(msg.id, currentReaction);
                          }}
                          className={`absolute -bottom-2.5 ${isFromMe ? 'left-2' : 'right-2'} px-2 py-0.5 rounded-full bg-slate-900/95 hover:bg-slate-800 border border-white/25 text-xs shadow-md flex items-center gap-1 z-10 active:scale-75 transition-transform cursor-pointer touch-manipulation`}
                          title="Tap to remove reaction"
                        >
                          <span>{currentReaction}</span>
                        </button>
                      ) : (
                        /* Mobile-only subtle quick heart trigger button */
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleReaction(msg.id, '❤️');
                            setAnimatingHeartMsgId(msg.id);
                            setTimeout(() => setAnimatingHeartMsgId(null), 850);
                          }}
                          className={`sm:hidden absolute -bottom-2 ${isFromMe ? 'left-2' : 'right-2'} p-1 rounded-full bg-slate-900/90 border border-white/20 text-rose-400 hover:text-rose-300 active:scale-75 transition-transform shadow-xs z-10 touch-manipulation`}
                          title="Heart this message"
                          aria-label="Heart this message"
                        >
                          <Heart className="w-3 h-3 fill-rose-400/40 text-rose-400" />
                        </button>
                      )}

                      {/* Action & Reaction Bar (Touch-friendly on mobile & Desktop hover) */}
                      <div
                        className={`absolute z-30 transition-all duration-200 ${
                          activeActionMsgId === msg.id
                            ? 'opacity-100 scale-100 pointer-events-auto'
                            : 'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'
                        } ${
                          isFromMe
                            ? '-top-9 right-1 sm:top-1/2 sm:-translate-y-1/2 sm:right-auto sm:-left-24'
                            : '-top-9 left-1 sm:top-1/2 sm:-translate-y-1/2 sm:left-auto sm:-right-24'
                        } flex items-center gap-1 p-1 rounded-full bg-slate-900/95 backdrop-blur-xl border border-white/25 shadow-xl`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleReaction(msg.id, '👍');
                            setActiveActionMsgId(null);
                          }}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-transform active:scale-75 cursor-pointer touch-manipulation ${
                            currentReaction === '👍' ? 'bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-400' : 'bg-white/10 hover:bg-white/20 text-white'
                          }`}
                          title="Like"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleReaction(msg.id, '❤️');
                            setAnimatingHeartMsgId(msg.id);
                            setTimeout(() => setAnimatingHeartMsgId(null), 850);
                            setActiveActionMsgId(null);
                          }}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-transform active:scale-75 cursor-pointer touch-manipulation ${
                            currentReaction === '❤️' ? 'bg-rose-500/30 text-rose-300 ring-1 ring-rose-400' : 'bg-white/10 hover:bg-white/20 text-rose-400'
                          }`}
                          title="Heart"
                        >
                          <Heart className="w-3.5 h-3.5 fill-rose-400" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyMessage(msg.id, msg.messageText);
                            setActiveActionMsgId(null);
                          }}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-transform active:scale-75 cursor-pointer touch-manipulation"
                          title="Copy text"
                        >
                          {copiedMsgId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Delivery Status Indicator for outgoing message */}
                    {isFromMe && index === messages.length - 1 && (
                      <span className="text-[10px] text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" />
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

        {/* QUICK SUGGESTIONS CAROUSEL RIBBON */}
        <div className="px-3 sm:px-6 py-1.5 bg-[#0D1322]/80 backdrop-blur-md border-t border-slate-700/50 flex items-center gap-2 overflow-x-auto scrollbar-none no-scrollbar shrink-0">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Quick:
          </span>
          {QUICK_SUGGESTIONS.map((text, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setMessageText(text);
                textareaRef.current?.focus();
              }}
              className="px-3 py-1 rounded-full bg-white/[0.08] hover:bg-emerald-500/25 text-slate-200 hover:text-white border border-white/[0.12] hover:border-emerald-500/40 text-xs font-semibold whitespace-nowrap transition-all shrink-0 active:scale-95 cursor-pointer shadow-xs"
            >
              {text}
            </button>
          ))}
        </div>

        {/* FLOATING GLASSMORPHIC COMPOSER DOCK */}
        <div className="p-2.5 sm:p-4 pb-2.5 sm:pb-3 bg-[#0D1322]/95 backdrop-blur-2xl border-t border-slate-700/60 shrink-0 space-y-2">
            {error && (
              <div className="p-3 bg-rose-500/25 border border-rose-500/40 text-rose-200 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Meetup Spot Picker Expandable Bar */}
            {showLocationPicker && (
              <div className="p-3.5 bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-2xl space-y-2 animate-in slide-in-from-bottom-2 shadow-lg">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    <span>Select Campus Meetup / Custody Spot</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowLocationPicker(false)}
                    className="text-slate-300 hover:text-white text-xs font-semibold"
                  >
                    Done
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {POPULAR_CAMPUS_SPOTS.map((spot, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentFoundLocation(spot)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        currentFoundLocation === spot
                          ? 'bg-emerald-500 text-white shadow-xs font-bold'
                          : 'bg-white/[0.08] hover:bg-white/[0.14] text-slate-200 border border-white/[0.1]'
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
                  placeholder="Or type custom campus spot..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 font-medium"
                />
              </div>
            )}

            {/* Attached Photo Preview Chip */}
            {proofImageUrl && (
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <img src={proofImageUrl} alt="Attachment preview" className="w-10 h-10 rounded-xl object-cover border border-emerald-400/50" />
                  <span className="text-xs text-emerald-200 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Photo snapshot attached
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setProofImageUrl('')}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}

            {/* Main Form Bar */}
            <form onSubmit={handleSendMessage} className="flex items-end gap-2 sm:gap-3">
              {/* Attachment Actions (Location & Camera) */}
              <div className="flex items-center gap-1 sm:gap-1.5 pb-1">
                {/* Spot selector button */}
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(prev => !prev)}
                  className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                    currentFoundLocation || showLocationPicker
                      ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-300 shadow-sm'
                      : 'bg-white/[0.08] hover:bg-white/[0.14] border-white/[0.12] text-slate-300 hover:text-white'
                  }`}
                  title="Add meetup location"
                  aria-label="Add location"
                >
                  <Building2 className="w-4 h-4 text-emerald-400" />
                </button>

                {/* Photo attachment button */}
                <label
                  htmlFor={fileInputId}
                  className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                    proofImageUrl
                      ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-300 shadow-sm'
                      : 'bg-white/[0.08] hover:bg-white/[0.14] border-white/[0.12] text-slate-300 hover:text-white'
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

              {/* Textarea Composer */}
              <div className="flex-1 relative bg-slate-800/80 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-2 sm:p-2.5 focus-within:border-emerald-400/60 focus-within:ring-2 focus-within:ring-emerald-500/30 transition-all shadow-inner">
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
                      : 'Sign in to send messages...'
                  }
                  className="w-full bg-transparent text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none resize-none max-h-28 font-medium px-2 py-0.5 leading-relaxed"
                />

                {uploading && (
                  <span className="text-[11px] text-emerald-400 font-medium px-2 block animate-pulse">
                    Uploading snapshot attachment...
                  </span>
                )}
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={submitting || (!messageText.trim() && !proofImageUrl)}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-90 text-white flex items-center justify-center transition-all shadow-lg shadow-emerald-500/30 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Send message (Enter)"
                aria-label="Send message"
              >
                <Send className="w-5 h-5 text-white -mr-0.5" />
              </button>
            </form>
          </div>

        </div>

        {/* RIGHT SIDEBAR: ITEM DOSSIER & CONTEXT PANEL (Desktop / Collapsible) */}
        {showItemSidebar && (
          <aside className="w-80 lg:w-96 bg-[#0E1528]/85 backdrop-blur-2xl border-l border-slate-700/60 p-5 sm:p-6 overflow-y-auto hidden md:flex flex-col space-y-5 shrink-0 animate-in slide-in-from-right duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                Item Briefing
              </span>
              <span className="text-xs text-slate-300 font-mono">
                #{item.id.slice(-6).toUpperCase()}
              </span>
            </div>

            {/* Thumbnail Preview with Full Photo Click */}
            <div className="relative aspect-16/10 rounded-2xl overflow-hidden border border-slate-700 bg-black/40 shadow-md group">
              {itemCover ? (
                <img src={itemCover} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <ImageIcon className="w-8 h-8 mb-1" />
                  <span className="text-xs font-bold">No Cover Image</span>
                </div>
              )}
              
              <div className="absolute top-2.5 left-2.5">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                  item.type === 'lost' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {item.type === 'lost' ? 'Lost Item' : 'Found Item'}
                </span>
              </div>
            </div>

            {/* Item Title & Specs */}
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-white leading-snug">
                {item.title}
              </h3>
              <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Core Specs Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
                <span className="font-extrabold text-white truncate block">{item.category}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Color</span>
                <span className="font-extrabold text-white truncate block">{item.color}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-0.5 col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Reported Location</span>
                <span className="font-bold text-white truncate block flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{item.locationBlock}</span>
                </span>
              </div>
            </div>

            {/* Safe Custody Note if Found */}
            {item.type === 'found' && item.currentHoldingLocation && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/35 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-300 font-extrabold text-[10px] uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Safe Custody Holding Desk</span>
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
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.12] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <span>Open Full Item Listing View</span>
                <ChevronRight className="w-4 h-4 text-emerald-400" />
              </button>
            )}

            {/* Reporter Contact Information (Clickable to view full profile) */}
            <div className="pt-2 border-t border-slate-700/60 space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Reporter Identity
              </span>
              <button
                type="button"
                onClick={() => setShowPartnerProfile(true)}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.06] transition-colors text-left cursor-pointer group/rep"
              >
                <div className="relative shrink-0">
                  {chatPartnerAvatar && !avatarImgError ? (
                    <img
                      src={chatPartnerAvatar}
                      alt={chatPartnerName}
                      className="w-10 h-10 rounded-xl object-cover ring-1.5 ring-emerald-400/40 shadow-xs"
                      onError={() => setAvatarImgError(true)}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-slate-800 text-white font-black text-sm flex items-center justify-center shadow-xs">
                      {chatPartnerName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0D1322] absolute -bottom-0.5 -right-0.5" />
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <span className="font-extrabold text-white truncate block group-hover/rep:text-emerald-300 transition-colors">
                    {chatPartnerName}
                  </span>
                  <span className="text-slate-400 text-[11px] block">{chatPartnerUid}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover/rep:text-emerald-400 group-hover/rep:translate-x-0.5 transition-all" />
              </button>
            </div>

          </aside>
        )}

      </div>

      {/* FULL CONTACT PROFILE MODAL (Triggered by Clicking Header Profile) */}
      {showPartnerProfile && (
        <div 
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setShowPartnerProfile(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="partner-profile-title"
        >
          <div 
            className="relative w-full max-w-md bg-[#0F172A] border border-white/20 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-5 animate-in zoom-in-95 duration-200 text-white"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
                <User className="w-4 h-4 text-emerald-400" />
                <span id="partner-profile-title">Campus Chat Contact Profile</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPartnerProfile(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close profile"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Avatar & Identity Card */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.06] border border-white/10">
              <div className="relative shrink-0">
                {chatPartnerAvatar && !avatarImgError ? (
                  <img
                    src={chatPartnerAvatar}
                    alt={chatPartnerName}
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-400/50 shadow-md"
                    onError={() => setAvatarImgError(true)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black text-xl flex items-center justify-center ring-2 ring-emerald-400/40 shadow-md">
                    {chatPartnerName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-[#0F172A] absolute -bottom-1 -right-1" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-white truncate">
                    {chatPartnerName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    CU Verified
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Chandigarh University Student
                </p>
                <span className="inline-block mt-1 text-[11px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  UID: {chatPartnerUid}
                </span>
              </div>
            </div>

            {/* Verified Details Grid */}
            <div className="space-y-2.5 text-xs">
              {/* Role in this report */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <span className="text-slate-400 font-medium">Role in Thread:</span>
                <span className="font-extrabold text-white">{chatPartnerRole}</span>
              </div>

              {/* Institutional Email */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Institutional Email:</span>
                </span>
                <span className="font-mono text-emerald-300 font-semibold truncate max-w-[190px]">
                  {chatPartnerEmail || 'student@cuchd.in'}
                </span>
              </div>

              {/* Phone Status */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Contact Number:</span>
                </span>
                {(!isOwner && item.hidePhone) ? (
                  <span className="text-amber-300 font-bold flex items-center gap-1">
                    <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kept Private</span>
                  </span>
                ) : chatPartnerPhone ? (
                  <a
                    href={`tel:${chatPartnerPhone}`}
                    className="font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline"
                  >
                    <span>{chatPartnerPhone}</span>
                  </a>
                ) : (
                  <span className="text-slate-400 font-medium">In-app chat only</span>
                )}
              </div>
            </div>

            {/* Associated Report Card */}
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Associated Campus Item
              </span>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/10 overflow-hidden shrink-0 border border-white/10">
                  {itemCover ? (
                    <img src={itemCover} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/40">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <h4 className="font-bold text-white truncate">{item.title}</h4>
                  <p className="text-slate-400 text-[11px] truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{item.locationBlock}</span>
                  </p>
                </div>
              </div>

              {onViewItemDetails && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPartnerProfile(false);
                    onViewItemDetails(item);
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>View Full Listing Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Campus Security Footnote */}
            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              🛡️ All communication on SAHAYAK is logged under university safety protocols. Always meet at campus security gates for item handover.
            </p>
          </div>
        </div>
      )}

      {/* FULL-SIZE PHOTO ATTACHMENT LIGHTBOX */}
      {selectedPhotoPreview && (
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in"
          onClick={() => setSelectedPhotoPreview(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl border border-white/20"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPhotoPreview(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black text-white transition-colors cursor-pointer border border-white/20"
              aria-label="Close photo preview"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedPhotoPreview}
              alt="Verification Snapshot Full View"
              className="max-h-[80vh] w-auto rounded-3xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
