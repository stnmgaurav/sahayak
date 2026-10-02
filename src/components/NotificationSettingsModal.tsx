import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellRing, 
  BellOff, 
  CheckCircle2, 
  AlertCircle, 
  Volume2, 
  X, 
  Smartphone, 
  Monitor, 
  Sparkles, 
  Loader2, 
  Check,
  ShieldCheck,
  Info
} from 'lucide-react';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendTestPushNotification, 
  playNotificationChime,
  NotificationPermissionState,
  isNotificationSupported 
} from '../lib/notifications';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [isRequesting, setIsRequesting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sahayak_sound_alert_enabled') !== 'false';
    }
    return true;
  });

  const supported = isNotificationSupported();

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
      setTestSent(false);
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result === 'granted') {
        // Send a celebratory test notification
        await sendTestPushNotification();
        setTestSent(true);
      }
    } catch (e) {
      console.warn('Error requesting permission:', e);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSendTest = async () => {
    setIsTesting(true);
    try {
      const ok = await sendTestPushNotification();
      if (ok) {
        setTestSent(true);
        setTimeout(() => setTestSent(false), 5000);
      }
    } catch (e) {
      console.warn('Failed to send test push notification:', e);
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sahayak_sound_alert_enabled', next ? 'true' : 'false');
    }
    if (next) {
      playNotificationChime();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="push-settings-title"
    >
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden my-auto flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header with Prominent Close Button */}
        <div className="sticky top-0 z-30 shrink-0 bg-gradient-to-r from-red-800 via-red-900 to-slate-900 text-white p-4 sm:p-6 pr-14 relative border-b border-red-800/40">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-white/90 hover:text-white rounded-full bg-white/10 hover:bg-white/25 active:scale-95 transition-all cursor-pointer ring-1 ring-white/20 shadow-sm"
            aria-label="Close dialog"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-2 text-xs font-bold tracking-wider uppercase text-red-200 mb-1.5">
            <ShieldCheck className="w-4 h-4 text-red-300" />
            <span>Alert System</span>
          </div>
          
          <h2 id="push-settings-title" className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2.5">
            <BellRing className="w-6 h-6 text-amber-300 animate-pulse" />
            Push Notifications
          </h2>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto overscroll-contain">
          {/* Status Card */}
          <div className={`p-4 rounded-2xl border transition-all ${
            permission === 'granted'
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : permission === 'denied'
              ? 'bg-rose-50/80 border-rose-200 text-rose-950'
              : 'bg-amber-50/80 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                permission === 'granted'
                  ? 'bg-emerald-600 text-white'
                  : permission === 'denied'
                  ? 'bg-rose-600 text-white'
                  : 'bg-amber-500 text-white'
              }`}>
                {permission === 'granted' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : permission === 'denied' ? (
                  <BellOff className="w-5 h-5" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold tracking-tight">
                    {permission === 'granted'
                      ? 'Push Notifications Active'
                      : permission === 'denied'
                      ? 'Notifications Blocked'
                      : 'Notifications Not Enabled'}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                    permission === 'granted'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : permission === 'denied'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {permission}
                  </span>
                </div>
                
                <p className="text-xs mt-1 leading-relaxed opacity-90 font-medium">
                  {permission === 'granted' &&
                    'Your browser is configured to receive instant desktop and mobile notifications when someone chats about your lost or found belongings.'}
                  {permission === 'denied' &&
                    'Alerts were blocked in your browser site settings. Click the lock/info icon in your address bar to re-allow notifications for this site.'}
                  {permission === 'default' &&
                    'Enable push alerts to be notified instantly when a finder sends a message, current holding spot, or photo of your lost item.'}
                  {permission === 'unsupported' &&
                    'Your current browser or container environment does not support the Web Notification API.'}
                </p>
              </div>
            </div>

            {/* Action CTA inside Status Box */}
            <div className="mt-4 pt-3 border-t border-black/5 flex flex-wrap gap-2.5 items-center justify-end">
              {permission !== 'granted' && supported && (
                <button
                  onClick={handleRequestPermission}
                  disabled={isRequesting}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 active:scale-95 text-white rounded-full text-xs font-extrabold flex items-center justify-center gap-2 shadow-md shadow-rose-600/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isRequesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Requesting Permission...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Enable Push Notifications</span>
                    </>
                  )}
                </button>
              )}

              {permission === 'granted' && (
                <button
                  onClick={handleSendTest}
                  disabled={isTesting}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white rounded-full text-xs font-extrabold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isTesting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : testSent ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <BellRing className="w-3.5 h-3.5" />
                  )}
                  <span>{testSent ? 'Alert Dispatched!' : 'Send Test Notification'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Audio Chime Setting */}
          <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                <Volume2 className="w-4 h-4 text-red-700" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-900">Play University Chime Sound</p>
                <p className="text-[11px] text-slate-500 font-medium">Subtle harmonic tone when a message arrives</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={playNotificationChime}
                className="px-3 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-full border border-slate-200 transition-colors cursor-pointer"
                title="Preview sound tone"
              >
                Preview
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={soundEnabled}
                onClick={handleToggleSound}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  soundEnabled ? 'bg-red-800' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    soundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Educational Checklist */}
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-extrabold text-slate-900 text-[11px] uppercase tracking-wider">
              <Info className="w-3.5 h-3.5 text-red-600" />
              <span>How Background Alerts Work:</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-2">
                <Monitor className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  <strong className="text-slate-900">Desktop &amp; Laptop:</strong> Alerts pop up natively in your OS notification center even if your browser is minimized or you are on another tab.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-2">
                <Smartphone className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  <strong className="text-slate-900">Mobile Devices:</strong> Tapping the notification automatically wakes SAHAYAK and loads the direct message thread.
                </p>
              </div>
            </div>
          </div>

          {testSent && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in duration-150">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Test notification dispatched to your system tray &amp; speakers!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium">Chandigarh University SAHAYAK System</span>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 text-white font-extrabold rounded-full transition-all cursor-pointer active:scale-95 shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
