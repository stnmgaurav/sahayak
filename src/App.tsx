import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth, isUserAdmin } from './context/AuthContext';
import { ItemReport, ItemClaim, ReportType } from './types';
import { getStoredItems, getStoredClaims, subscribeToStorage, deleteItem } from './lib/storage';
import { findMatchesForItem } from './lib/matching';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { ItemCard } from './components/ItemCard';
import { ReportModal } from './components/ReportModal';
import { ItemDetailModal } from './components/ItemDetailModal';
import { ClaimModal } from './components/ClaimModal';
import { SendMessageModal } from './components/SendMessageModal';
import { MatchingModal } from './components/MatchingModal';
import { HandoverReceiptModal } from './components/HandoverReceiptModal';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { UserProfileCompletionModal } from './components/UserProfileCompletionModal';
import { AdminVerificationModal } from './components/AdminVerificationModal';
import { SahayakLogo } from './components/SahayakLogo';
import { ITEM_CATEGORIES, CU_CAMPUS_LOCATIONS } from './data/mockData';
import { 
  Search, 
  PlusCircle, 
  HandHeart, 
  MapPin, 
  Tag, 
  RotateCcw,
  Shield,
  Sparkles,
  Zap,
  Clock,
  ArrowUpRight,
  SlidersHorizontal,
  Building2,
  CheckCircle2,
  Lock,
  Radio
} from 'lucide-react';

const QUICK_CATEGORIES = [
  { id: 'all', label: 'All Categories', icon: '✨' },
  { id: 'Electronics', label: 'Electronics', icon: '💻' },
  { id: 'ID & Academic Cards', label: 'IDs & Cards', icon: '🪪' },
  { id: 'Keys', label: 'Keys', icon: '🔑' },
  { id: 'Wallets & Purses', label: 'Wallets & Purses', icon: '👛' },
  { id: 'Bags & Backpacks', label: 'Backpacks', icon: '🎒' },
  { id: 'Books & Notes', label: 'Books & Notes', icon: '📚' },
  { id: 'Wearables & Watches', label: 'Watches', icon: '⌚' },
  { id: 'Eyewear & Sunglasses', label: 'Eyewear', icon: '👓' },
  { id: 'Water Bottles', label: 'Bottles', icon: '🍶' },
  { id: 'Clothing & Jackets', label: 'Clothing', icon: '🧥' },
  { id: 'Other Items', label: 'Other', icon: '📦' },
];

