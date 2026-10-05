// WebRTC In-App Private Audio Calling Engine for SAHAYAK
// 100% Numberless, Peer-to-Peer Encrypted Voice Calling
import { doc, setDoc, updateDoc, onSnapshot, getDoc, collection, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { saveMessage, saveCallRecord, getStoredCalls, deleteCallRecord, clearCallHistory } from './storage';
import { ItemMessage } from '../types';

export { getStoredCalls, saveCallRecord, deleteCallRecord, clearCallHistory };

export interface WebRTCCallSession {
  callId: string;
  threadId: string;
  itemId: string;
  itemTitle: string;
  callerId: string;
  callerName: string;
  callerEmail: string;
  callerAvatarUrl?: string;
  callerUid?: string;
  receiverId: string;
  receiverName: string;
  receiverEmail: string;
  receiverAvatarUrl?: string;
  receiverUid?: string;
  status: 'ringing' | 'connected' | 'ended' | 'rejected' | 'busy' | 'missed';
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  callerCandidates?: RTCIceCandidateInit[];
  receiverCandidates?: RTCIceCandidateInit[];
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
}

const CALLS_STORAGE_PREFIX = 'sahayak_call_';
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

// Cross-tab / fast local signaling broadcast channel
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('sahayak_call_signaling_v1');
  } catch (err) {
    console.warn('WebRTC Call BroadcastChannel fallback:', err);
  }
}

// Sound Synthesizers using Web Audio API
let activeAudioCtx: AudioContext | null = null;
let activeRingInterval: any = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!activeAudioCtx || activeAudioCtx.state === 'closed') {
    activeAudioCtx = new AudioCtx();
  }
  if (activeAudioCtx.state === 'suspended') {
    activeAudioCtx.resume().catch(() => {});
  }
  return activeAudioCtx;
}

export function stopAllCallSounds() {
  if (activeRingInterval) {
    clearInterval(activeRingInterval);
    activeRingInterval = null;
  }
}

export function playOutgoingRingSound() {
  stopAllCallSounds();
  const playTone = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Dual-frequency US/Campus ring tone: 440Hz + 480Hz
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.setValueAtTime(0.08, now + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.35);
      osc2.stop(now + 1.35);
    } catch {
      // Audio autoplay policy catch
    }
  };

  playTone();
  activeRingInterval = setInterval(playTone, 3000);
}

export function playIncomingRingtoneSound() {
  stopAllCallSounds();
  const playChimeSequence = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Melodic incoming bell: E5 (659Hz) -> G#5 (830Hz) -> B5 (987Hz)
      const freqs = [659.25, 830.61, 987.77, 830.61];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.16;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    } catch {
      // ignore
    }
  };

  playChimeSequence();
  activeRingInterval = setInterval(playChimeSequence, 2600);
}

export function playCallConnectedSound() {
  stopAllCallSounds();
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12); // C6

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.32);
  } catch {
    // ignore
  }
}

export function playCallEndedSound() {
  stopAllCallSounds();
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [440, 370, 311].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.12;

      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  } catch {
    // ignore
  }
}

/**
 * Creates or updates a call session in Firestore + Local signaling
 */
export async function saveCallSession(session: WebRTCCallSession): Promise<void> {
  // 1. Local caching and fast broadcast
  try {
    if (session.status === 'ended' || session.status === 'rejected') {
      localStorage.removeItem(`${CALLS_STORAGE_PREFIX}${session.callId}`);
    } else {
      localStorage.setItem(`${CALLS_STORAGE_PREFIX}${session.callId}`, JSON.stringify(session));
    }
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'CALL_UPDATE', session });
    }
    // Update persistent call history log safely
    saveCallRecord(session);
  } catch {
    // ignore
  }

  // 2. Firestore real-time synchronization
  try {
    const callRef = doc(db, 'calls', session.callId);
    await setDoc(callRef, JSON.parse(JSON.stringify(session)), { merge: true });
  } catch (err) {
    console.warn('Could not synchronize call session to Firestore:', err);
  }
}

/**
 * Subscribe to incoming calls targeted to the authenticated student
 */
