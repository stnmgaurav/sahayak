import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CU_DEPARTMENTS } from '../data/mockData';
import { 
  X, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  GraduationCap, 
  Shield, 
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck 
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    authModalMode, 
    authPromptMessage,
    loginWithEmail, 
    signupWithEmail, 
    loginWithGoogle,
    loginAsDemo
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>(authModalMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [uidOrRoll, setUidOrRoll] = useState('');
  const [department, setDepartment] = useState(CU_DEPARTMENTS[0]);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const getFriendlyErrorMessage = (err: any): string => {
    const code = err?.code || '';
    if (code.includes('user-not-found')) return 'No account found with this email.';
    if (code.includes('wrong-password') || code.includes('invalid-credential')) {
      return 'Incorrect email or password.';
    }
    if (code.includes('email-already-in-use')) {
      return 'An account already exists with this email.';
    }
    if (code.includes('weak-password')) {
      return 'Password must be at least 6 characters.';
    }
    if (code.includes('popup-closed-by-user')) {
      return 'Google sign-in popup closed.';
    }
    if (code.includes('unauthorized-domain')) {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
      return `Domain unauthorized: "${host}" is not yet added in Firebase Console > Authentication > Settings > Authorized domains.`;
    }
    return err?.message || 'Authentication error. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          setError('Please enter both email and password.');
          setLoading(false);
          return;
        }
        await loginWithEmail(email.trim(), password);
      } else {
        if (!name.trim() || !email.trim() || !uidOrRoll.trim() || !password) {
          setError('Please fill in all required fields.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        await signupWithEmail({
          name: name.trim(),
          email: email.trim(),
          password,
          uidOrRoll: uidOrRoll.trim().toUpperCase(),
          department,
          phone: phone.trim() || '+91 98765 00000',
        });
      }
      closeAuthModal();
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      closeAuthModal();
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-red-800 text-white p-5 sm:p-6 pr-14 relative shrink-0">
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center text-white/90 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2 text-xs font-semibold tracking-wider uppercase text-red-200 mb-1">
            <Shield className="w-4 h-4" />
            <span>Chandigarh University</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {mode === 'login' ? 'Sign In to SAHAYAK' : 'Create Student Account'}
          </h2>
          <p className="text-red-100 text-xs sm:text-sm mt-1">
            {mode === 'login'
              ? 'Access campus lost & found services, track claims, and manage reports.'
              : 'Join the campus portal to report lost items and claim recovered belongings.'}
          </p>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto">
          {authPromptMessage && (
            <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{authPromptMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium space-y-2.5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span className="font-semibold leading-relaxed">{error}</span>
              </div>
              {(error.includes('Domain unauthorized') || error.includes('popup') || error.includes('Authentication')) && (
                <div className="pt-2 border-t border-red-200/60 space-y-1.5">
                  <p className="text-[11px] text-slate-600 font-medium">Bypass to test now:</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await loginAsDemo('admin');
                        closeAuthModal();
                      }}
                      className="flex-1 py-1.5 px-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow-xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Gaurav Singh (Admin)</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await loginAsDemo('student');
                        closeAuthModal();
                      }}
                      className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow-xs"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Student (Arjun)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-700 font-bold text-xs sm:text-sm transition-all shadow-2xs disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
              <span className="bg-white px-3 text-slate-400">
                Or with email &amp; password
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Student Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Arjun Sharma"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">CU UID / Roll</label>
                    <div className="relative">
                      <GraduationCap className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="21BCS10482"
                        value={uidOrRoll}
                        onChange={e => setUidOrRoll(e.target.value.toUpperCase())}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
                      <input
                        type="tel"
                        placeholder="+91 98765..."
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-600"
                  >
                    {CU_DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="student@cuchd.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 bg-red-800 hover:bg-red-900 active:bg-red-950 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to SAHAYAK' : 'Register Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle between login and signup */}
          <div className="mt-4 text-center text-xs text-slate-500">
            {mode === 'login' ? (
              <p>
                New Chandigarh University student?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); }}
                  className="text-red-700 font-bold hover:underline"
                >
                  Register here
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-red-700 font-bold hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
