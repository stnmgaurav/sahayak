import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { CU_DEPARTMENTS } from '../data/mockData';
import { SahayakLogo } from './SahayakLogo';
import { uploadImageFile } from '../lib/storage';
import { 
  User, 
  GraduationCap, 
  Phone, 
  Building2, 
  AlertCircle, 
  Loader2, 
  LogOut,
  ShieldCheck,
  Camera,
  Upload,
  RefreshCw,
  ArrowRight,
  Image as ImageIcon,
  Lock,
  X,
  CheckCircle
} from 'lucide-react';

interface UserProfileCompletionModalProps {
  onProfileCompleted?: () => void;
}

const PRESET_STUDENT_AVATARS = [
  { id: 'av1', label: 'Student 1', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=250&auto=format&fit=crop&q=80' },
  { id: 'av2', label: 'Student 2', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=250&auto=format&fit=crop&q=80' },
  { id: 'av3', label: 'Student 3', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&auto=format&fit=crop&q=80' },
  { id: 'av4', label: 'Student 4', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&auto=format&fit=crop&q=80' },
  { id: 'av5', label: 'Student 5', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&auto=format&fit=crop&q=80' },
  { id: 'av6', label: 'Student 6', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=250&auto=format&fit=crop&q=80' },
];

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
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const googlePhotoUrl = firebaseUser?.photoURL || '';

  // Determine if this profile is already completed & verified (meaning UID & Phone are permanently locked)
  const isExistingProfile = Boolean(
    currentUser &&
    currentUser.profileCompleted &&
    currentUser.uidOrRoll &&
    currentUser.phone &&
    !currentUser.phone.includes('00000')
  );

  // Initialize and prefill details fetched from Google or current session
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || firebaseUser?.displayName || '');
      if (currentUser.uidOrRoll && !currentUser.uidOrRoll.startsWith('21BCS10000') && !currentUser.uidOrRoll.startsWith('EMP-')) {
        setUidOrRoll(currentUser.uidOrRoll);
      }
      if (currentUser.phone && !currentUser.phone.includes('00000')) {
        setPhone(currentUser.phone);
      }
      if (currentUser.department) {
        setDepartment(currentUser.department);
      }
      const initialAvatar = currentUser.avatarUrl || firebaseUser?.photoURL || PRESET_STUDENT_AVATARS[0].url;
      setAvatarUrl(initialAvatar);
    } else if (firebaseUser) {
      setName(firebaseUser.displayName || '');
      const initialAvatar = firebaseUser.photoURL || PRESET_STUDENT_AVATARS[0].url;
      setAvatarUrl(initialAvatar);
    }
  }, [currentUser, firebaseUser]);

  // Admins and Security Staff do not require student profile completion
  if (!needsProfileCompletion || currentUser?.role === 'admin') return null;

  const email = currentUser?.email || firebaseUser?.email || '';

  // Handle local photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Please choose an image file smaller than 5MB.');
      return;
    }

    setUploadingImage(true);
    setError(null);
    try {
      const uploadedUrl = await uploadImageFile(file);
      setAvatarUrl(uploadedUrl);
    } catch (err: any) {
      setError(err?.message || 'Failed to process image. Please try another photo or choose a preset avatar.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApplyCustomUrl = () => {
    if (!customUrlInput.trim()) return;
    setAvatarUrl(customUrlInput.trim());
    setShowCustomUrlInput(false);
    setCustomUrlInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanName = name.trim();
    // If existing profile, strictly preserve verified UID & Phone
    const cleanUid = isExistingProfile && currentUser?.uidOrRoll
      ? currentUser.uidOrRoll
      : uidOrRoll.trim().toUpperCase();

    const cleanPhone = isExistingProfile && currentUser?.phone
      ? currentUser.phone
      : phone.trim();

    const cleanAvatar = avatarUrl.trim();

    // 1. Validate Name
    if (!cleanName || cleanName.length < 2) {
      setError('Please enter your full legal student name as recorded with the University.');
      return;
    }

    // 2. Validate UID (for first-time completion)
    if (!cleanUid || cleanUid.length < 3) {
      setError('Please enter a valid Chandigarh University UID or Roll Number (e.g., 22BCS10482 or 23MCA1024).');
      return;
    }

    // 3. Validate Mobile Number (for first-time completion)
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      setError('Please enter a valid 10-digit mobile number for handover verification and SMS alerts.');
      return;
    }

    // 4. Validate Profile Picture
    if (!cleanAvatar) {
      setError('Please select or upload a profile picture. You can use your Google photo or pick an avatar.');
      return;
    }

    const formattedPhone = cleanPhone.startsWith('+91') 
      ? cleanPhone 
      : `+91 ${digitsOnly.slice(-10)}`;

    setSaving(true);
    try {
      await saveProfileDetails({
        name: cleanName,
        uidOrRoll: cleanUid,
        phone: formattedPhone,
        department,
        avatarUrl: cleanAvatar,
      });

      if (isExistingProfile) {
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => {
          setNeedsProfileCompletion(false);
        }, 700);
      } else {
        setNeedsProfileCompletion(false);
        if (onProfileCompleted) {
          onProfileCompleted();
        }
      }
    } catch (err: any) {
      console.error('Error saving student profile details:', err);
      setError(err?.message || 'Failed to save student profile. Please check your connection and retry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* University Header Ribbon */}
        <div className="bg-gradient-to-r from-red-900 via-red-800 to-slate-900 text-white p-5 sm:p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-start justify-between relative z-10 gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white p-1.5 flex items-center justify-center text-red-800 shadow-md shrink-0">
                <SahayakLogo className="w-9 h-9" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                    {isExistingProfile ? 'Student Profile Details' : 'Mandatory Student Profile Verification'}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    isExistingProfile ? 'bg-emerald-400 text-slate-950' : 'bg-amber-400 text-slate-950'
                  }`}>
                    {isExistingProfile ? 'Verified Profile' : 'Required'}
                  </span>
                </div>
                <p className="text-xs text-red-200 font-medium mt-0.5">
                  Chandigarh University Lost &amp; Found Digital Identity
                </p>
              </div>
            </div>

            {/* If existing profile, provide top-right Close button */}
            {isExistingProfile && (
              <button
                type="button"
                onClick={() => setNeedsProfileCompletion(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white/90 hover:text-white transition-colors shrink-0"
                title="Close Profile Details"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="mt-3.5 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-slate-200 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
              <span className="truncate">Google Account: <strong className="text-white">{email}</strong></span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-white/15 text-[10px] font-bold text-white shrink-0">
              {isExistingProfile ? 'CU Digital Record' : 'Pre-filled from Google'}
            </span>
          </div>
        </div>

        {/* Security & Verification Notice */}
        {isExistingProfile ? (
          <div className="p-3.5 sm:p-4 bg-amber-50/80 border-b border-amber-200/60 flex items-start gap-2.5 text-xs text-amber-950">
            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>University Credentials Locked:</strong> For custody integrity and fraud prevention, your <strong>CU UID / Roll Number</strong> and <strong>Contact Mobile Number</strong> cannot be changed. You may update your Name, Academic Department, and Profile Picture below.
            </p>
          </div>
        ) : (
          <div className="p-3.5 sm:p-4 bg-red-50/60 border-b border-red-100 flex items-start gap-2.5 text-xs text-slate-700">
            <ShieldCheck className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Please confirm your <strong>Student Name</strong>, <strong>CU UID</strong>, <strong>Contact Mobile</strong>, and <strong>Profile Picture</strong>. These details are required before logging in to verify ownership and prevent false claims.
            </p>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5 max-h-[72vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-semibold flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-semibold flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{successMessage}</span>
            </div>
          )}

          {/* 1. Profile Picture Selection & Preview */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-red-700" />
                <span>Profile Picture <span className="text-red-600">*</span></span>
              </label>
              <span className="text-[10px] font-bold text-slate-500">
                Visible on claims &amp; reports
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Avatar Preview */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-red-700/80 shadow-md bg-white flex items-center justify-center">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Student Avatar"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                      <User className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {uploadingImage && (
                  <div className="absolute inset-0 bg-slate-950/60 rounded-2xl flex items-center justify-center text-white">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}
              </div>

              {/* Upload & Choose Actions */}
              <div className="flex-1 space-y-2 w-full text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="student-photo-upload"
                  />
                  <label
                    htmlFor="student-photo-upload"
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-red-700 text-slate-700 hover:text-red-800 text-xs font-bold shadow-2xs transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </label>

                  {googlePhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl(googlePhotoUrl)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        avatarUrl === googlePhotoUrl
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Google Photo</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowCustomUrlInput(!showCustomUrlInput)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold hover:bg-white transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>URL</span>
                  </button>
                </div>

                {/* Preset Avatar Selection Pills */}
                <div className="pt-1">
                  <p className="text-[11px] font-semibold text-slate-500 mb-1.5">
                    Or select an avatar preset:
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    {PRESET_STUDENT_AVATARS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setAvatarUrl(preset.url)}
                        className={`w-8 h-8 rounded-xl overflow-hidden border-2 transition-all hover:scale-110 ${
                          avatarUrl === preset.url
                            ? 'border-red-700 ring-2 ring-red-400/50 scale-105'
                            : 'border-white hover:border-slate-300'
                        }`}
                        title={preset.label}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {showCustomUrlInput && (
                  <div className="flex gap-2 pt-1.5">
                    <input
                      type="url"
                      placeholder="Paste image URL..."
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCustomUrl}
                      className="px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
                    >
                      Set
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Student Full Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Student Full Name <span className="text-red-600">*</span>
              </label>
              <span className="text-[10px] text-slate-500 font-medium">Editable</span>
            </div>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Gaurav Singh"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
              />
            </div>
          </div>

          {/* 3. Chandigarh University UID / Roll Number (LOCKED if existing profile) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Chandigarh University UID / Roll No.</span>
                {isExistingProfile ? (
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                ) : (
                  <span className="text-red-600">*</span>
                )}
              </label>
              {isExistingProfile ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                  <Lock className="w-2.5 h-2.5" />
                  Locked (Cannot Change)
                </span>
              ) : (
                <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200/60">
                  CU Identity
                </span>
              )}
            </div>

            <div className="relative">
              <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                disabled={isExistingProfile}
                readOnly={isExistingProfile}
                value={uidOrRoll}
                onChange={e => {
                  if (!isExistingProfile) {
                    setUidOrRoll(e.target.value.toUpperCase());
                  }
                }}
                placeholder="e.g. 22BCS10892 or 23MCA1042"
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-bold tracking-wider uppercase border ${
                  isExistingProfile
                    ? 'bg-slate-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none'
                    : 'bg-slate-50 border-slate-200 text-slate-950 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white'
                }`}
              />
              {isExistingProfile && (
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isExistingProfile 
                ? 'Your student UID is permanently verified to your profile and cannot be modified.'
                : 'Found on your Chandigarh University student ID card or CUIMS dashboard.'}
            </p>
          </div>

          {/* 4. Contact Mobile / WhatsApp Number (LOCKED if existing profile) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Contact Mobile / WhatsApp Number</span>
                {isExistingProfile ? (
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                ) : (
                  <span className="text-red-600">*</span>
                )}
              </label>
              {isExistingProfile ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                  <Lock className="w-2.5 h-2.5" />
                  Locked (Cannot Change)
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  10 Digits
                </span>
              )}
            </div>

            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="tel"
                required
                disabled={isExistingProfile}
                readOnly={isExistingProfile}
                value={phone}
                onChange={e => {
                  if (!isExistingProfile) {
                    setPhone(e.target.value);
                  }
                }}
                placeholder="e.g. 98765 43210"
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border ${
                  isExistingProfile
                    ? 'bg-slate-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white'
                }`}
              />
              {isExistingProfile && (
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isExistingProfile 
                ? 'Your registered contact number is locked to maintain custody handover security and prevent impersonation.'
                : 'Campus Security or student finders will use this number to coordinate handover.'}
            </p>
          </div>

          {/* 5. Academic Department */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Academic Department / Faculty <span className="text-red-600">*</span>
              </label>
              <span className="text-[10px] text-slate-500 font-medium">Editable</span>
            </div>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white appearance-none cursor-pointer"
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
          <div className="pt-2 space-y-3">
            <div className="flex items-center gap-3">
              {isExistingProfile && (
                <button
                  type="button"
                  onClick={() => setNeedsProfileCompletion(false)}
                  className="w-1/3 py-3 px-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>
              )}

              <button
                type="submit"
                disabled={saving || uploadingImage}
                className={`${isExistingProfile ? 'w-2/3' : 'w-full'} flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-red-700 via-red-800 to-red-900 hover:from-red-800 hover:to-red-950 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg shadow-red-900/20 hover:shadow-xl transition-all disabled:opacity-60 hover:scale-101 active:scale-99`}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isExistingProfile ? 'Updating Profile...' : 'Saving Profile & Opening Dashboard...'}</span>
                  </>
                ) : (
                  <>
                    <span>{isExistingProfile ? 'Update Profile Details' : 'Save Profile & Open Dashboard'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Mandatory gate note / cancel option for initial onboarding */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-slate-500 italic">
                {isExistingProfile 
                  ? '* UID & Mobile are locked. Contact Administration for credential changes.'
                  : '* All details are strictly mandatory to access the portal.'}
              </p>
              {!isExistingProfile && (
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 py-1 text-xs font-bold text-slate-500 hover:text-red-700 transition-colors"
                  title="Sign out and cancel login"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cancel &amp; Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