export function subscribeToIncomingCalls(
  currentUserId: string,
  currentUserEmail: string,
  onIncomingCall: (call: WebRTCCallSession) => void
): () => void {
  const uId = (currentUserId || '').trim().toLowerCase();
  const uEmail = (currentUserEmail || '').trim().toLowerCase();

  // 1. BroadcastChannel listener
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data && event.data.type === 'CALL_UPDATE' && event.data.session) {
      const session: WebRTCCallSession = event.data.session;
      const isTarget = 
        (session.receiverId && session.receiverId.toLowerCase() === uId) ||
        (session.receiverEmail && session.receiverEmail.toLowerCase() === uEmail);
      
      if (isTarget && session.status === 'ringing') {
        onIncomingCall(session);
      }
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  // 2. Storage event listener (across browser tabs)
  const handleStorage = (e: StorageEvent) => {
    if (e.key && e.key.startsWith(CALLS_STORAGE_PREFIX) && e.newValue) {
      try {
        const session: WebRTCCallSession = JSON.parse(e.newValue);
        const isTarget = 
          (session.receiverId && session.receiverId.toLowerCase() === uId) ||
          (session.receiverEmail && session.receiverEmail.toLowerCase() === uEmail);
        if (isTarget && session.status === 'ringing') {
          onIncomingCall(session);
        }
      } catch {
        // ignore
      }
    }
  };
  window.addEventListener('storage', handleStorage);

  // 3. Firestore query listener for remote incoming calls across physical devices
  let firestoreUnsub: (() => void) | null = null;
  try {
    if (uId || uEmail) {
      const callsQuery = query(
        collection(db, 'calls'),
        where('status', '==', 'ringing')
      );
      firestoreUnsub = onSnapshot(callsQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const session = change.doc.data() as WebRTCCallSession;
            if (session.status === 'ringing') {
              const rId = (session.receiverId || '').trim().toLowerCase();
              const rEmail = (session.receiverEmail || '').trim().toLowerCase();
              const isTarget = 
                Boolean(uId && rId === uId) ||
                Boolean(uEmail && rEmail === uEmail);

              if (isTarget) {
                onIncomingCall(session);
              }
            }
          }
        });
      }, (err) => {
        console.warn('Incoming calls Firestore query listener notice:', err);
      });
    }
  } catch (err) {
    // fallback
  }

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
    window.removeEventListener('storage', handleStorage);
    if (firestoreUnsub) {
      firestoreUnsub();
    }
  };
}

/**
 * Subscribe directly to call signaling on a specific 1-on-1 thread
 * Ensures strict participant privacy and instant peer updates.
 */
export function subscribeToThreadCall(
  threadId: string,
  currentUserId: string,
  currentUserEmail: string,
  onCallUpdate: (session: WebRTCCallSession) => void
): () => void {
  if (!threadId) return () => {};
  const callId = `call_${threadId}`;
  const uId = (currentUserId || '').toLowerCase();
  const uEmail = (currentUserEmail || '').toLowerCase();

  // Strict participant verification helper
  const isAuthorizedParticipant = (session: WebRTCCallSession) => {
    const sCallerId = (session.callerId || '').toLowerCase();
    const sReceiverId = (session.receiverId || '').toLowerCase();
    const sCallerEmail = (session.callerEmail || '').toLowerCase();
    const sReceiverEmail = (session.receiverEmail || '').toLowerCase();
    return (
      (uId && (sCallerId === uId || sReceiverId === uId)) ||
      (uEmail && (sCallerEmail === uEmail || sReceiverEmail === uEmail))
    );
  };

  // 1. BroadcastChannel listener
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data && event.data.type === 'CALL_UPDATE' && event.data.session) {
      const session: WebRTCCallSession = event.data.session;
      if (session.callId === callId || session.threadId === threadId) {
        if (isAuthorizedParticipant(session)) {
          onCallUpdate(session);
        }
      }
    }
  };
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  // 2. Storage event listener (across browser tabs)
  const handleStorage = (e: StorageEvent) => {
    if (e.key === `${CALLS_STORAGE_PREFIX}${callId}` && e.newValue) {
      try {
        const session: WebRTCCallSession = JSON.parse(e.newValue);
        if (isAuthorizedParticipant(session)) {
          onCallUpdate(session);
        }
      } catch {
        // ignore
      }
    }
  };
  window.addEventListener('storage', handleStorage);

  // 3. Firestore Document onSnapshot (across different devices/browsers)
  let firestoreUnsub: (() => void) | null = null;
  try {
    const callRef = doc(db, 'calls', callId);
    firestoreUnsub = onSnapshot(callRef, (snapshot) => {
      if (snapshot.exists()) {
        const session = snapshot.data() as WebRTCCallSession;
        if (isAuthorizedParticipant(session)) {
          onCallUpdate(session);
        }
      }
    }, (err) => {
      console.warn('Thread call snapshot notice:', err);
    });
  } catch (err) {
    // fallback
  }

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
    window.removeEventListener('storage', handleStorage);
    if (firestoreUnsub) {
      firestoreUnsub();
    }
  };
}

