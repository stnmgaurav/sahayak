import React, { useState, useEffect } from 'react';
import { Bell, X, MessageSquare, ArrowRight } from 'lucide-react';
import { PushNotificationPayload } from '../lib/notifications';

interface InAppNotificationBannerProps {
  onOpenChatForItem?: (itemId: string, messageId?: string) => void;
}

export const InAppNotificationBanner: React.FC<InAppNotificationBannerProps> = ({
  onOpenChatForItem,
}) => {
  const [activeAlert, setActiveAlert] = useState<PushNotificationPayload | null>(null);

  useEffect(() => {
    const handleIncoming = (e: Event) => {
      const customEvent = e as CustomEvent<PushNotificationPayload>;
      if (customEvent.detail) {
        setActiveAlert(customEvent.detail);
      }
    };

    window.addEventListener('sahayak:inapp_notification', handleIncoming);
    return () => {
      window.removeEventListener('sahayak:inapp_notification', handleIncoming);
    };
  }, []);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!activeAlert) return;
    const timer = setTimeout(() => {
      setActiveAlert(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [activeAlert]);

  if (!activeAlert) return null;

  const handleAction = () => {
    if (activeAlert.onClick) {
      activeAlert.onClick();
    } else if (activeAlert.itemId && onOpenChatForItem) {
      onOpenChatForItem(activeAlert.itemId, activeAlert.messageId);
    }
    setActiveAlert(null);
  };

  return (
    <div className="fixed top-20 sm:top-24 right-3 sm:right-6 z-[9999] max-w-sm sm:max-w-md w-[calc(100%-1.5rem)] sm:w-full pointer-events-none animate-in slide-in-from-top-4 fade-in zoom-in-95 duration-200">
      <div className="bg-slate-950/95 backdrop-blur-2xl border border-slate-700/90 text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3.5 ring-1 ring-white/15 pointer-events-auto shadow-slate-950/60">
        <div className="relative shrink-0 mt-0.5">
          {activeAlert.icon && activeAlert.icon !== '/logo.svg' ? (
            <img
              src={activeAlert.icon}
              alt="Item thumbnail"
              className="w-11 h-11 rounded-xl object-cover ring-2 ring-red-500/70 shadow-sm"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-600 via-red-700 to-red-900 text-white flex items-center justify-center shadow-sm">
              <MessageSquare className="w-5 h-5 text-amber-300" />
            </div>
          )}
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-slate-950 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-400 flex items-center gap-1">
              <Bell className="w-3 h-3" />
              <span>Campus Item Alert</span>
            </span>
            <button
              onClick={() => setActiveAlert(null)}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/15 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Dismiss notification"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight mt-0.5 truncate">
            {activeAlert.title}
          </h4>
          <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
            {activeAlert.body}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleAction}
              className="px-3.5 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <span>Open Chat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveAlert(null)}
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
