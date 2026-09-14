import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CU_DEPARTMENTS } from '../data/mockData';
import { SahayakLogo } from './SahayakLogo';
import { 
  Shield, 
  Mail, 
  Lock, 
  User, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  KeyRound,
  GraduationCap,
  Phone,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface LoginPageProps {
  onBackToBrowse: () => void;
  onOpenDashboard?: (role: 'admin' | 'student') => void;
  initialMode?: 'login' | 'signup';
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onBackToBrowse,
  onOpenDashboard,
  initialMode = 'login',
}) => {
  const { 
    currentUser, 
    isAuthenticated, 
    loginWithEmail, 
    signupWithEmail, 
    loginWithGoogle, 
    loginAsDemo, 
    resetPassword, 
    authPromptMessage,
    logout 
  } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [uidOrRoll, setUidOrRoll] = useState('');
  const [department, setDepartment] = useState(CU_DEPARTMENTS[0]);
  const [phone, setPhone] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  // Auto-navigate if already authenticated
  React.useEffect(() => {
    if (isAuthenticated && currentUser) {
      const timer = setTimeout(() => {
        if (onOpenDashboard) {
          onOpenDashboard(currentUser.role === 'admin' ? 'admin' : 'student');
        } else {
          onBackToBrowse();
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, currentUser, onOpenDashboard, onBackToBrowse]);

  const getFriendlyErrorMessage = (err: any): string => {
    const code = err?.code || '';
    const message = err?.message || '';
    if (code.includes('user-not-found')) {
      return 'No registered account found with this email. Please check the address or sign up.';
    }
    if (code.includes('wrong-password') || code.includes('invalid-credential')) {
      return 'Incorrect email or password. Please verify your credentials.';
    }
    if (code.includes('email-already-in-use')) {
      return 'An account already exists with this email. Please sign in instead.';
    }
    if (code.includes('weak-password')) {
      return 'Password should be at least 6 characters.';
    }
    if (code.includes('popup-closed-by-user')) {
      return 'Google sign-in popup was closed before completing.';
    }
    if (code.includes('popup-blocked')) {
      return 'Browser blocked the Google sign-in popup. Please allow popups for this site or open the app in a new tab.';
    }
    if (code.includes('unauthorized-domain')) {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
      return `Domain unauthorized: "${host}" is not yet added in Firebase Console > Authentication > Settings > Authorized domains.`;
    }
    if (code.includes('network-request-failed')) {
      return 'Network connection error. Please check your internet connection.';
    }
    return message || 'Authentication failed. Please try again.';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
      if (onOpenDashboard) {
        onOpenDashboard(email.toLowerCase().includes('admin') || email.toLowerCase() === 'gauravsinghrajpoot2019@gmail.com' ? 'admin' : 'student');
      } else {
        onBackToBrowse();
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your full name as printed on your CU ID card.');
      return;
    }
    if (!uidOrRoll.trim()) {
      setError('Please provide your Chandigarh University Student UID / Roll Number.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await signupWithEmail({
        name: name.trim(),
        email: email.trim(),
        password,
        uidOrRoll: uidOrRoll.trim().toUpperCase(),
        department,
        phone: phone.trim() || '+91 98765 00000',
      });
      if (onOpenDashboard) {
        onOpenDashboard('student');
      } else {
        onBackToBrowse();
      }
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
      if (onOpenDashboard) {
        onOpenDashboard(currentUser?.role === 'admin' ? 'admin' : 'student');
      } else {
        onBackToBrowse();
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim());
      setResetSent(true);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated && currentUser) {
    return (
      <div className="min-h-[75vh] flex flex-col justify-start sm:justify-center items-center pt-2 sm:pt-6 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg space-y-4">
          <button
            onClick={onBackToBrowse}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-xl hover:bg-white/60"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Campus Registry</span>
          </button>

          <div className="glass-panel rounded-3xl p-8 shadow-2xl border border-white/90 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-black text-2xl mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <div className="space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Authentication Successful
              </span>
              <h2 className="text-2xl font-black text-slate-950 pt-1">{currentUser.name}</h2>
              <p className="text-xs text-slate-500 font-medium">{currentUser.email}</p>
              <div className="pt-2">
                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold ${
                  currentUser.role === 'admin'
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {currentUser.role === 'admin' ? (
                    <>
                      <ShieldCheck className="w-4 h-4 text-red-700" />
                      <span>Campus Security & Admin Authority</span>
                    </>
                  ) : (
                    <>
                      <GraduationCap className="w-4 h-4 text-emerald-700" />
                      <span>Verified Student ({currentUser.uidOrRoll || 'CU Scholar'})</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => {
                  if (onOpenDashboard) {
                    onOpenDashboard(currentUser.role === 'admin' ? 'admin' : 'student');
                  } else {
                    onBackToBrowse();
                  }
                }}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white rounded-2xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>{currentUser.role === 'admin' ? 'Launch Campus Security Console' : 'Go to My Student Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onBackToBrowse}
                className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs border border-slate-200 transition-all"
              >
                Explore Lost & Found Items Registry
              </button>

              <button
                onClick={logout}
                className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-red-700 transition-colors"
              >
                Sign out of account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex flex-col justify-start sm:justify-center items-center pt-2 sm:pt-6 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl space-y-4 sm:space-y-5">
        {/* Return Button */}
        <button
          onClick={onBackToBrowse}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-xl hover:bg-white/60"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Campus Registry</span>
        </button>

        {/* Bento Grid Split: Feature Bento (Left) + Glass Form (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Feature Bento Box (Col 1-5) */}
          <div className="lg:col-span-5 order-2 lg:order-1 glass-dark text-white rounded-3xl p-7 flex flex-col justify-between relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white p-1.5 flex items-center justify-center text-red-700 shadow-md border border-white/30">
                  <SahayakLogo className="w-9 h-9" />
                </div>
                <div>
                  <span className="text-base font-black tracking-tight block text-white">SAHAYAK</span>
                  <span className="text-[10px] text-red-300 font-bold uppercase tracking-wider">Chandigarh University</span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black tracking-tight leading-snug text-white">
                  Intelligent Campus Lost &amp; Found
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Connect your student credentials to recover lost valuables or hand over items to campus security desks across all 14 blocks.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-white">AI Semantic Matching</p>
                    <p className="text-[11px] text-slate-400">Automatic comparison of color, category, timestamp, and location block.</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-white">Security Desk Handover</p>
                    <p className="text-[11px] text-slate-400">Physical locker safe custody at Gate 1, Central Library, and Block C3.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 text-[11px] text-slate-400 font-medium relative z-10">
              Chandigarh University • Smart Campus Network
            </div>
          </div>

          {/* Right Frosted Glass Auth Card (Col 6-12) */}
          <div className="lg:col-span-7 order-1 lg:order-2 glass-panel rounded-3xl p-6 sm:p-8 shadow-xl border border-white/80 flex flex-col justify-between">
            <div>
              {/* Mode Switcher Tabs */}
              {mode !== 'forgot' && (
                <div className="flex p-1 rounded-2xl glass-panel-subtle mb-6 border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(null); }}
                    className={`flex-1 py-2.5 text-center text-xs font-bold rounded-xl transition-all ${
                      mode === 'login'
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Student Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError(null); }}
                    className={`flex-1 py-2.5 text-center text-xs font-bold rounded-xl transition-all ${
                      mode === 'signup'
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              )}

              {/* Operation Login Requirement Notification */}
              {authPromptMessage && (
                <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-semibold flex items-start gap-2.5 shadow-2xs">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{authPromptMessage}</span>
                </div>
              )}

              {/* Error Notification */}
              {error && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-800 font-medium space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-semibold">{error}</span>
                  </div>

                  {/* Fallback buttons if domain is unauthorized in Firebase Console or popup blocked */}
                  {(error.includes('Domain unauthorized') || error.includes('popup') || error.includes('Authentication') || error.includes('Firebase')) && (
                    <div className="pt-2.5 border-t border-red-200/70 space-y-2">
                      <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                        To test immediately without waiting for Firebase Console domain whitelist:
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            setError(null);
                            await loginAsDemo('admin');
                            if (onOpenDashboard) onOpenDashboard('admin');
                            else onBackToBrowse();
                          }}
                          className="flex-1 px-3 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Login as Gaurav Singh (Admin)</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setError(null);
                            await loginAsDemo('student');
                            if (onOpenDashboard) onOpenDashboard('student');
                            else onBackToBrowse();
                          }}
                          className="flex-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>Login as Student (Arjun)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Google Sign-In Button */}
              {mode !== 'forgot' && (
                <div className="space-y-4 mb-5">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading || loading}
                    className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white/90 hover:bg-white text-slate-800 font-bold text-xs sm:text-sm rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all disabled:opacity-50"
                  >
                    {googleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    )}
                    <span>Continue with Google </span>
                  </button>

                  <div className="relative flex items-center justify-center">
                    <div className="w-full border-t border-slate-200/80"></div>
                    <span className="bg-white/80 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider relative z-10">
                      or use student credentials
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 1: LOGIN FORM */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Student Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. yourname.uid@cuchd.in"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-white/80 border border-slate-200/90 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => { setMode('forgot'); setError(null); }}
                        className="text-[11px] font-bold text-red-700 hover:text-red-900"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-white/80 border border-slate-200/90 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || googleLoading}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 active:bg-red-950 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <span>Sign In to SAHAYAK</span>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 2: SIGNUP FORM */}
              {mode === 'signup' && (
                <form onSubmit={handleSignup} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Student Name <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Arjun Sharma"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-white/80 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        CU UID / Roll <span className="text-red-600">*</span>
                      </label>
                      <div className="relative">
                        <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          placeholder="21BCS10482"
                          value={uidOrRoll}
                          onChange={e => setUidOrRoll(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 bg-white/80 border border-slate-200 rounded-xl text-xs uppercase focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 bg-white/80 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Academic Department
                    </label>
                    <select
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      className="w-full px-3 py-2 bg-white/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-600"
                    >
                      {CU_DEPARTMENTS.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        placeholder="yourname@cuchd.in"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 bg-white/80 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Password <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="Min 6 chars"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-white/80 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Confirm <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="Re-type password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-white/80 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || googleLoading}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Registering account...</span>
                      </>
                    ) : (
                      <span>Complete Registration</span>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 3: FORGOT PASSWORD */}
              {mode === 'forgot' && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="text-base font-black text-slate-900">Reset Your Password</h3>
                    <p className="text-xs text-slate-500">
                      Enter your registered student email to receive a password recovery link.
                    </p>
                  </div>

                  {resetSent ? (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-3">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                      <p className="text-xs font-bold text-emerald-900">
                        Password reset link has been dispatched to {email}.
                      </p>
                      <button
                        type="button"
                        onClick={() => { setMode('login'); setResetSent(false); }}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                      >
                        Return to Sign In
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Registered Email
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="arjun.21bcs1048@cuchd.in"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white/80 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setMode('login')}
                          className="flex-1 py-2.5 px-4 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 py-2.5 px-4 bg-red-800 text-white rounded-xl text-xs font-bold hover:bg-red-900 flex items-center justify-center gap-2"
                        >
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Reset Link</span>}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