/**
 * Main WebRTC Peer Manager class handling media and connection lifecycle
 */
export class WebRTCCallClient {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private callSession: WebRTCCallSession | null = null;
  private firestoreUnsubscribe: (() => void) | null = null;
  private timerInterval: any = null;
  private callStartTime: number = 0;
  private isCaller: boolean = false;
  private currentUserId: string = '';
  private currentUserEmail: string = '';

  public onStatusChange?: (status: WebRTCCallSession['status'], durationSec: number) => void;
  public onError?: (errorText: string) => void;
  public onRemoteStreamConnected?: () => void;

  constructor(currentUserId: string, currentUserEmail: string) {
    this.currentUserId = currentUserId;
    this.currentUserEmail = currentUserEmail;
  }

  /**
   * Start an outgoing 1-on-1 private voice call
   */
  public async startCall(params: {
    threadId: string;
    itemId: string;
    itemTitle: string;
    callerId: string;
    callerName: string;
    callerEmail: string;
    callerAvatarUrl?: string;
    callerUid?: string;
    receiverId: string;
    receiverName: string;
    receiverEmail: string;
    receiverAvatarUrl?: string;
    receiverUid?: string;
  }): Promise<boolean> {
    try {
      this.isCaller = true;
      const callId = `call_${params.threadId}`;

      // 1. Request microphone access
      await this.initLocalStream();

      // 2. Initialize RTCPeerConnection
      this.initPeerConnection(callId);

      // 3. Create initial CallSession
      const session: WebRTCCallSession = {
        callId,
        threadId: params.threadId,
        itemId: params.itemId,
        itemTitle: params.itemTitle,
        callerId: params.callerId,
        callerName: params.callerName,
        callerEmail: params.callerEmail,
        callerAvatarUrl: params.callerAvatarUrl,
        callerUid: params.callerUid,
        receiverId: params.receiverId,
        receiverName: params.receiverName,
        receiverEmail: params.receiverEmail,
        receiverAvatarUrl: params.receiverAvatarUrl,
        receiverUid: params.receiverUid,
        status: 'ringing',
        callerCandidates: [],
        receiverCandidates: [],
        createdAt: new Date().toISOString(),
      };

      // 4. Create WebRTC Offer
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await this.peerConnection!.setLocalDescription(offer);

      session.offer = {
        type: offer.type,
        sdp: offer.sdp || '',
      };

      this.callSession = session;
      await saveCallSession(session);

      playOutgoingRingSound();
      this.onStatusChange?.('ringing', 0);

      // 5. Subscribe to callee's answer and signaling
      this.listenToCallSession(callId);

      return true;
    } catch (err: any) {
      this.cleanup();
      const message = err?.name === 'NotAllowedError' 
        ? 'Microphone permission denied. Please allow microphone access to place in-app voice calls.'
        : err?.message || 'Could not initiate audio call.';
      this.onError?.(message);
      return false;
    }
  }

  /**
   * Accept an incoming 1-on-1 private voice call
   */
  public async acceptIncomingCall(session: WebRTCCallSession): Promise<boolean> {
    try {
      this.isCaller = false;
      this.callSession = session;
      stopAllCallSounds();

      // 1. Request microphone access
      await this.initLocalStream();

      // 2. Initialize PeerConnection
      this.initPeerConnection(session.callId);

      // 3. Set Remote Description from caller's offer
      if (!session.offer) {
        throw new Error('Call offer missing from signaling.');
      }
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(session.offer));

      // 4. Flush any pending ICE candidates from caller
      if (session.callerCandidates && session.callerCandidates.length > 0) {
        for (const candidate of session.callerCandidates) {
          try {
            await this.peerConnection!.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {
            // ignore candidate error
          }
        }
      }

      // 5. Create WebRTC Answer
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      const updatedSession: WebRTCCallSession = {
        ...session,
        status: 'connected',
        startedAt: new Date().toISOString(),
        answer: {
          type: answer.type,
          sdp: answer.sdp || '',
        },
      };

      this.callSession = updatedSession;
      await saveCallSession(updatedSession);

      playCallConnectedSound();
      this.startDurationTimer();
      this.onStatusChange?.('connected', 0);

      // 6. Listen to ongoing signaling (for end call or candidate updates)
      this.listenToCallSession(session.callId);

      return true;
    } catch (err: any) {
      this.cleanup();
      const message = err?.name === 'NotAllowedError'
        ? 'Microphone permission denied. Please allow microphone access to accept the call.'
        : err?.message || 'Failed to connect audio call.';
      this.onError?.(message);
      return false;
    }
  }

