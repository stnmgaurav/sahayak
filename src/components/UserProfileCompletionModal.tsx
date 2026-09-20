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
  CheckCircle,
  Check,
  ChevronDown,
  Sparkles
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
  const [showPresetGrid, setShowPresetGrid] = useState(false);

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
        // Strip country code for the input field if it starts with +91
        const clean = currentUser.phone.replace(/^\+91\s?/, '');
        setPhone(clean);
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

  // Live checklist completion calculations
  const isNameValid = name.trim().length >= 2;
  const rawDigits = phone.replace(/\D/g, '');
  const isPhoneValid = isExistingProfile || rawDigits.length === 10;
  const isUidValid = isExistingProfile || uidOrRoll.trim().length >= 3;
  const isAvatarValid = Boolean(avatarUrl);

  const completedCount = (isNameValid ? 1 : 0) + (isUidValid ? 1 : 0) + (isPhoneValid ? 1 : 0) + (isAvatarValid ? 1 : 0);
  const completionPercentage = Math.round((completedCount / 4) * 100);

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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isExistingProfile) return;
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(val);
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

    const cleanDigits = phone.replace(/\D/g, '');
    const cleanPhone = isExistingProfile && currentUser?.phone
      ? currentUser.phone
      : `+91 ${cleanDigits}`;

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
    if (!isExistingProfile && cleanDigits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number for handover verification and SMS alerts.');
      return;
    }

    // 4. Validate Profile Picture
    if (!cleanAvatar) {
      setError('Please select or upload a profile picture. You can use your Google photo or pick an avatar.');
      return;
    }

    setSaving(true);
    try {
      await saveProfileDetails({
        name: cleanName,
        uidOrRoll: cleanUid,
        phone: cleanPhone,
        department,
        avatarUrl: cleanAvatar,
      });

      if (isExistingProfile) {
        setSuccessMessage('Profile details updated successfully!');
        setTimeout(() => {
          setNeedsProfileCompletion(false);
        }, 600);
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
    <div 
      className="fixed inset-0 z-[999] flex flex-col sm:items-center sm:justify-center bg-slate-950/80 backdrop-blur-md p-0 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setNeedsProfileCompletion(false);
        }
      }}
    >
      {/* Main Container: Full screen on mobile, elegant rounded card on desktop */}
      <div className="relative w-full sm:max-w-xl bg-white sm:rounded-3xl shadow-2xl flex flex-col min-h-screen sm:min-h-0 sm:max-h-[92vh] overflow-hidden my-0 sm:my-4 border-0 sm:border sm:border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* University Header Ribbon (Minimized & Enhanced) */}
        <div className="bg-gradient-to-r from-red-950 via-red-900 to-slate-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 relative overflow-hidden shrink-0 border-b border-red-800/40">
          <div className="absolute top-0 right-0 w-36 h-36 bg-red-600/10 rounded-full blur-xl pointer-events-none"></div>

          <div className="flex items-center justify-between relative z-10 gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white p-1 flex items-center justify-center text-red-800 shadow-sm shrink-0">
                <SahayakLogo className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight truncate">
                    {isExistingProfile ? 'Student Profile' : 'Student Identity'}
                  </h3>
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider ${
                    isExistingProfile ? 'bg-emerald-400 text-slate-950' : 'bg-amber-400 text-slate-950'
                  }`}>
                    {isExistingProfile ? 'Verified' : 'Step 2/2'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-red-200/90 font-medium truncate mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                  <span className="truncate">{email || 'Authenticated Student'}</span>
                </div>
              </div>
            </div>

            {/* Right side controls: Progress pill on initial setup + ALWAYS visible Close cross button */}
            <div className="flex items-center gap-2 shrink-0">
              {!isExistingProfile && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold text-white shadow-xs">
                  <span className="text-amber-300 font-mono">{completedCount}/4</span>
                  <span className="text-white/70 hidden xs:inline">done</span>
                  <span className="text-[10px] px-1 py-0.5 rounded bg-emerald-500/80 text-white font-semibold ml-0.5">
                    {completionPercentage}%
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setNeedsProfileCompletion(false)}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white transition-all cursor-pointer shadow-xs"
                title="Close Profile Details"
                aria-label="Close Profile"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sleek Bottom Micro Progress Line for Initial Setup */}
          {!isExistingProfile && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
              <div 
                className="bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-300 h-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          )}
        </div>

        {/* Form Body - Smooth scroll on mobile */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 sm:space-y-5 pb-24 sm:pb-6">
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
          <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-red-700" />
                <span>Profile Picture <span className="text-red-600">*</span></span>
              </label>
              <span className="text-[10px] font-bold text-slate-500">
                Visible to finders &amp; security
              </span>
            </div>

            <div className="flex items-center gap-3.5 sm:gap-4">
              {/* Avatar Preview */}
              <div className="relative group shrink-0">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-red-700/80 shadow-md bg-white flex items-center justify-center">
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
              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
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
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 hover:border-red-600 text-slate-700 hover:text-red-700 text-xs font-bold shadow-2xs transition-colors active:scale-95 touch-manipulation"
                  >
                    <Upload className="w-3.5 h-3.5 text-red-600" />
                    <span>Upload / Camera</span>
                  </label>

                  {googlePhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl(googlePhotoUrl)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-95 touch-manipulation ${
                        avatarUrl === googlePhotoUrl
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Google Photo</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowPresetGrid(!showPresetGrid)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-95 touch-manipulation ${
                      showPresetGrid ? 'bg-slate-900 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Avatars</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCustomUrlInput(!showCustomUrlInput)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-slate-600 hover:text-slate-900 text-xs font-semibold hover:bg-white border border-slate-200 cursor-pointer transition-colors"
                    title="Enter custom image link"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>URL</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 hidden sm:block">
                  A recognizable photo helps staff confirm your identity during lost item collection.
                </p>
              </div>
            </div>

            {/* Expandable Preset Avatar Selection Grid */}
            {showPresetGrid && (
              <div className="pt-2 border-t border-slate-200/80 animate-in fade-in duration-150">
                <p className="text-[11px] font-bold text-slate-600 mb-2 flex items-center justify-between">
                  <span>Choose a student avatar:</span>
                  <button 
                    type="button" 
                    onClick={() => setShowPresetGrid(false)} 
                    className="text-slate-400 hover:text-slate-600 text-[10px]"
                  >
                    Hide
                  </button>
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_STUDENT_AVATARS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setAvatarUrl(preset.url);
                        setShowPresetGrid(false);
                      }}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 touch-manipulation ${
                        avatarUrl === preset.url
                          ? 'border-red-700 ring-2 ring-red-500/50 scale-102'
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
                      {avatarUrl === preset.url && (
                        <div className="absolute inset-0 bg-red-900/30 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom URL Input */}
            {showCustomUrlInput && (
              <div className="flex gap-2 pt-2 border-t border-slate-200/80">
                <input
                  type="url"
                  placeholder="Paste direct image URL..."
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-base sm:text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomUrl}
                  className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 active:scale-95"
                >
                  Set URL
                </button>
              </div>
            )}
          </div>

          {/* 2. Student Full Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Student Full Name <span className="text-red-600">*</span>
              </label>
              <span className="text-[10px] text-slate-500 font-medium">As per CUIMS / ID Card</span>
            </div>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 sm:top-3 pointer-events-none" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Gaurav Singh"
                className="w-full pl-10 pr-3.5 py-3.5 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white transition-all shadow-2xs"
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
                  Locked &amp; Verified
                </span>
              ) : (
                <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200/60">
                  Permanent Identity
                </span>
              )}
            </div>

            <div className="relative">
              <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 sm:top-3 pointer-events-none" />
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
                placeholder="e.g. 21BCS10892 or 22MCA1042"
                className={`w-full pl-10 pr-10 py-3.5 sm:py-2.5 rounded-xl text-base sm:text-sm font-mono font-bold tracking-wider uppercase border transition-all shadow-2xs ${
                  isExistingProfile
                    ? 'bg-slate-100/90 text-slate-600 border-slate-200 cursor-not-allowed select-none'
                    : 'bg-slate-50 border-slate-200 text-slate-950 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white'
                }`}
              />
              {isExistingProfile && (
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 sm:top-3" />
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isExistingProfile 
                ? 'Your student UID is permanently tied to custody audit logs and cannot be modified.'
                : 'Found on your Chandigarh University ID card or CUIMS portal (e.g. 21BCS..., 22MCA...).'}
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

            <div className="relative flex rounded-xl border border-slate-200 overflow-hidden shadow-2xs focus-within:ring-2 focus-within:ring-red-600 bg-slate-50">
              {/* Fixed Indian Country Code Prefix */}
              <div className="flex items-center gap-1 px-3 bg-slate-100/90 border-r border-slate-200 text-slate-700 font-bold text-xs shrink-0 select-none">
                <span>🇮🇳</span>
                <span>+91</span>
              </div>

              <input
                type="tel"
                inputMode="numeric"
                required
                disabled={isExistingProfile}
                readOnly={isExistingProfile}
                value={phone}
                onChange={handlePhoneChange}
                placeholder="98765 43210"
                maxLength={10}
                className={`w-full px-3.5 py-3.5 sm:py-2.5 text-base sm:text-sm font-semibold tracking-wide border-0 focus:outline-none focus:ring-0 ${
                  isExistingProfile
                    ? 'bg-slate-100/90 text-slate-600 cursor-not-allowed select-none'
                    : 'bg-slate-50 text-slate-900 focus:bg-white'
                }`}
              />

              {isExistingProfile && (
                <div className="flex items-center pr-3 bg-slate-100/90">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isExistingProfile 
                ? 'Your contact number is locked to maintain custody handover security and prevent impersonation.'
                : 'Campus Security and finders will coordinate handovers via call/WhatsApp on this number.'}
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
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 sm:top-3 pointer-events-none" />
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full pl-10 pr-9 py-3.5 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white appearance-none cursor-pointer shadow-2xs"
              >
                {CU_DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 sm:top-3 pointer-events-none" />
            </div>
          </div>

          {/* Sticky Mobile Bottom Submit Bar & Desktop Actions */}
          <div className="fixed sm:static bottom-0 left-0 right-0 bg-white/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t border-slate-200/80 sm:border-0 p-3.5 sm:p-0 sm:pt-3 z-30 shadow-lg sm:shadow-none space-y-2">
            <div className="flex items-center gap-2.5 max-w-xl mx-auto">
              {isExistingProfile && (
                <button
                  type="button"
                  onClick={() => setNeedsProfileCompletion(false)}
                  className="w-1/3 py-3 px-4 rounded-full border border-slate-200 text-slate-700 font-extrabold text-xs sm:text-sm hover:bg-slate-100 transition-colors active:scale-95 cursor-pointer"
                >
                  Close
                </button>
              )}

              <button
                type="submit"
                disabled={saving || uploadingImage}
                className={`${isExistingProfile ? 'w-2/3' : 'w-full'} flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white font-extrabold text-sm rounded-full shadow-md shadow-rose-600/30 hover:shadow-lg transition-all disabled:opacity-60 active:scale-95 cursor-pointer min-h-[46px]`}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isExistingProfile ? 'Updating Details...' : 'Saving Details & Opening Portal...'}</span>
                  </>
                ) : (
                  <>
                    <span>{isExistingProfile ? 'Update Profile Details' : 'Save Details & Open Portal'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Quick Sign Out option if student signed in with wrong account */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 max-w-xl mx-auto pt-0.5">
              <span className="truncate">
                {isExistingProfile ? '* UID & Mobile are immutable' : '* All 4 fields are required'}
              </span>
              {!isExistingProfile && (
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-1 font-bold text-red-700 hover:text-red-900 transition-colors ml-2 shrink-0 py-0.5 active:scale-95"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Not your account? Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};

