// WebRTC Calling has been removed from SAHAYAK in favor of clean, fast, and secure campus messaging.
export const stopAllCallSounds = () => {};
export const playIncomingRingtoneSound = () => {};
export const playOutgoingRingSound = () => {};
export const playCallConnectedSound = () => {};
export const playCallEndedSound = () => {};
export const formatCallDuration = (seconds: number = 0): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};