  /**
   * Reject an incoming call
   */
  public async rejectCall(session: WebRTCCallSession): Promise<void> {
    stopAllCallSounds();
    const rejectedSession: WebRTCCallSession = {
      ...session,
      status: 'rejected',
      endedAt: new Date().toISOString(),
    };
    await saveCallSession(rejectedSession);
    this.logCallRecord(rejectedSession, 'Call Declined');
    this.cleanup();
  }

  /**
   * End an active or ringing call
   */
  public async endCall(): Promise<void> {
    playCallEndedSound();
    const duration = this.getDurationSeconds();

    if (this.callSession) {
      const endedSession: WebRTCCallSession = {
        ...this.callSession,
        status: 'ended',
        endedAt: new Date().toISOString(),
        durationSeconds: duration,
      };
      await saveCallSession(endedSession);
      this.logCallRecord(endedSession, duration > 0 ? `Call Ended (${formatCallDuration(duration)})` : 'Call Cancelled');
    }

    this.cleanup();
  }

  /**
   * Toggle microphone mute
   */
  public setMute(muted: boolean): boolean {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
      return true;
    }
    return false;
  }

  private async initLocalStream(): Promise<void> {
    if (!this.localStream) {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    }
  }

  private initPeerConnection(callId: string): void {
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {
        // ignore
      }
    }

    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

    // Add local audio tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    // Handle remote audio stream
    this.peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        if (!this.remoteAudioElement) {
          this.remoteAudioElement = document.createElement('audio');
          this.remoteAudioElement.autoplay = true;
          (this.remoteAudioElement as any).playsInline = true;
          this.remoteAudioElement.setAttribute('playsinline', 'true');
          this.remoteAudioElement.volume = 1.0;
          this.remoteAudioElement.muted = false;
          document.body.appendChild(this.remoteAudioElement);
        }
        this.remoteAudioElement.srcObject = remoteStream;
        this.remoteAudioElement.play().catch(() => {});
        this.onRemoteStreamConnected?.();
      }
    };

    // Gather ICE Candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.callSession) {
        const candidateInit = event.candidate.toJSON();
        this.sendIceCandidate(callId, candidateInit);
      }
    };

    const handleConnected = () => {
      if (!this.timerInterval) {
        playCallConnectedSound();
        this.startDurationTimer();
        this.onStatusChange?.('connected', 0);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection?.connectionState === 'connected') {
        handleConnected();
      } else if (
        this.peerConnection?.connectionState === 'failed' ||
        this.peerConnection?.connectionState === 'closed'
      ) {
        this.endCall();
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      if (
        this.peerConnection?.iceConnectionState === 'connected' ||
        this.peerConnection?.iceConnectionState === 'completed'
      ) {
        handleConnected();
      }
    };
  }

  private async sendIceCandidate(callId: string, candidate: RTCIceCandidateInit) {
    if (!this.callSession) return;
    try {
      const field = this.isCaller ? 'callerCandidates' : 'receiverCandidates';
      const currentList = (this.callSession as any)[field] || [];
      const updatedList = [...currentList, candidate];
      (this.callSession as any)[field] = updatedList;

      // Fast broadcast
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: 'CALL_UPDATE', session: this.callSession });
      }

      // Firestore update
      const callRef = doc(db, 'calls', callId);
      await setDoc(callRef, { [field]: updatedList }, { merge: true });
    } catch {
      // ignore
    }
  }

  public getCurrentSession(): WebRTCCallSession | null {
    return this.callSession;
  }

  private listenToCallSession(callId: string) {
    // 1. BroadcastChannel listener
    const handleBroadcast = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'CALL_UPDATE' && event.data.session?.callId === callId) {
        await this.handleSignalingUpdate(event.data.session);
      }
    };
    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', handleBroadcast);
    }

    // 2. Firestore Document onSnapshot
    try {
      const callRef = doc(db, 'calls', callId);
      this.firestoreUnsubscribe = onSnapshot(callRef, async (snapshot) => {
        if (snapshot.exists()) {
          const remoteSession = snapshot.data() as WebRTCCallSession;
          await this.handleSignalingUpdate(remoteSession);
        }
      });
    } catch (err) {
      console.warn('Call signaling snapshot error:', err);
    }
  }

  private async handleSignalingUpdate(remoteSession: WebRTCCallSession) {
    // Verify privacy authorization: participant must be caller or receiver
    const uId = (this.currentUserId || '').toLowerCase();
    const uEmail = (this.currentUserEmail || '').toLowerCase();
    const isAuth =
      (uId && (remoteSession.callerId?.toLowerCase() === uId || remoteSession.receiverId?.toLowerCase() === uId)) ||
      (uEmail && (remoteSession.callerEmail?.toLowerCase() === uEmail || remoteSession.receiverEmail?.toLowerCase() === uEmail));
    if (!isAuth) {
      return;
    }

    this.callSession = { ...this.callSession, ...remoteSession };

    // If caller and received answer
    if (this.isCaller && remoteSession.status === 'connected' && remoteSession.answer && this.peerConnection) {
      if (this.peerConnection.signalingState === 'have-local-offer') {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(remoteSession.answer));
        playCallConnectedSound();
        this.startDurationTimer();
        this.onStatusChange?.('connected', 0);

        // Immediately flush any receiver candidates received so far
        if (remoteSession.receiverCandidates && remoteSession.receiverCandidates.length > 0) {
          for (const cand of remoteSession.receiverCandidates) {
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
            } catch {
              // ignore duplicate candidate
            }
          }
        }
      }
    }

    // Add remote ICE candidates
    const remoteCandidates = this.isCaller ? remoteSession.receiverCandidates : remoteSession.callerCandidates;
    if (remoteCandidates && this.peerConnection && this.peerConnection.remoteDescription) {
      for (const candidate of remoteCandidates) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // ignore duplicate candidate
        }
      }
    }

    // Handle end/reject/missed
    if (
      remoteSession.status === 'ended' ||
      remoteSession.status === 'rejected' ||
      remoteSession.status === 'busy' ||
      remoteSession.status === 'missed'
    ) {
      stopAllCallSounds();
      playCallEndedSound();
      this.onStatusChange?.(remoteSession.status, remoteSession.durationSeconds || 0);
      this.cleanup();
    }
  }

  private startDurationTimer() {
    this.callStartTime = Date.now();
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      const duration = this.getDurationSeconds();
      this.onStatusChange?.('connected', duration);
    }, 1000);
  }

  public getDurationSeconds(): number {
    if (!this.callStartTime) return 0;
    return Math.floor((Date.now() - this.callStartTime) / 1000);
  }

  private logCallRecord(session: WebRTCCallSession, label: string) {
    try {
      const newMsg: ItemMessage = {
        id: `msg_call_${Date.now()}`,
        itemId: session.itemId,
        threadId: session.threadId,
        itemTitle: session.itemTitle,
        itemType: 'lost',
        senderId: this.currentUserId,
        senderName: session.callerName,
        senderEmail: this.currentUserEmail,
        senderPhone: '',
        senderUid: session.callerUid || 'CU-STUDENT',
        senderRole: 'student',
        recipientId: this.isCaller ? session.receiverId : session.callerId,
        recipientEmail: this.isCaller ? session.receiverEmail : session.callerEmail,
        recipientName: this.isCaller ? session.receiverName : session.callerName,
        messageText: `📞 In-App Voice Call: ${label}`,
        status: 'read',
        createdAt: new Date().toISOString(),
      };
      saveMessage(newMsg);
      saveCallRecord(session);
    } catch {
      // ignore
    }
  }

  public cleanup() {
    stopAllCallSounds();
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
      this.firestoreUnsubscribe = null;
    }
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {
        // ignore
      }
      this.peerConnection = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.remoteAudioElement) {
      try {
        this.remoteAudioElement.pause();
        this.remoteAudioElement.remove();
      } catch {
        // ignore
      }
      this.remoteAudioElement = null;
    }
    this.callSession = null;
    this.callStartTime = 0;
  }
}

export function formatCallDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
