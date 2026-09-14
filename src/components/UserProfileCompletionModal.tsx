import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CU_DEPARTMENTS } from '../data/mockData';
import { SahayakLogo } from './SahayakLogo';
import { 
  User, 
  GraduationCap, 
  Phone, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  LogOut,
  ShieldCheck,
  Sparkles,
  X,
  ArrowLeft
} from 'lucide-react';

interface UserProfileCompletionModalProps {
  onProfileCompleted?: () => void;
}

export const UserProfileCompletionModal: React.FC<UserProfileCompletionModalProps> = ({
  onProfileCompleted
}) => {
  const { 
    currentUser, 
    firebaseUser, 
    needsProfileCompletion, 
    setNeedsProfileCompletion,
    saveProfileDetails, 
    logout 
  } = useAuth();

  const [name, setName] = useState('');
  const [uidOrRoll, setUidOrRoll] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState(CU_DEPARTMENTS[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || firebaseUser?.displayName || '');
      // Only set if not placeholder
      if (currentUser.uidOrRoll && !currentUser.uidOrRoll.startsWith('21BCS')) {
        setUidOrRoll(currentUser.uidOrRoll);
      }
      if (currentUser.phone && !currentUser.phone.includes('00000')) {
        setPhone(currentUser.phone);
      }
      if (currentUser.department) {
        setDepartment(currentUser.department);
      }
    } else if (firebaseUser) {
      setName(firebaseUser.displayName || '');
    }
  }, [currentUser, firebaseUser]);

  // Admins and Security Staff do not require student profile completion
  if (!needsProfileCompletion || currentUser?.role === 'admin') return null;

  const email = currentUser?.email || firebaseUser?.email || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUid = uidOrRoll.trim().toUpperCase();
    const cleanPhone = phone.trim();

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!cleanUid || cleanUid.length < 3) {
      setError('Please enter a valid Chandigarh University UID or Roll Number (e.g., 22BCS10482).');
      return;
    }

    // Clean phone validation (Indian 10-digit number check)
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    if (cleanPhone && digitsOnly.length < 10) {
      setError('Please enter a valid 10-digit contact mobile number (e.g., 9876543210).');
      return;
    }

    setSaving(true);
    try {
      await saveProfileDetails({
        name: name.trim(),
        uidOrRoll: cleanUid,
        phone: cleanPhone ? (cleanPhone.startsWith('+91') ? cleanPhone : `+91 ${cleanPhone}`) : '+91 98765 00000',
        department,
      });

      setNeedsProfileCompletion(false);
      if (onProfileCompleted) {
        onProfileCompleted();
      }
    } catch (err: any) {
      // Gracefully close modal to avoid blocking user
      setNeedsProfileCompletion(false);
      if (onProfileCompleted) {
        onProfileCompleted();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* University Header Ribbon */}
        <div className="bg-gradient-to-r from-red-900 via-red-800 to-slate-900 text-white p-6 pr-14 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

          {/* Close / Dismiss button (Cross) */}
          <button
            onClick={() => setNeedsProfileCompletion(false)}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close profile dialog"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white p-1.5 flex items-center justify-center text-red-700 shadow-md">
              <SahayakLogo className="w-9 h-9" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">Complete Student Profile</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950">
                  Required
                </span>
              </div>
              <p className="text-xs text-red-200 font-medium mt-0.5">
                Chandigarh University Identity Verification
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-slate-200">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
              <span className="truncate">Google Account: <strong className="text-white">{email}</strong></span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-white/15 text-[10px] font-bold text-white shrink-0">
              Verified
            </span>
          </div>
        </div>

        {/* Notice Info Card */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200">
          <div className="flex items-start gap-3 text-xs text-slate-600">
            <ShieldCheck className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              To safeguard property on campus, Chandigarh University requires your <strong>UID</strong> and <strong>contact mobile number</strong>. These are used to verify claims, generate official custody passes, and prevent false reporting.
            </p>
          </div>
        </div>

        {/* Profile Completion Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Student Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Student Full Name <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Gaurav Singh"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
              />
            </div>
          </div>

          {/* CU UID / Roll Number */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Chandigarh University UID / Roll No. <span className="text-red-600">*</span>
              </label>
              <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200/60">
                Campus ID
              </span>
            </div>
            <div className="relative">
              <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={uidOrRoll}
                onChange={e => setUidOrRoll(e.target.value.toUpperCase())}
                placeholder="e.g. 22BCS10892 or 23MCA1042"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold tracking-wide focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white uppercase"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Found on your CU Student ID card or CUIMS portal.
            </p>
          </div>

          {/* Contact Mobile Number */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Contact Mobile / WhatsApp Number <span className="text-red-600">*</span>
              </label>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                OTP &amp; Call Handover
              </span>
            </div>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 98765 43210"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Campus Security or finders will use this number to coordinate physical returns.
            </p>
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Academic Department / Faculty <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white appearance-none"
              >
                {CU_DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-3 space-y-2.5">
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-800 hover:bg-red-900 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving to Campus Registry...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Profile &amp; Continue</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign in with a different account</span>
            </button>

            <button
              type="button"
              onClick={() => setNeedsProfileCompletion(false)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Skip for now and return to browsing</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
