import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Loader2,
  ShieldAlert
} from 'lucide-react';

interface AdminVerificationModalProps {
  onSuccess?: () => void;
}

export const AdminVerificationModal: React.FC<AdminVerificationModalProps> = ({ onSuccess }) => {
  const { 
    currentUser, 
    isAdminVerificationModalOpen, 
    closeAdminVerificationModal, 
    verifyAdminPassword 
  } = useAuth();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isAdminVerificationModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsVerifying(true);

    setTimeout(() => {
      const isValid = verifyAdminPassword(password.trim());
      if (isValid) {
        setSuccess(true);
        setError(null);
        setTimeout(() => {
          setIsVerifying(false);
          setSuccess(false);
          setPassword('');
          if (onSuccess) onSuccess();
        }, 800);
      } else {
        setIsVerifying(false);
        setError('Access Denied: Incorrect administrator security password. Please enter the valid key.');
      }
    }, 400);
  };

  const handleCancel = () => {
    setPassword('');
    setError(null);
    closeAdminVerificationModal();
  };

  // Escape key listener to dismiss modal
  useEffect(() => {
    if (!isAdminVerificationModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminVerificationModalOpen]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={handleCancel}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Security Crimson Header */}
        <div className="sticky top-0 z-30 bg-gradient-to-br from-red-800 via-red-900 to-slate-950 text-white p-4 sm:p-6 pr-14 relative shrink-0 border-b border-red-800/40">
          <button
            type="button"
            onClick={handleCancel}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-white/90 hover:text-white rounded-full bg-white/10 hover:bg-white/25 active:scale-95 transition-all cursor-pointer ring-1 ring-white/20 shadow-sm"
            aria-label="Close modal"
            title="Close (Esc)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="flex items-center space-x-2 text-[11px] font-extrabold tracking-wider uppercase text-red-300 mb-1.5">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>Dual-Layer Security Gatekeeper</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>Admin Authentication</span>
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          </h2>

          <p className="text-red-100/90 text-xs mt-1.5 leading-relaxed">
            Secondary verification required to unlock administrative custody controls, user management, and listing operations.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* Google Verified Identity Strip */}
          {currentUser && (
            <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-center gap-3">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-red-800 text-white flex items-center justify-center font-bold text-sm">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-bold text-slate-900 truncate max-w-[170px]">
                    {currentUser.name}
                  </p>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                    Google Verified
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate font-mono mt-0.5">
                  {currentUser.email}
                </p>
              </div>
            </div>
          )}

          {/* Policy Notice */}
          <div className="p-3 bg-red-50/70 border border-red-200/80 rounded-2xl text-[11px] text-red-900 leading-relaxed space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-red-950">
              <KeyRound className="w-3.5 h-3.5 text-red-700" />
              <span>Campus Security Protocol</span>
            </p>
            <p className="text-slate-600">
              Even with Google OAuth confirmation, campus administrators must provide the secondary security key to unlock the central SAHAYAK management console.
            </p>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Administrator credentials verified! Granting access...</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Administrator Security Passcode
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  placeholder="Enter administrator passcode"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Authorized security credential required for administrative elevation.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isVerifying || success}
                className="flex-1 py-2.5 px-4 border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isVerifying || success || !password.trim()}
                className="flex-1 py-2.5 px-5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 active:scale-95 text-white font-extrabold text-xs rounded-full shadow-md shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Verified!</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Unlock Admin</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
