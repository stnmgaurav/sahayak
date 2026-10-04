import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth, isUserAdmin } from './context/AuthContext';
import { ItemReport, ItemClaim, ReportType } from './types';
import { getStoredItems, getStoredClaims, subscribeToStorage, deleteItem, updateClaim } from './lib/storage';
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
import { ReviewClaimModal } from './components/ReviewClaimModal';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { UserProfileCompletionModal } from './components/UserProfileCompletionModal';
import { AdminVerificationModal } from './components/AdminVerificationModal';
import { InAppNotificationBanner } from './components/InAppNotificationBanner';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { NotificationPanel } from './components/NotificationPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { routeClaimDecisionNotification } from './lib/notificationStore';
import { 
  registerServiceWorker, 
  subscribeToCrossTabNotifications, 
  handleIncomingMessageNotification,
  deliverBrowserNotification 
} from './lib/notifications';
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
  Radio,
  ShieldCheck
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
    } else if (isAuthenticated && currentTab === 'admin-dashboard') {
      if (!currentUser || !isUserAdmin(currentUser.email)) {
        setCurrentTab('browse');
        openAuthModal('login', 'Access Restricted: Campus Security Desk is strictly reserved for campus administrator.');
      } else if (!isAdmin) {
        openAdminVerificationModal();
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

  // Handle opening item chat when user clicks a push notification or in-app alert
  useEffect(() => {
    const handleOpenItemChat = (e: Event) => {
      const customEvent = e as CustomEvent<{ itemId: string; messageId?: string }>;
      const targetId = customEvent.detail?.itemId;
      if (targetId) {
        const currentList = getStoredItems();
        const found = currentList.find(i => i.id === targetId) || items.find(i => i.id === targetId);
        if (found) {
          setMessageTargetItem(found);
          setMessageModalOpen(true);
        }
      }
    };

    window.addEventListener('sahayak:open_item_chat', handleOpenItemChat);
    return () => {
      window.removeEventListener('sahayak:open_item_chat', handleOpenItemChat);
    };
  }, [items]);

  // Check URL parameter on load (e.g. redirected from Service Worker push notification or shared item link)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const openChatId = params.get('openItemChat');
      if (openChatId) {
        const currentList = getStoredItems();
        const found = currentList.find(i => i.id === openChatId) || items.find(i => i.id === openChatId);
        if (found) {
          setMessageTargetItem(found);
          setMessageModalOpen(true);
        }
      }

      // Deep link to shared item listing
      const openItemId = params.get('item') || params.get('itemId');
      if (openItemId) {
        const currentList = getStoredItems();
        const found = currentList.find(i => i.id === openItemId) || items.find(i => i.id === openItemId);
        if (found) {
          setSelectedItem(found);
          setDetailModalOpen(true);
        }
      }
    }
  }, [items]);

  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchLostItem, setMatchLostItem] = useState<ItemReport | null>(null);
  const [matchFoundItem, setMatchFoundItem] = useState<ItemReport | null>(null);

  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptClaim, setReceiptClaim] = useState<ItemClaim | null>(null);
  const [receiptItem, setReceiptItem] = useState<ItemReport | null>(null);

  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);

  const [reviewClaimModalOpen, setReviewClaimModalOpen] = useState(false);
  const [reviewClaimInitialMode, setReviewClaimInitialMode] = useState<'view' | 'accept' | 'reject' | 'proof'>('view');
  const [selectedClaimForReview, setSelectedClaimForReview] = useState<ItemClaim | null>(null);
  const [selectedItemForClaimReview, setSelectedItemForClaimReview] = useState<ItemReport | null>(null);

  const handleOpenReviewClaim = (
    claimId: string, 
    itemId?: string, 
    mode: 'view' | 'accept' | 'reject' | 'proof' = 'view'
  ) => {
    const currentClaims = getStoredClaims();
    const foundClaim = currentClaims.find(c => c.id === claimId) || claims.find(c => c.id === claimId);
    if (foundClaim) {
      setSelectedClaimForReview(foundClaim);
      const currentItems = getStoredItems();
      const targetItem = currentItems.find(i => i.id === foundClaim.itemId) || items.find(i => i.id === foundClaim.itemId);
      setSelectedItemForClaimReview(targetItem || null);
      setReviewClaimInitialMode(mode);
      setReviewClaimModalOpen(true);
    }
  };

  const handleAcceptClaimHandover = (claimId: string, pickupLocation: string, adminNotes?: string) => {
    updateClaim(claimId, {
      status: 'verified',
      pickupLocation,
      adminNotes,
      verifiedAt: new Date().toISOString(),
    });

    const updatedClaims = getStoredClaims();
    setClaims(updatedClaims);
    setItems(getStoredItems());

    const c = updatedClaims.find(claim => claim.id === claimId) || selectedClaimForReview;
    if (c) {
      // 1. Route decision notification to both parties
      routeClaimDecisionNotification(c, 'verified', { pickupLocation, adminNotes });

      // 2. Deliver push alert
      deliverBrowserNotification({
        title: `🎉 Claim Approved for "${c.itemTitle}"`,
        body: `The finder verified your ownership proof! Collect your belonging at: ${pickupLocation}.`,
        icon: selectedItemForClaimReview?.imageUrl || '/logo.svg',
        itemId: c.itemId,
        tag: `sahayak-claim-approved-${claimId}`,
        onClick: () => {
          window.focus();
          setCurrentTab('student-dashboard');
        },
      });
    }
  };

  const handleRejectClaimHandover = (claimId: string, reason: string) => {
    updateClaim(claimId, {
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: new Date().toISOString(),
    });

    const updatedClaims = getStoredClaims();
    setClaims(updatedClaims);
    setItems(getStoredItems());

    const c = updatedClaims.find(claim => claim.id === claimId) || selectedClaimForReview;
    if (c) {
      // 1. Route decision notification to both parties
      routeClaimDecisionNotification(c, 'rejected', { reason });

      // 2. Deliver push alert
      deliverBrowserNotification({
        title: `Claim Not Approved for "${c.itemTitle}"`,
        body: `The finder or security could not verify your claim. Reason: "${reason}".`,
        icon: selectedItemForClaimReview?.imageUrl || '/logo.svg',
        itemId: c.itemId,
        tag: `sahayak-claim-rejected-${claimId}`,
        onClick: () => {
          window.focus();
          setCurrentTab('student-dashboard');
        },
      });
    }
  };

  useEffect(() => {
    const handleOpenSettings = () => setNotificationSettingsOpen(true);
    const handleOpenNotifications = () => setNotificationPanelOpen(true);
    const handleViewItemEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ itemId: string }>;
      const targetId = customEvent.detail?.itemId;
      if (targetId) {
        const currentList = getStoredItems();
        const found = currentList.find(i => i.id === targetId) || items.find(i => i.id === targetId);
        if (found) {
          handleViewDetails(found);
        }
      }
    };
    const handleReviewClaimEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ claimId: string; itemId?: string; mode?: 'view' | 'accept' | 'reject' | 'proof' }>;
      if (customEvent.detail?.claimId) {
        handleOpenReviewClaim(customEvent.detail.claimId, customEvent.detail.itemId, customEvent.detail.mode);
      }
    };

    window.addEventListener('sahayak:open_notification_settings', handleOpenSettings);
    window.addEventListener('sahayak:open_notifications', handleOpenNotifications);
    window.addEventListener('sahayak:view_item', handleViewItemEvent);
    window.addEventListener('sahayak:review_claim', handleReviewClaimEvent);
    return () => {
      window.removeEventListener('sahayak:open_notification_settings', handleOpenSettings);
      window.removeEventListener('sahayak:open_notifications', handleOpenNotifications);
      window.removeEventListener('sahayak:view_item', handleViewItemEvent);
      window.removeEventListener('sahayak:review_claim', handleReviewClaimEvent);
    };
  }, [items, claims]);

  // Register push notification service worker on mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Listen for real-time cross-tab chat messages to deliver push notifications to recipient
  useEffect(() => {
    const unsubscribe = subscribeToCrossTabNotifications((newMsg) => {
      if (currentUser) {
        const currentList = getStoredItems();
        const targetItem = currentList.find(i => i.id === newMsg.itemId) || items.find(i => i.id === newMsg.itemId);
        handleIncomingMessageNotification(newMsg, targetItem, currentUser.id, currentUser.email);
      }
    });
    return unsubscribe;
  }, [currentUser, items]);

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
    deleteItem(itemId, currentUser?.id, isAdmin, currentUser?.email);
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
        onOpenNotificationModal={() => setNotificationSettingsOpen(true)}
        onOpenNotificationPanel={() => setNotificationPanelOpen(true)}
      />

      {/* 2. Main Views */}
      <main className="flex-1 pb-20">
        {/* DEDICATED LOGIN PAGE VIEW */}
        {currentTab === 'login' && (
          <LoginPage
            onBackToBrowse={() => setCurrentTab('browse')}
            onOpenDashboard={(role) => setCurrentTab(role === 'admin' && currentUser && isUserAdmin(currentUser.email) ? 'admin-dashboard' : 'student-dashboard')}
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
            onOpenSecurityDesk={() => {
              if (!isAdmin) {
                openAdminVerificationModal();
              } else {
                setCurrentTab('admin-dashboard');
              }
            }}
          />
        )}

        {/* ADMIN DASHBOARD VIEW */}
        {currentTab === 'admin-dashboard' && (
          <ErrorBoundary fallbackTitle="Campus Security & Admin Desk">
            <AdminDashboard
              items={items}
              claims={claims}
              onViewItemDetails={handleViewDetails}
              onViewReceipt={handleViewReceipt}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
              onBackToBrowse={() => setCurrentTab('browse')}
            />
          </ErrorBoundary>
        )}

        {/* BROWSE VIEW WITH BENTO GRID + GLASSMORPHISM */}
        {currentTab === 'browse' && (
          <div className="space-y-10">
            {/* HERO SECTION: SWIGGY INSTAMART CLEAN MODERN BENTO GRID */}
            <section className="pt-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                
                {/* BENTO TILE 1 (Col 1-12): Primary Hero Card */}
                <div className="md:col-span-12 rounded-2xl border border-slate-100 bg-white p-6 sm:p-8 relative overflow-hidden flex flex-col justify-between shadow-xs">
                  {/* Subtle clean accent glow */}
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-red-50/70 rounded-full blur-2xl pointer-events-none"></div>

                  <div className="space-y-3 relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-red-800 text-xs font-bold tracking-wide uppercase">
                      <Shield className="w-3.5 h-3.5 text-red-700" />
                      <span>Chandigarh University • Smart Campus</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                      SAHAYAK
                    </h1>

                    {/* Prominent Tagline */}
                    <p className="text-base sm:text-xl font-extrabold text-red-800 leading-snug">
                      “Lost something on campus? Let SAHAYAK help you find it.”
                    </p>

                    <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-2xl">
                      Real-time AI matching, verified student authentication, and automated security desk custody for over full campus across all academic blocks.
                    </p>
                  </div>

                  {/* Two Primary Action Pill Buttons - Vibrant Modern Gradients */}
                  <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch gap-3.5 relative z-10">
                    <button
                      onClick={() => handleOpenReportModal('lost')}
                      className="flex-1 group/btn flex items-center justify-between p-3.5 px-5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white shadow-md shadow-rose-600/25 hover:shadow-lg hover:shadow-rose-600/35 transition-all duration-300 cursor-pointer active:scale-95"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                          <PlusCircle className="w-5 h-5 text-rose-100 group-hover/btn:scale-110 transition-transform duration-200" />
                        </div>
                        <div className="text-left">
                          <p className="text-[11px] uppercase font-black tracking-wider text-rose-200">Lost Item?</p>
                          <p className="text-sm font-extrabold text-white">I Lost Something</p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center group-hover/btn:bg-white/25 transition-colors">
                        <ArrowUpRight className="w-4 h-4 text-white group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                      </div>
                    </button>

                    <button
                      onClick={() => handleOpenReportModal('found')}
                      className="flex-1 group/btn flex items-center justify-between p-3.5 px-5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-700 hover:from-emerald-400 hover:via-teal-500 hover:to-emerald-600 text-white shadow-md shadow-emerald-600/25 hover:shadow-lg hover:shadow-emerald-600/35 transition-all duration-300 cursor-pointer active:scale-95"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                          <HandHeart className="w-5 h-5 text-emerald-100 group-hover/btn:scale-110 transition-transform duration-200" />
                        </div>
                        <div className="text-left">
                          <p className="text-[11px] uppercase font-black tracking-wider text-emerald-200">Found Item?</p>
                          <p className="text-sm font-extrabold text-white">I Found Something</p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center group-hover/btn:bg-white/25 transition-colors">
                        <ArrowUpRight className="w-4 h-4 text-white group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                      </div>
                    </button>
                  </div>
                </div>

                {/* BENTO TILE 3 (Col 1-5): Real-Time Campus Live Activity */}
                <div className="md:col-span-5 rounded-2xl border border-slate-100 bg-white p-5 relative overflow-hidden shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                        Live Campus Activity
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">Live Feed</span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-transparent border border-emerald-100/90 flex items-center gap-3 hover:border-emerald-200 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-emerald-500/30">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-slate-900 truncate">boAt Airdopes 141 returned</p>
                        <p className="text-[10px] text-slate-500 font-medium">Security Gate 1 • Verified Handover</p>
                      </div>
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200">Returned</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-transparent border border-amber-100/90 flex items-center gap-3 hover:border-amber-200 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-amber-500/30">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-slate-900 truncate">HP Envy x360 matched (92%)</p>
                        <p className="text-[10px] text-slate-500 font-medium">Central Library Reading Hall</p>
                      </div>
                      <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-200">Matched</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-gradient-to-r from-rose-50/70 via-red-50/40 to-transparent border border-rose-100/90 flex items-center gap-3 hover:border-rose-200 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-rose-500/30">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-slate-900 truncate">CU Student ID card reported</p>
                        <p className="text-[10px] text-slate-500 font-medium">North Campus Food Court</p>
                      </div>
                      <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100/90 px-2.5 py-0.5 rounded-full border border-rose-200">Available</span>
                    </div>
                  </div>
                </div>

                {/* BENTO TILE 4 (Col 6-12): Campus Security Custody Desks */}
                <div className="md:col-span-7 rounded-2xl border border-slate-100 bg-white p-5 relative overflow-hidden shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-red-50 text-red-700 flex items-center justify-center">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                        Campus Custody &amp; Handover Desks
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">Verified Physical Locations</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200/80 hover:border-red-200 transition-all space-y-1 group">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-extrabold text-slate-900 group-hover:text-red-700 transition-colors">Block C3 Desk</p>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100"></span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">Student Welfare Center</p>
                      <p className="text-[10px] font-extrabold text-red-700 pt-1">9:00 AM – 5:30 PM</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200/80 hover:border-red-200 transition-all space-y-1 group">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-extrabold text-slate-900 group-hover:text-red-700 transition-colors">Central Library</p>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100"></span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">Ground Floor Reception</p>
                      <p className="text-[10px] font-extrabold text-red-700 pt-1">8:30 AM – 8:00 PM</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200/80 hover:border-emerald-200 transition-all space-y-1 group">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">Gate 2 Security</p>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100"></span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">NH-95 Main Entrance</p>
                      <p className="text-[10px] font-extrabold text-emerald-700 pt-1">24x7 Assistance</p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Every item claimed requires digital OTP verification &amp; physical student ID inspection.</span>
                  </p>
                </div>
              </div>
            </section>

            {/* CATEGORY DISCOVERY STRIP - VIBRANT MODERN APP STYLE */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
                {QUICK_CATEGORIES.map(cat => {
                  const isSelected = categoryFilter === cat.id;
                  const count = cat.id === 'all' ? activeItems.length : (categoryCounts[cat.id] || 0);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(isSelected && cat.id !== 'all' ? 'all' : cat.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all duration-200 shrink-0 cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-rose-600/25 border border-rose-500/50'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                      }`}
                    >
                      <span className="text-sm">{cat.icon}</span>
                      <span>{cat.label}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-0.5 ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* INTERACTIVE EXPLORER & FILTERS */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
              <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-xs space-y-4">
                {/* Search Bar & Primary Type Pills */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                  {/* Search Input - Pill Shape */}
                  <div className="relative w-full md:max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                    <input
                      type="text"
                      placeholder="Search items, keywords, brand model, or block..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-14 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/90 rounded-full text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-500 shadow-2xs transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-4 top-3 text-xs text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Type Filter Buttons - Vibrant Modern Pills */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-full w-full md:w-auto border border-slate-200/60 shadow-2xs overflow-x-auto scrollbar-none no-scrollbar">
                    <button
                      onClick={() => setTypeFilter('all')}
                      className={`flex-1 md:flex-initial px-4 py-2 rounded-full text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                        typeFilter === 'all'
                          ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      All ({activeItems.length})
                    </button>
                    <button
                      onClick={() => setTypeFilter('lost')}
                      className={`flex-1 md:flex-initial px-4 py-2 rounded-full text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                        typeFilter === 'lost'
                          ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-sm shadow-rose-600/30'
                          : 'text-slate-600 hover:text-red-700 hover:bg-rose-50/60'
                      }`}
                    >
                      Lost ({lostCount})
                    </button>
                    <button
                      onClick={() => setTypeFilter('found')}
                      className={`flex-1 md:flex-initial px-4 py-2 rounded-full text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                        typeFilter === 'found'
                          ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-sm shadow-emerald-600/30'
                          : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60'
                      }`}
                    >
                      Found ({foundCount})
                    </button>
                    <button
                      onClick={() => setTypeFilter('matched')}
                      className={`flex-1 md:flex-initial px-4 py-2 rounded-full text-xs font-extrabold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                        typeFilter === 'matched'
                          ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-sm shadow-amber-500/30'
                          : 'text-amber-800 hover:text-amber-950 hover:bg-amber-50/60'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                      <span>AI Matched ({matchFoundCount})</span>
                    </button>
                  </div>
                </div>

                {/* Secondary Category & Location Dropdowns */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-3 border-t border-slate-100 text-xs">
                  {/* Category Filter */}
                  <div className="flex items-center gap-1.5 flex-1 sm:flex-initial min-w-[130px]">
                    <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <select
                      value={categoryFilter}
                      onChange={e => setCategoryFilter(e.target.value)}
                      className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-full text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-slate-400"
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
                      className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-full text-xs font-semibold text-slate-700 sm:max-w-[200px] shadow-2xs focus:outline-none focus:ring-1 focus:ring-slate-400"
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
                      className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-full text-xs font-semibold text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-slate-400"
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
                      className="ml-auto text-xs font-bold text-red-700 hover:text-red-900 flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Filters</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Items Grid with Clean Instamart Cards */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                        Campus Lost &amp; Found Registry
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-red-800 border border-red-200/60">
                        Public View
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Displaying {filteredItems.length} of {items.length} uploaded records • All items accessible without login
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200/80">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Real-time Live Sync</span>
                    </span>
                  </div>
                </div>

                {filteredItems.length === 0 ? (
                  <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center space-y-4 shadow-xs">
                    <div className="w-14 h-14 rounded-full bg-red-50 text-red-700 flex items-center justify-center mx-auto border border-red-100">
                      <Search className="w-6 h-6" />
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-lg">No Matching Items Found</h3>
                    <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                      We couldn't find any reports matching your search criteria. Try modifying your filters or submit a new report.
                    </p>
                    <button
                      onClick={resetFilters}
                      className="px-6 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white rounded-full text-xs font-extrabold shadow-md shadow-rose-600/25 transition-all cursor-pointer active:scale-95"
                    >
                      Clear All Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 w-full">
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
              <p className="font-black text-slate-950 text-[12px]">Crafted with ❤️ by Gaurav</p>
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

      <NotificationPanel
        isOpen={notificationPanelOpen}
        onClose={() => setNotificationPanelOpen(false)}
        onOpenSettings={() => {
          setNotificationPanelOpen(false);
          setNotificationSettingsOpen(true);
        }}
        onOpenChatForItem={(itemId, messageId) => {
          const currentList = getStoredItems();
          const found = currentList.find(i => i.id === itemId) || items.find(i => i.id === itemId);
          if (found) {
            setMessageTargetItem(found);
            setMessageModalOpen(true);
          }
        }}
        onViewItemDetails={(itemId) => {
          const currentList = getStoredItems();
          const found = currentList.find(i => i.id === itemId) || items.find(i => i.id === itemId);
          if (found) {
            handleViewDetails(found);
          }
        }}
        onOpenMatchComparison={(lostItemId) => {
          const currentList = getStoredItems();
          const lost = currentList.find(i => i.id === lostItemId) || items.find(i => i.id === lostItemId);
          if (lost) {
            const matches = findMatchesForItem(lost, currentList, 45);
            if (matches.length > 0) {
              handleOpenMatchComparison(lost, matches[0].candidateItem);
            } else {
              setCurrentTab('student-dashboard');
            }
          }
        }}
        onReviewClaim={handleOpenReviewClaim}
        onNavigateTab={(tab) => setCurrentTab(tab)}
      />

      <ReviewClaimModal
        claim={selectedClaimForReview}
        item={selectedItemForClaimReview}
        isOpen={reviewClaimModalOpen}
        initialDecisionMode={reviewClaimInitialMode}
        onClose={() => setReviewClaimModalOpen(false)}
        onAcceptClaim={handleAcceptClaimHandover}
        onRejectClaim={handleRejectClaimHandover}
        onOpenChatWithClaimant={(itemId) => {
          const currentList = getStoredItems();
          const target = currentList.find(i => i.id === itemId) || items.find(i => i.id === itemId);
          if (target) {
            setMessageTargetItem(target);
            setMessageModalOpen(true);
          }
        }}
      />

      <NotificationSettingsModal
        isOpen={notificationSettingsOpen}
        onClose={() => setNotificationSettingsOpen(false)}
      />

      {/* Floating In-App Chat Notification Banner */}
      <InAppNotificationBanner 
        onOpenChatForItem={(itemId) => {
          const currentList = getStoredItems();
          const found = currentList.find(i => i.id === itemId) || items.find(i => i.id === itemId);
          if (found) {
            setMessageTargetItem(found);
            setMessageModalOpen(true);
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Sahayak Campus Lost & Found System">
      <AuthProvider>
        <SahayakMain />
      </AuthProvider>
    </ErrorBoundary>
  );
}