function SahayakMain() {
  const { 
    currentUser, 
    isAuthenticated, 
    isAdmin, 
    openAuthModal, 
    openAdminVerificationModal 
  } = useAuth();

  // Storage State
  const [items, setItems] = useState<ItemReport[]>(() => getStoredItems());
  const [claims, setClaims] = useState<ItemClaim[]>(() => getStoredClaims());

  // Subscribe to storage changes
  useEffect(() => {
    const unsubscribe = subscribeToStorage(() => {
      setItems(getStoredItems());
      setClaims(getStoredClaims());
    });
    return unsubscribe;
  }, []);

  // Navigation state
  const [currentTab, setCurrentTab] = useState<'browse' | 'student-dashboard' | 'admin-dashboard' | 'login'>('browse');

  // Guard protected tabs if user is unauthenticated or unauthorized
  useEffect(() => {
    if (!isAuthenticated && (currentTab === 'student-dashboard' || currentTab === 'admin-dashboard')) {
      setCurrentTab('browse');
      openAuthModal('login', 'Please sign in with your Chandigarh University ID to access your dashboard.');
    } else if (isAuthenticated && currentTab === 'admin-dashboard' && !isAdmin) {
      if (currentUser && isUserAdmin(currentUser.email)) {
        openAdminVerificationModal();
      } else {
        setCurrentTab('browse');
        openAuthModal('login', 'Access Restricted: Campus administrator Google verification and master security key (sahayak@1Cu) required.');
      }
    }
  }, [isAuthenticated, currentTab, isAdmin, currentUser, openAuthModal, openAdminVerificationModal]);

  // Filter and Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'lost' | 'found' | 'matched'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportModalType, setReportModalType] = useState<ReportType>('lost');
  const [editingItem, setEditingItem] = useState<ItemReport | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemReport | null>(null);

  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimTargetItem, setClaimTargetItem] = useState<ItemReport | null>(null);

  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageTargetItem, setMessageTargetItem] = useState<ItemReport | null>(null);

  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchLostItem, setMatchLostItem] = useState<ItemReport | null>(null);
  const [matchFoundItem, setMatchFoundItem] = useState<ItemReport | null>(null);

  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptClaim, setReceiptClaim] = useState<ItemClaim | null>(null);
  const [receiptItem, setReceiptItem] = useState<ItemReport | null>(null);

  // Handlers
  const handleOpenReportModal = (type: 'lost' | 'found') => {
    if (!isAuthenticated) {
      openAuthModal('login', `Please sign in with your Chandigarh University ID to report a ${type === 'lost' ? 'lost item' : 'found item'}.`);
      return;
    }
    setEditingItem(null);
    setReportModalType(type);
    setReportModalOpen(true);
  };

  const handleEditItem = (item: ItemReport) => {
    if (!isAuthenticated) {
      openAuthModal('login', 'Please sign in to edit your reported item.');
      return;
    }
    setEditingItem(item);
    setReportModalType(item.type);
    setReportModalOpen(true);
  };

  const handleDeleteItem = (itemId: string) => {
    deleteItem(itemId, currentUser?.id, isAdmin);
    if (selectedItem?.id === itemId) {
      setSelectedItem(null);
      setDetailModalOpen(false);
    }
    setItems(getStoredItems());
  };

  const handleViewDetails = (item: ItemReport) => {
    setSelectedItem(item);
    setDetailModalOpen(true);
  };

  const handleInitiateClaim = (item: ItemReport) => {
    if (!isAuthenticated) {
      openAuthModal('login', 'Please sign in with your Chandigarh University ID to file an ownership claim for this item.');
      return;
    }
    setClaimTargetItem(item);
    setClaimModalOpen(true);
  };

  const handleSendMessage = (item: ItemReport) => {
    if (!isAuthenticated) {
      openAuthModal('login', 'Please sign in with your Chandigarh University ID to send a message to the owner of this lost item.');
      return;
    }
    setMessageTargetItem(item);
    setMessageModalOpen(true);
  };

  const handleOpenMatchComparison = (lostItem: ItemReport, foundItem: ItemReport) => {
    if (!isAuthenticated) {
      openAuthModal('login', 'Please sign in with your Chandigarh University ID to review AI match candidates and file claims.');
      return;
    }
    setMatchLostItem(lostItem);
    setMatchFoundItem(foundItem);
    setMatchModalOpen(true);
  };

  const handleViewReceipt = (claim: ItemClaim, item: ItemReport) => {
    if (!isAuthenticated) {
      openAuthModal('login', 'Please sign in to inspect and download official handover receipts.');
      return;
    }
    setReceiptClaim(claim);
    setReceiptItem(item);
    setReceiptModalOpen(true);
  };

  // Compute matches map for quick access
  const matchesMap = useMemo(() => {
    const map = new Map<string, { count: number; topScore: number; bestCandidate?: ItemReport }>();
    items.forEach(item => {
      const candidates = findMatchesForItem(item, items, 45);
      if (candidates.length > 0) {
        map.set(item.id, {
          count: candidates.length,
          topScore: candidates[0].matchScore,
          bestCandidate: candidates[0].candidateItem,
        });
      }
    });
    return map;
  }, [items]);

  const pendingClaimsCount = claims.filter(c => c.status === 'pending').length;
  const returnedCount = items.filter(i => i.status === 'returned' || i.status === 'recovered').length;

  // Active items for home page listings, search, and category counts (excluding recovered and returned)
  const activeItems = useMemo(() => {
    return items.filter(i => i.status !== 'recovered' && i.status !== 'returned');
  }, [items]);

  const matchFoundCount = activeItems.filter(i => i.status === 'match_found' || (matchesMap.get(i.id)?.count || 0) > 0).length;
  const lostCount = activeItems.filter(i => i.type === 'lost').length;
  const foundCount = activeItems.filter(i => i.type === 'found').length;
  
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    activeItems.forEach(it => {
      counts[it.category] = (counts[it.category] || 0) + 1;
    });
    return counts;
  }, [activeItems]);

  const userLostItems = currentUser ? items.filter(i => (i.userId === currentUser.id || (currentUser.email && i.userEmail === currentUser.email)) && i.type === 'lost') : [];
  const unreadMatchesCount = userLostItems.reduce((acc, lost) => {
    return acc + (matchesMap.get(lost.id)?.count || 0);
  }, 0);

  // Filter items for browse view:
  // Recovered items must automatically disappear from the Home Page, active listings, and search results.
  // Search matches user's text with item name, category, description, and location.
  const filteredItems = useMemo(() => {
    return activeItems.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.locationBlock.toLowerCase().includes(q) ||
        item.specificSpot.toLowerCase().includes(q) ||
        item.color.toLowerCase().includes(q) ||
        (item.brandOrModel && item.brandOrModel.toLowerCase().includes(q)) ||
        (item.identifyingMark && item.identifyingMark.toLowerCase().includes(q));

      const matchesType = 
        typeFilter === 'all' ||
        (typeFilter === 'matched' 
          ? (item.status === 'match_found' || (matchesMap.get(item.id)?.count || 0) > 0)
          : item.type === typeFilter);

      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesLocation = locationFilter === 'all' || item.locationBlock.includes(locationFilter);
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesType && matchesCategory && matchesLocation && matchesStatus;
    });
  }, [activeItems, searchQuery, typeFilter, categoryFilter, locationFilter, statusFilter, matchesMap]);

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setLocationFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 flex flex-col font-sans selection:bg-red-800 selection:text-white relative overflow-x-hidden mesh-bg-ambient">
      {/* Subtle Ambient Mesh Orbs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="fixed top-1/3 right-10 w-[30rem] h-[30rem] bg-blue-500/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed bottom-10 left-10 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10"></div>

      {/* 1. University Navigation Header (Glassmorphic) */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenReportModal={handleOpenReportModal}
        unreadMatchesCount={unreadMatchesCount}
        pendingClaimsCount={pendingClaimsCount}
      />

      {/* 2. Main Views */}
      <main className="flex-1 pb-20">
        {/* DEDICATED LOGIN PAGE VIEW */}
        {currentTab === 'login' && (
          <LoginPage
            onBackToBrowse={() => setCurrentTab('browse')}
            onOpenDashboard={(role) => setCurrentTab(role === 'admin' ? 'admin-dashboard' : 'student-dashboard')}
          />
        )}

        {/* STUDENT DASHBOARD VIEW */}
        {currentTab === 'student-dashboard' && (
          <StudentDashboard
            items={items}
            claims={claims}
            onOpenReportModal={handleOpenReportModal}
            onViewItemDetails={handleViewDetails}
            onOpenMatchComparison={handleOpenMatchComparison}
            onViewReceipt={handleViewReceipt}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            onClaimItem={handleInitiateClaim}
            onSendMessage={handleSendMessage}
            onBackToBrowse={() => setCurrentTab('browse')}
          />
        )}

        {/* ADMIN DASHBOARD VIEW */}
        {currentTab === 'admin-dashboard' && (
          <AdminDashboard
            items={items}
            claims={claims}
            onViewItemDetails={handleViewDetails}
            onViewReceipt={handleViewReceipt}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            onBackToBrowse={() => setCurrentTab('browse')}
          />
        )}

        {/* BROWSE VIEW WITH BENTO GRID + GLASSMORPHISM */}
        {currentTab === 'browse' && (
          <div className="space-y-10">
            {/* HERO SECTION: MODERN STARTUP BENTO GRID */}
            <section className="pt-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                
                {/* BENTO TILE 1 (Col 1-12): Primary Interactive Hero Glass Card */}
                <div className="md:col-span-12 glass-panel rounded-3xl p-6 sm:p-9 relative overflow-hidden flex flex-col justify-between group shadow-lg">
                  {/* Specular glass highlight */}
                  <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-gradient-to-br from-red-600/15 via-rose-500/5 to-transparent rounded-full blur-2xl pointer-events-none"></div>

                  <div className="space-y-4 relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-pill text-red-800 text-xs font-bold tracking-wide uppercase shadow-2xs">
                      <Shield className="w-3.5 h-3.5 text-red-700" />
                      <span>Chandigarh University • Smart Campus</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 leading-[1.15]">
                      SAHAYAK
                    </h1>

                    {/* Prominent Tagline */}
                    <p className="text-base sm:text-xl font-bold text-red-800 leading-snug">
                      “Lost something on campus? Let SAHAYAK help you find it.”
                    </p>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                      Real-time AI matching, verified student authentication, and automated security desk custody for over 30,000+ campus members across 14 academic blocks.
                    </p>
                  </div>

                  {/* Two Primary Action Glass Cards */}
                  <div className="mt-6 pt-5 border-t border-slate-200/80 flex flex-col sm:flex-row items-stretch gap-4 relative z-10">
                    <button
                      onClick={() => handleOpenReportModal('lost')}
                      className="flex-1 group/btn flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-red-800 to-red-900 hover:from-red-900 hover:to-red-950 text-white shadow-md shadow-red-900/20 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
                          <PlusCircle className="w-5 h-5 text-red-200 group-hover/btn:scale-110 transition-transform" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs uppercase font-extrabold tracking-wider text-red-200">Lost Item?</p>
                          <p className="text-sm font-black">I Lost Something</p>
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-white/70 group-hover/btn:text-white group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    </button>

                    <button
                      onClick={() => handleOpenReportModal('found')}
                      className="flex-1 group/btn flex items-center justify-between p-4 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white shadow-md hover:shadow-lg transition-all border border-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
                          <HandHeart className="w-5 h-5 text-emerald-400 group-hover/btn:scale-110 transition-transform" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs uppercase font-extrabold tracking-wider text-emerald-400">Found Item?</p>
                          <p className="text-sm font-black">I Found Something</p>
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-white/70 group-hover/btn:text-white group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* BENTO TILE 3 (Col 1-5): Real-Time Campus Live Activity */}
                <div className="md:col-span-5 glass-panel rounded-3xl p-5 relative overflow-hidden shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Live Campus Activity
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">Just Now</span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="p-2.5 rounded-xl bg-white/70 border border-slate-200/80 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">boAt Airdopes 141 returned</p>
                        <p className="text-[10px] text-slate-500">Security Gate 1 • Verified Handover</p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Returned</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/70 border border-slate-200/80 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">HP Envy x360 matched (92%)</p>
                        <p className="text-[10px] text-slate-500">Central Library Reading Hall</p>
                      </div>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Matched</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/70 border border-slate-200/80 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-100 text-red-800 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">CU Student ID card reported</p>
                        <p className="text-[10px] text-slate-500">North Campus Food Court</p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">Available</span>
                    </div>
                  </div>
                </div>

                {/* BENTO TILE 4 (Col 6-12): Campus Security Custody Desks */}
                <div className="md:col-span-7 glass-panel rounded-3xl p-5 relative overflow-hidden shadow-md flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-red-700" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Campus Custody &amp; Handover Desks
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-2xl bg-white/80 border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-950">Block C3 Desk</p>
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      </div>
                      <p className="text-[11px] text-slate-500">Student Welfare Center</p>
                      <p className="text-[10px] font-extrabold text-slate-700 pt-1">9:00 AM – 5:30 PM</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/80 border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-950">Central Library</p>
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      </div>
                      <p className="text-[11px] text-slate-500">Ground Floor Reception</p>
                      <p className="text-[10px] font-extrabold text-slate-700 pt-1">8:30 AM – 8:00 PM</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/80 border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-950">Gate 2 security Room</p>
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      </div>
                      <p className="text-[11px] text-slate-500">NH-95 gate 2 security</p>
                      <p className="text-[10px] font-extrabold text-emerald-700 pt-1">24x7 Assistance</p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-200/80 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Every item claimed requires digital OTP verification &amp; physical student ID inspection.</span>
                  </p>
                </div>
              </div>
            </section>

            {/* CATEGORY DISCOVERY STRIP */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
                {QUICK_CATEGORIES.map(cat => {
                  const isSelected = categoryFilter === cat.id;
                  const count = cat.id === 'all' ? activeItems.length : (categoryCounts[cat.id] || 0);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(isSelected && cat.id !== 'all' ? 'all' : cat.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                        isSelected
                          ? 'bg-red-800 text-white shadow-md shadow-red-900/20 scale-[1.02]'
                          : 'bg-white/80 hover:bg-white text-slate-700 border border-slate-200/80 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <span className="text-sm">{cat.icon}</span>
                      <span>{cat.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ml-0.5 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* INTERACTIVE EXPLORER & GLASS FILTERS */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
                {/* Search Bar & Primary Type Pills */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                  {/* Search Input */}
                  <div className="relative w-full md:max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                    <input
                      type="text"
                      placeholder="Search items, keywords, brand model, or block..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 bg-white/80 border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white shadow-2xs transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3.5 top-3 text-xs text-slate-400 hover:text-slate-700 font-bold"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Type Filter Buttons */}
                  <div className="flex items-center gap-1.5 p-1 glass-panel-subtle rounded-2xl w-full md:w-auto border border-slate-200/80 shadow-2xs overflow-x-auto">
                    <button
                      onClick={() => setTypeFilter('all')}
                      className={`flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        typeFilter === 'all'
                          ? 'bg-slate-950 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({activeItems.length})
                    </button>
                    <button
                      onClick={() => setTypeFilter('lost')}
                      className={`flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        typeFilter === 'lost'
                          ? 'bg-red-800 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Lost ({lostCount})
                    </button>
                    <button
                      onClick={() => setTypeFilter('found')}
                      className={`flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        typeFilter === 'found'
                          ? 'bg-emerald-800 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Found ({foundCount})
                    </button>
                    <button
                      onClick={() => setTypeFilter('matched')}
                      className={`flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
                        typeFilter === 'matched'
                          ? 'bg-amber-700 text-white shadow-sm'
                          : 'text-amber-800 hover:text-amber-950'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>AI Matched ({matchFoundCount})</span>
                    </button>
                  </div>
                </div>

                {/* Secondary Category & Location Dropdowns */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-3 border-t border-slate-200/60 text-xs">
                  {/* Category Filter */}
                  <div className="flex items-center gap-1.5 flex-1 sm:flex-initial min-w-[130px]">
                    <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <select
                      value={categoryFilter}
                      onChange={e => setCategoryFilter(e.target.value)}
                      className="w-full sm:w-auto px-2.5 sm:px-3 py-1.5 bg-white/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-red-600"
                    >
                      <option value="all">All Categories ({activeItems.length})</option>
                      {ITEM_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {cat} ({categoryCounts[cat] || 0})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Campus Location Filter */}
                  <div className="flex items-center gap-1.5 flex-1 sm:flex-initial min-w-[150px]">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <select
                      value={locationFilter}
                      onChange={e => setLocationFilter(e.target.value)}
                      className="w-full sm:w-auto px-2.5 sm:px-3 py-1.5 bg-white/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 sm:max-w-[200px] shadow-2xs focus:outline-none focus:ring-1 focus:ring-red-600"
                    >
                      <option value="all">All Locations</option>
                      {CU_CAMPUS_LOCATIONS.map(loc => (
                        <option key={loc} value={loc.split('(')[0].trim()}>{loc.split('(')[0].trim()}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-1.5 flex-1 sm:flex-initial min-w-[130px]">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="w-full sm:w-auto px-2.5 sm:px-3 py-1.5 bg-white/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-red-600"
                    >
                      <option value="all">All Statuses</option>
                      <option value="lost">Lost / Active</option>
                      <option value="found">Found / Available</option>
                      <option value="match_found">AI Match Found</option>
                      <option value="claim_pending">Claim Review</option>
                      <option value="verified">Verified</option>
                      <option value="returned">Returned</option>
                    </select>
                  </div>

                  {/* Reset Filters Button */}
                  {(searchQuery || typeFilter !== 'all' || categoryFilter !== 'all' || locationFilter !== 'all' || statusFilter !== 'all') && (
                    <button
                      onClick={resetFilters}
                      className="ml-auto text-xs font-bold text-red-700 hover:text-red-900 flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Filters</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Items Grid with Glassmorphic Cards */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-950 tracking-tight">
                        Campus Lost &amp; Found Registry
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-200/60">
                        Public View
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Displaying {filteredItems.length} of {items.length} uploaded records • All items accessible without login
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200/80">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Real-time Live Sync</span>
                    </span>
                  </div>
                </div>

                {filteredItems.length === 0 ? (
                  <div className="glass-panel rounded-3xl p-12 text-center space-y-4 shadow-md">
                    <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center mx-auto border border-red-100">
                      <Search className="w-6 h-6" />
                    </div>
                    <h3 className="font-black text-slate-900 text-lg">No Matching Items Found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      We couldn't find any reports matching your search criteria. Try modifying your filters or submit a new report.
                    </p>
                    <button
                      onClick={resetFilters}
                      className="px-5 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-slate-900 transition-all"
                    >
                      Clear All Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredItems.map(item => {
                      const matchData = matchesMap.get(item.id);
                      return (
                        <ItemCard
                          key={item.id}
                          item={item}
                          hasMatch={!!matchData}
                          matchScore={matchData?.topScore}
                          onViewDetails={handleViewDetails}
                          onClaimItem={handleInitiateClaim}
                          onSendMessage={handleSendMessage}
                          onViewMatch={(target) => {
                            if (!isAuthenticated) {
                              openAuthModal('login', 'Please sign in with your Chandigarh University ID to inspect AI match candidate details and initiate verification.');
                              return;
                            }
                            if (matchData?.bestCandidate) {
                              if (target.type === 'lost') {
                                handleOpenMatchComparison(target, matchData.bestCandidate);
                              } else {
                                handleOpenMatchComparison(matchData.bestCandidate, target);
                              }
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. University Glassmorphic Footer */}
      <footer className="glass-panel border-t border-slate-200/80 py-10 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 border border-slate-200/80 text-red-700 flex items-center justify-center font-bold text-sm shadow-xs">
              <SahayakLogo className="w-8 h-8" />
            </div>
            <div>
              <p className="font-black text-slate-950 text-sm">SAHAYAK — Chandigarh University</p>
              <p className="text-[11px] text-slate-500">Autonomous Student Welfare &amp; Campus Security Handover System</p>
            </div>
          </div>
        </div>
      </footer>

      {/* 4. Modals System with Glass Backdrops */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
          setEditingItem(null);
        }}
        initialType={reportModalType}
        existingItems={items}
        editingItem={editingItem}
        onItemCreated={(newItem) => {
          setItems(getStoredItems());
          setEditingItem(null);
          handleViewDetails(newItem);
        }}
      />

      <ItemDetailModal
        item={selectedItem}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        matches={selectedItem ? findMatchesForItem(selectedItem, items, 45) : []}
        onClaim={handleInitiateClaim}
        onSendMessage={handleSendMessage}
        onOpenMatchComparison={handleOpenMatchComparison}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
      />

      <ClaimModal
        item={claimTargetItem}
        isOpen={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        onClaimSubmitted={() => {
          setClaims(getStoredClaims());
          setItems(getStoredItems());
        }}
      />

      <SendMessageModal
        item={messageTargetItem}
        isOpen={messageModalOpen}
        onClose={() => {
          setMessageModalOpen(false);
          setMessageTargetItem(null);
        }}
        onMessageSent={() => {
          setItems(getStoredItems());
        }}
      />

      <MatchingModal
        lostItem={matchLostItem}
        foundItem={matchFoundItem}
        isOpen={matchModalOpen}
        onClose={() => setMatchModalOpen(false)}
        onProceedToClaim={(foundItem) => {
          setMatchModalOpen(false);
          handleInitiateClaim(foundItem);
        }}
      />

      <HandoverReceiptModal
        claim={receiptClaim}
        item={receiptItem}
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
      />

      <AuthModal />
      <AdminVerificationModal onSuccess={() => setCurrentTab('admin-dashboard')} />
      <UserProfileCompletionModal
        onProfileCompleted={() => {
          setCurrentTab('student-dashboard');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SahayakMain />
    </AuthProvider>
  );
}
