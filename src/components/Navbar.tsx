import React, { useState } from 'react';
import { useAuth, isUserAdmin } from '../context/AuthContext';
import { SahayakLogo } from './SahayakLogo';
import { 
  Shield, 
  LogOut, 
  LayoutDashboard, 
  Compass,
  Menu,
  X,
  LogIn,
  Sparkles,
  ChevronDown,
  Lock,
  Edit3,
  Phone,
  GraduationCap,
  Building2,
  Copy,
  Check,
  ChevronRight,
  BadgeCheck,
  Bell
} from 'lucide-react';
import { NotificationSettingsModal } from './NotificationSettingsModal';
import { getNotificationPermission, NotificationPermissionState } from '../lib/notifications';

type NavTab = 'browse' | 'student-dashboard' | 'admin-dashboard' | 'login';

interface NavbarProps {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  onOpenReportModal?: (type: 'lost' | 'found') => void;
  unreadMatchesCount: number;
  pendingClaimsCount: number;
  onOpenNotificationModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenReportModal,
  unreadMatchesCount,
  pendingClaimsCount,
  onOpenNotificationModal,
}) => {
  const { 
    currentUser, 
    isAuthenticated, 
    isAdmin, 
    logout, 
    openAuthModal, 
    setNeedsProfileCompletion, 
    openAdminVerificationModal 
  } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>(() => getNotificationPermission());
  const [copiedUid, setCopiedUid] = useState(false);

  const handleOpenNotificationModal = () => {
    if (onOpenNotificationModal) {
      onOpenNotificationModal();
    } else {
      setIsNotificationModalOpen(true);
    }
  };

  const handleCopyUid = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser?.uidOrRoll) {
      navigator.clipboard.writeText(currentUser.uidOrRoll);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  const handleTabClick = (tab: NavTab) => {
    if (tab === 'student-dashboard' && !isAuthenticated) {
      openAuthModal('login', 'Please sign in with your Chandigarh University credentials to access your student dashboard.');
      return;
    }
    if (tab === 'admin-dashboard') {
      if (!isAuthenticated || !currentUser || !isUserAdmin(currentUser.email)) {
        openAuthModal('login', 'Access Restricted: Campus Security Desk is reserved strictly for campus administrator (gauravsinghrajpoot2019@gmail.com).');
        return;
      }
      if (!isAdmin) {
        openAdminVerificationModal();
        return;
      }
    }
    setCurrentTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/70 border-b border-slate-200/60 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Startup Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setCurrentTab('browse'); setIsMobileMenuOpen(false); }}
              className="flex items-center gap-3 text-left focus:outline-hidden group"
            >
              {/* Modern Glass Brand Icon */}
              <div className="relative w-10 h-10 rounded-xl bg-white p-1 border border-slate-200/80 shadow-xs flex items-center justify-center group-hover:scale-105 transition-transform">
                <SahayakLogo className="w-8 h-8" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse"></span>
              </div>

              <div>
                <span className="text-xl font-black tracking-tight text-slate-950 group-hover:text-red-800 transition-colors">
                  SAHAYAK
                </span>
                <p className="text-[11px] font-medium text-slate-500 tracking-tight leading-none hidden sm:block mt-0.5">
                  Lost &amp; Found
                </p>
              </div>
            </button>
          </div>

          {/* Center Glass Pill Segmented Nav (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-full border border-slate-100 bg-white/95 shadow-2xs">
            <button
              onClick={() => handleTabClick('browse')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                currentTab === 'browse'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-slate-400" />
              <span>Explore Items</span>
            </button>

            <button
              onClick={() => handleTabClick('student-dashboard')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all relative cursor-pointer ${
                currentTab === 'student-dashboard'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
              <span>My Dashboard</span>
              {unreadMatchesCount > 0 && (
                <span className="flex items-center gap-1 px-1.5 py-0.2 bg-amber-500/20 border border-amber-500/40 text-amber-900 text-[10px] font-extrabold rounded-full animate-pulse">
                  <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                  {unreadMatchesCount}
                </span>
              )}
            </button>

            {/* Security Desk tab - strictly visible ONLY to authorized campus admin: gauravsinghrajpoot2019@gmail.com */}
            {currentUser && isUserAdmin(currentUser.email) && (
              <button
                onClick={() => handleTabClick('admin-dashboard')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all relative cursor-pointer ${
                  currentTab === 'admin-dashboard'
                    ? 'bg-red-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-red-800 hover:bg-red-50'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Security Desk</span>
                {pendingClaimsCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold bg-red-600 text-white rounded-full">
                    {pendingClaimsCount}
                  </span>
                )}
              </button>
            )}
          </nav>

          {/* Right: Glass Actions & Profile */}
          <div className="flex items-center gap-2">
            {/* Browser Push Notifications Bell */}
            <button
              type="button"
              onClick={handleOpenNotificationModal}
              className="relative p-2 rounded-full border border-slate-200/90 bg-white/80 hover:bg-white text-slate-700 hover:text-red-800 transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
              title={notificationPermission === 'granted' ? 'Push Notifications: Active (Click to manage)' : 'Enable Browser Push Notifications for Item Chats'}
              aria-label="Push notifications settings"
            >
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-600 group-hover:text-red-800 transition-colors" />
              {notificationPermission === 'granted' ? (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              ) : (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
              )}
            </button>

            {/* Profile / Login Menu */}
            <div className="relative">
              {isAuthenticated && currentUser ? (
                <div>
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border border-slate-200/90 bg-white/80 hover:bg-white hover:border-slate-300 transition-all shadow-2xs hover:shadow-xs group"
                    aria-label="User profile menu"
                  >
                    <div className="relative">
                      {currentUser.avatarUrl ? (
                        <img
                          src={currentUser.avatarUrl}
                          alt={currentUser.name}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-1 ring-slate-200"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-red-800 to-red-950 text-white flex items-center justify-center font-bold text-xs ring-1 ring-red-700/50">
                          {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>
                    <div className="hidden sm:block text-left min-w-0">
                      <p className="text-xs font-bold text-slate-800 leading-none truncate max-w-[110px]">
                        {currentUser.name?.split(' ')[0] || 'Student'}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono leading-tight truncate max-w-[110px] mt-0.5">
                        {currentUser.uidOrRoll || 'Profile'}
                      </p>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isProfileDropdownOpen && (
                    <>
                      {/* Click outside backdrop */}
                      <div 
                        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" 
                        onClick={() => setIsProfileDropdownOpen(false)} 
                      />

                      {/* Startup Elevated Popover Card */}
                      <div className="absolute right-0 mt-2.5 w-84 sm:w-92 bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-slate-950/15 z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100">
                        {/* Profile Header Hero */}
                        <div className="p-4 bg-gradient-to-b from-slate-50 via-slate-50/50 to-white relative">
                          {/* Close Cross Button */}
                          <button
                            type="button"
                            onClick={() => setIsProfileDropdownOpen(false)}
                            className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                            aria-label="Close profile menu"
                            title="Close"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          <div className="flex items-start gap-3 pr-7">
                            <div className="relative shrink-0">
                              {currentUser.avatarUrl ? (
                                <img
                                  src={currentUser.avatarUrl}
                                  alt={currentUser.name}
                                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-red-700/80 shadow-xs"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-800 via-red-900 to-slate-900 text-white flex items-center justify-center font-black text-base shadow-xs">
                                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                              )}
                              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white flex items-center justify-center text-white" title="Active Account">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                              </span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-sm font-extrabold text-slate-950 tracking-tight truncate max-w-[145px] sm:max-w-[160px]">
                                  {currentUser.name}
                                </p>
                                <BadgeCheck className="w-4 h-4 text-red-600 shrink-0" />
                              </div>
                              <p className="text-[11px] text-slate-500 truncate font-medium mt-0.5">{currentUser.email}</p>
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  currentUser.role === 'admin' 
                                    ? 'bg-red-50 text-red-700 border-red-200' 
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${currentUser.role === 'admin' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                  {currentUser.role === 'admin' ? 'Security Staff' : 'CU Verified Student'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Credential Strip with One-Tap Copy */}
                          <div className="mt-3 grid grid-cols-2 gap-1.5 pt-2.5 border-t border-slate-100 text-xs">
                            <button
                              type="button"
                              onClick={handleCopyUid}
                              className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 transition-all text-left group cursor-pointer"
                              title="Click to copy CU UID"
                            >
                              <div className="min-w-0">
                                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block leading-tight">CU UID</span>
                                <span className="text-[11px] font-mono font-bold text-slate-800 truncate block">
                                  {currentUser.uidOrRoll || 'Not Set'}
                                </span>
                              </div>
                              <div className="w-6 h-6 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-500 group-hover:text-slate-800 transition-colors shrink-0 ml-1">
                                {copiedUid ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />}
                              </div>
                            </button>

                            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-left min-w-0 flex flex-col justify-center">
                              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block leading-tight">Contact</span>
                              <span className="text-[11px] font-medium text-slate-800 truncate block">
                                {currentUser.phone || 'Not Set'}
                              </span>
                            </div>
                          </div>

                          {currentUser.department && (
                            <div className="mt-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50/80 border border-slate-200/50 flex items-center gap-1.5 text-[11px] text-slate-600">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate font-medium">{currentUser.department}</span>
                            </div>
                          )}
                        </div>

                        {/* Action Menu Items */}
                        <div className="p-1.5 space-y-0.5">
                          <button
                            onClick={() => {
                              setNeedsProfileCompletion(true);
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-all group text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-700 flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
                                <Edit3 className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 group-hover:text-slate-950 leading-tight">Edit Profile</p>
                                <p className="text-[10px] text-slate-400 leading-tight truncate">Photo, department &amp; details</p>
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </button>

                          <button
                            onClick={() => {
                              setCurrentTab('student-dashboard');
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-all group text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                                <LayoutDashboard className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 group-hover:text-slate-950 leading-tight">My Dashboard</p>
                                <p className="text-[10px] text-slate-400 leading-tight truncate">Lost reports &amp; active claims</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {unreadMatchesCount > 0 && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full animate-pulse">
                                  {unreadMatchesCount}
                                </span>
                              )}
                              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              handleOpenNotificationModal();
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-all group text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
                                <Bell className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 group-hover:text-slate-950 leading-tight">Push Notifications</p>
                                <p className="text-[10px] text-slate-400 leading-tight truncate">
                                  {notificationPermission === 'granted' ? 'Alerts active for item chats' : 'Enable browser alerts'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`w-2 h-2 rounded-full ${notificationPermission === 'granted' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </button>

                          {currentUser && isUserAdmin(currentUser.email) && isAdmin && (
                            <button
                              onClick={() => {
                                setCurrentTab('admin-dashboard');
                                setIsProfileDropdownOpen(false);
                              }}
                              className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-red-900 hover:bg-red-50/60 transition-all group text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-red-800 text-white flex items-center justify-center shrink-0">
                                  <Shield className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-red-900 leading-tight">Security Custody Desk</p>
                                  <p className="text-[10px] text-red-600/80 leading-tight truncate">Admin item handovers &amp; logs</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {pendingClaimsCount > 0 && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded-full">
                                    {pendingClaimsCount}
                                  </span>
                                )}
                                <ChevronRight className="w-3.5 h-3.5 text-red-400 group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </button>
                          )}

                          {currentUser && isUserAdmin(currentUser.email) && !isAdmin && (
                            <button
                              onClick={() => {
                                openAdminVerificationModal();
                                setIsProfileDropdownOpen(false);
                              }}
                              className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-amber-900 bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/80 transition-all group text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-amber-700 text-white flex items-center justify-center shrink-0">
                                  <Lock className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-amber-950 leading-tight">Unlock Admin Console</p>
                                  <p className="text-[10px] text-amber-700 leading-tight truncate">Passcode required</p>
                                </div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                            </button>
                          )}
                        </div>

                        {/* Sign Out Footer */}
                        <div className="p-1.5 bg-slate-50/70">
                          <button
                            onClick={async () => {
                              await logout();
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 p-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50/80 rounded-xl transition-colors text-left cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-red-100/60 text-red-600 flex items-center justify-center shrink-0">
                              <LogOut className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-bold">Sign Out</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-600 bg-slate-100/90 border border-slate-200/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Public Guest View
                  </span>
                  <button
                    onClick={() => setCurrentTab('login')}
                    className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer active:scale-95 ${
                      currentTab === 'login'
                        ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-md shadow-rose-600/30'
                        : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 shadow-xs hover:shadow-md'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Student</span>
                    <span>Sign In</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-950 rounded-xl hover:bg-slate-100"
              aria-label="Toggle navigation"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-xl px-4 py-3 space-y-2">
          <button
            onClick={() => handleTabClick('browse')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-left ${
              currentTab === 'browse' ? 'bg-slate-100 text-slate-950' : 'text-slate-600'
            }`}
          >
            <Compass className="w-4 h-4 text-slate-500" />
            <span>Explore Campus Lost &amp; Found</span>
          </button>
          <button
            onClick={() => handleTabClick('student-dashboard')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-left ${
              currentTab === 'student-dashboard' ? 'bg-slate-100 text-slate-950' : 'text-slate-600'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-slate-500" />
            <span>Student Dashboard</span>
            {unreadMatchesCount > 0 && (
              <span className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                {unreadMatchesCount} Matches
              </span>
            )}
          </button>
          {currentUser && isUserAdmin(currentUser.email) && (
            <button
              onClick={() => handleTabClick('admin-dashboard')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-left ${
                currentTab === 'admin-dashboard' ? 'bg-red-50 text-red-800' : 'text-slate-600'
              }`}
            >
              <Shield className="w-4 h-4 text-red-700" />
              <span>Campus Security Admin Desk</span>
              {pendingClaimsCount > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-full">
                  {pendingClaimsCount} Pending
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => { handleOpenNotificationModal(); setIsMobileMenuOpen(false); }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-left text-slate-700 bg-slate-50 hover:bg-slate-100 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-amber-600" />
              <span>Browser Push Alerts</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${notificationPermission === 'granted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {notificationPermission === 'granted' ? 'Active' : 'Enable'}
            </span>
          </button>

          {!isAuthenticated && (
            <button
              onClick={() => { setCurrentTab('login'); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-extrabold rounded-full text-xs shadow-md shadow-rose-600/30 cursor-pointer active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span>Student / Staff Login</span>
            </button>
          )}
        </div>
      )}

      {!onOpenNotificationModal && (
        <NotificationSettingsModal
          isOpen={isNotificationModalOpen}
          onClose={() => {
            setIsNotificationModalOpen(false);
            setNotificationPermission(getNotificationPermission());
          }}
        />
      )}
    </header>
  );
};
