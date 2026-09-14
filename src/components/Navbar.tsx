import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
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
  Building2
} from 'lucide-react';

type NavTab = 'browse' | 'student-dashboard' | 'admin-dashboard' | 'login';

interface NavbarProps {
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  onOpenReportModal?: (type: 'lost' | 'found') => void;
  unreadMatchesCount: number;
  pendingClaimsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenReportModal,
  unreadMatchesCount,
  pendingClaimsCount,
}) => {
  const { currentUser, isAuthenticated, logout, openAuthModal, setNeedsProfileCompletion } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const handleTabClick = (tab: NavTab) => {
    if (tab === 'student-dashboard' && !isAuthenticated) {
      openAuthModal('login', 'Please sign in with your Chandigarh University credentials to access your student dashboard.');
      return;
    }
    if (tab === 'admin-dashboard' && !isAuthenticated) {
      openAuthModal('login', 'Please sign in with authorized campus credentials to access the security custody desk.');
      return;
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
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-2xl glass-panel-subtle shadow-xs">
            <button
              onClick={() => handleTabClick('browse')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'browse'
                  ? 'bg-white text-slate-950 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-slate-500" />
              <span>Explore Items</span>
            </button>

            <button
              onClick={() => handleTabClick('student-dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
                currentTab === 'student-dashboard'
                  ? 'bg-white text-slate-950 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
              <span>My Dashboard</span>
              {unreadMatchesCount > 0 && (
                <span className="flex items-center gap-1 px-1.5 py-0.2 bg-amber-500/15 border border-amber-500/40 text-amber-800 text-[10px] font-extrabold rounded-full animate-pulse">
                  <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                  {unreadMatchesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabClick('admin-dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
                currentTab === 'admin-dashboard'
                  ? 'bg-red-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-red-800 hover:bg-white/40'
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
          </nav>

          {/* Right: Glass Actions & Profile */}
          <div className="flex items-center gap-2">
            {/* Profile / Login Menu */}
            <div className="relative">
              {isAuthenticated && currentUser ? (
                <div>
                  <button
                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200/80 bg-white/60 hover:bg-white transition-all shadow-2xs"
                    aria-label="User profile menu"
                  >
                    {currentUser.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.name}
                        className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-800 to-red-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                        {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                  </button>

                  {isProfileDropdownOpen && (
                    <>
                      {/* Click outside backdrop */}
                      <div 
                        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]" 
                        onClick={() => setIsProfileDropdownOpen(false)} 
                      />

                      <div className="absolute right-0 mt-2 w-76 sm:w-80 bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-900/10 p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                        {/* Profile Header */}
                        <div className="flex items-center gap-3 p-2.5 bg-slate-50/90 rounded-xl border border-slate-100 mb-2">
                          {currentUser.avatarUrl ? (
                            <img
                              src={currentUser.avatarUrl}
                              alt={currentUser.name}
                              className="w-11 h-11 rounded-xl object-cover border-2 border-red-700/80 shadow-2xs shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-800 to-red-900 text-white flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
                              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-slate-950 truncate">{currentUser.name}</p>
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                                currentUser.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {currentUser.role === 'admin' ? 'Security Staff' : 'CU Student'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{currentUser.email}</p>
                          </div>
                        </div>

                        {/* Verified Student Credentials */}
                        <div className="p-2 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-1.5 text-xs mb-2">
                          {/* Student UID */}
                          <div className="flex items-center justify-between py-1 bg-white px-2.5 rounded-lg border border-slate-200/60">
                            <div className="flex items-center gap-2 min-w-0">
                              <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <div className="min-w-0">
                                <span className="text-[10px] text-slate-500 block leading-tight">CU UID / Roll</span>
                                <span className="font-mono font-bold text-slate-900 text-xs truncate block">
                                  {currentUser.uidOrRoll || 'Not Set'}
                                </span>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0" title="UID is permanent">
                              <Lock className="w-2.5 h-2.5 text-slate-400" />
                            </span>
                          </div>

                          {/* Contact Mobile */}
                          <div className="flex items-center justify-between py-1 bg-white px-2.5 rounded-lg border border-slate-200/60">
                            <div className="flex items-center gap-2 min-w-0">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <div className="min-w-0">
                                <span className="text-[10px] text-slate-500 block leading-tight">Contact Mobile</span>
                                <span className="font-semibold text-slate-900 text-xs truncate block">
                                  {currentUser.phone || 'Not Set'}
                                </span>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0" title="Contact number is permanent">
                              <Lock className="w-2.5 h-2.5 text-slate-400" />
                            </span>
                          </div>

                          {/* Academic Department */}
                          {currentUser.department && (
                            <div className="flex items-center justify-between py-1 bg-white px-2.5 rounded-lg border border-slate-200/60">
                              <div className="flex items-center gap-2 min-w-0">
                                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <div className="min-w-0">
                                  <span className="text-[10px] text-slate-500 block leading-tight">Department</span>
                                  <span className="font-medium text-slate-800 text-xs truncate block max-w-[190px]">
                                    {currentUser.department}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Navigation & Action Links */}
                        <div className="space-y-0.5">
                          <button
                            onClick={() => {
                              setNeedsProfileCompletion(true);
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-800 hover:text-red-900 hover:bg-red-50/70 rounded-xl transition-colors text-left"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-red-700" />
                            <span>Edit Profile Details</span>
                          </button>

                          <button
                            onClick={() => {
                              setCurrentTab('student-dashboard');
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-colors text-left"
                          >
                            <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
                            <span>My Dashboard &amp; Claims</span>
                          </button>

                          {currentUser.role === 'admin' && (
                            <button
                              onClick={() => {
                                setCurrentTab('admin-dashboard');
                                setIsProfileDropdownOpen(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-red-800 hover:bg-red-50/60 rounded-xl transition-colors text-left"
                            >
                              <Shield className="w-3.5 h-3.5 text-red-700" />
                              <span>Campus Security Desk</span>
                            </button>
                          )}

                          <button
                            onClick={async () => {
                              await logout();
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left border-t border-slate-100 mt-1 pt-1.5"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sign Out</span>
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
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all ${
                      currentTab === 'login'
                        ? 'bg-red-800 text-white shadow-sm'
                        : 'border border-slate-200 bg-white/80 hover:bg-white text-slate-800 shadow-2xs hover:shadow-xs'
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

          {!isAuthenticated && (
            <button
              onClick={() => { setCurrentTab('login'); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2.5 bg-gradient-to-r from-red-700 to-red-800 text-white font-bold rounded-xl text-xs shadow-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>Student / Staff Login</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
