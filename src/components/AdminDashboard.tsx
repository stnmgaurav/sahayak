import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ItemReport, ItemClaim, UserProfile, ItemStatus } from '../types';
import { 
  updateClaim, 
  deleteClaim,
  updateItemStatus, 
  deleteItem, 
  getStoredUsers, 
  subscribeToStorage, 
  updateUser, 
  deleteUser 
} from '../lib/storage';
import { SahayakLogo } from './SahayakLogo';
import { AdminUserListingsModal } from './AdminUserListingsModal';
import { AdminEditUserModal } from './AdminEditUserModal';
import { AdminAddUserModal } from './AdminAddUserModal';
import { 
  Shield, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Printer, 
  Search, 
  Filter, 
  Building2, 
  FileText, 
  PackageCheck, 
  TrendingUp, 
  Users,
  MapPin,
  ExternalLink,
  PhoneCall,
  Lock,
  ArrowUpRight,
  ArrowLeft,
  Edit3,
  UserPlus,
  Eye,
  Mail,
  GraduationCap,
  ShieldAlert,
  Calendar,
  Sparkles,
  Check,
  Tag
} from 'lucide-react';

interface AdminDashboardProps {
  items: ItemReport[];
  claims: ItemClaim[];
  onBackToBrowse: () => void;
  onViewItemDetails: (item: ItemReport) => void;
  onViewReceipt: (claim: ItemClaim, item: ItemReport) => void;
  onEditItem?: (item: ItemReport) => void;
  onDeleteItem?: (itemId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  items,
  claims,
  onBackToBrowse,
  onViewItemDetails,
  onViewReceipt,
  onEditItem,
  onDeleteItem,
}) => {
  const { currentUser, isAdmin, openAdminVerificationModal } = useAuth();
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'claims' | 'ledger' | 'hotspots'>('reports');

  // Defensive array checks
  const safeItems = Array.isArray(items) ? items : [];
  const safeClaims = Array.isArray(claims) ? claims : [];

  // Listings state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'lost' | 'found'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Users state
  const [users, setUsers] = useState<UserProfile[]>(() => getStoredUsers());
  const safeUsers = Array.isArray(users) ? users : [];
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'student' | 'admin'>('all');

  // Modal states
  const [selectedUserForListings, setSelectedUserForListings] = useState<UserProfile | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // Sync users list whenever storage updates
  useEffect(() => {
    const unsubscribe = subscribeToStorage(() => {
      setUsers(getStoredUsers());
    });
    return () => unsubscribe();
  }, []);

  // Stats calculation
  const totalReports = safeItems.length;
  const activeLost = safeItems.filter(i => i && i.type === 'lost' && i.status !== 'returned' && i.status !== 'recovered').length;
  const itemsInCustody = safeItems.filter(i => i && i.type === 'found' && i.status !== 'returned' && i.status !== 'recovered').length;
  const pendingClaims = safeClaims.filter(c => c && c.status === 'pending').length;
  const returnedItems = safeItems.filter(i => i && (i.status === 'returned' || i.status === 'recovered')).length;
  const recoveryRate = totalReports > 0 ? Math.round((returnedItems / totalReports) * 100) : 0;

  // Handlers for Claim Review
  const handleVerifyClaim = (claimId: string, notes?: string) => {
    updateClaim(claimId, {
      status: 'verified',
      verifiedAt: new Date().toISOString(),
      adminNotes: notes || 'Verified with physical ID check approved by Campus Security.',
    });
  };

  const handleReturnClaim = (claimId: string) => {
    updateClaim(claimId, {
      status: 'returned',
      returnedAt: new Date().toISOString(),
      adminNotes: 'Physically handed over to student upon verification of CU UID card.',
    });
  };

  const handleRejectClaim = (claimId: string) => {
    let reason = 'Claim rejected due to insufficient ownership evidence.';
    try {
      const custom = window.prompt('Enter reason for rejecting this claim (e.g. Serial number mismatch, incorrect secret answer):', reason);
      if (custom !== null) {
        reason = custom.trim() || reason;
      }
    } catch {
      // In case window.prompt is restricted in iframe
    }
    updateClaim(claimId, {
      status: 'rejected',
      adminNotes: reason,
    });
  };

  const handleDeleteClaim = (claimId: string) => {
    let confirmed = true;
    try {
      confirmed = window.confirm('Are you sure you want to permanently remove this claim from the security database?');
    } catch {}
    if (confirmed) {
      deleteClaim(claimId);
    }
  };

  // Delete item handler
  const handleDeleteItem = (item: ItemReport) => {
    const isItemOwner = Boolean(
      currentUser && (
        currentUser.id === item.userId || 
        (currentUser.email && item.userEmail && currentUser.email.toLowerCase() === item.userEmail.toLowerCase())
      )
    );
    if (!isAdmin && !isItemOwner) {
      return;
    }

    let confirmed = true;
    try {
      confirmed = window.confirm(`Are you sure you want to permanently remove listing "${item.title}" from the platform?`);
    } catch {}
    if (confirmed) {
      if (onDeleteItem) {
        onDeleteItem(item.id);
      } else {
        deleteItem(item.id, currentUser?.id, isAdmin, currentUser?.email);
      }
    }
  };

  // Safe edit handler
  const handleEditClick = (item: ItemReport) => {
    const isItemOwner = Boolean(
      currentUser && (
        currentUser.id === item.userId || 
        (currentUser.email && item.userEmail && currentUser.email.toLowerCase() === item.userEmail.toLowerCase())
      )
    );
    if (!isAdmin && !isItemOwner) {
      return;
    }
    if (onEditItem) {
      onEditItem(item);
    }
  };

  // Toggle role handler
  const handleToggleRole = (user: UserProfile) => {
    const newRole = user.role === 'admin' ? 'student' : 'admin';
    const confirmMsg = newRole === 'admin' 
      ? `Promote ${user.name} (${user.uidOrRoll}) to Campus Security Admin?`
      : `Demote ${user.name} from Admin back to Student role?`;

    let confirmed = true;
    try {
      confirmed = window.confirm(confirmMsg);
    } catch {}
    if (confirmed) {
      updateUser(user.id, { role: newRole });
      setUsers(getStoredUsers());
    }
  };

  // Delete user handler
  const handleDeleteUser = (user: UserProfile) => {
    let confirmed = true;
    try {
      confirmed = window.confirm(`Are you sure you want to delete user account "${user.name}" (${user.email})?`);
    } catch {}
    if (confirmed) {
      deleteUser(user.id);
      setUsers(getStoredUsers());
    }
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    return safeItems.filter(item => {
      if (!item) return false;
      const title = (item.title || '').toLowerCase();
      const loc = (item.locationBlock || '').toLowerCase();
      const user = (item.userName || '').toLowerCase();
      const uid = (item.userUid || '').toLowerCase();
      const email = (item.userEmail || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();

      const matchesSearch = !q || (
        title.includes(q) ||
        loc.includes(q) ||
        user.includes(q) ||
        uid.includes(q) ||
        email.includes(q) ||
        desc.includes(q)
      );
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesType && matchesStatus && matchesCategory;
    });
  }, [safeItems, searchQuery, typeFilter, statusFilter, categoryFilter]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = (userSearchQuery || '').toLowerCase().trim();
    return safeUsers.filter(user => {
      if (!user) return false;
      const name = (user.name || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const uid = (user.uidOrRoll || '').toLowerCase();
      const phone = (user.phone || '').toLowerCase();
      const dept = (user.department || '').toLowerCase();

      const matchesSearch = !q || (
        name.includes(q) ||
        email.includes(q) ||
        uid.includes(q) ||
        phone.includes(q) ||
        dept.includes(q)
      );
      const matchesRole = userRoleFilter === 'all' || user.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [safeUsers, userSearchQuery, userRoleFilter]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    safeItems.forEach(i => {
      if (i && i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [safeItems]);

  // Hotspots calculation
  const hotspotCounts: Record<string, number> = {};
  safeItems.forEach(i => {
    if (!i) return;
    const loc = i.locationBlock || 'Campus Area';
    const block = loc.split('(')[0].trim() || 'General Campus';
    hotspotCounts[block] = (hotspotCounts[block] || 0) + 1;
  });
  const sortedHotspots = Object.entries(hotspotCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Back Navigation Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToBrowse}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-extrabold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Back to Campus Registry</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddUserModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold text-white bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 shadow-md shadow-rose-600/25 transition-all cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Campus User</span>
          </button>
        </div>
      </div>

      {/* Admin Dark Glassmorphism Header */}
      <div className="glass-dark text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white p-2 text-red-700 flex items-center justify-center font-bold shadow-lg shadow-black/40 shrink-0 border border-white/20">
            <SahayakLogo className="w-12 h-12" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight text-white">
                Campus Security &amp; Safe Custody
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-red-600/30 text-red-300 border border-red-500/40">
                Admin Console
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Chandigarh University Central Platform Manager • Listings &amp; User Administration • Real-time Sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 flex-wrap">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-slate-200 text-xs font-bold backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Live Registry Database</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-600/20 border border-red-500/30 text-red-200 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-red-300" />
            <span>Administrator Access</span>
          </span>
        </div>
      </div>

      {/* Secondary Security Passcode Banner if !isAdmin */}
      {!isAdmin && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-amber-500/30 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/30">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">
                Secondary Security Verification Required
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Full administrative actions (overriding listings, verified returns, promoting users) require the session security passcode.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAdminVerificationModal}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-full text-xs font-extrabold shadow-md shadow-rose-600/25 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Unlock Admin Desk</span>
          </button>
        </div>
      )}

      {/* Bento Grid KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5 w-full">
        <div 
          onClick={() => setActiveTab('reports')}
          className="rounded-2xl p-3.5 sm:p-4 transition-all cursor-pointer bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md shadow-slate-900/10 hover:shadow-lg hover:-translate-y-0.5 border border-slate-700/60 min-w-0"
        >
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
            Total Listings
          </span>
          <span className="text-xl sm:text-2xl font-black text-white mt-1 block">{totalReports}</span>
          <span className="text-[10px] text-slate-300 font-medium truncate block">Logged on Campus</span>
        </div>

        <div 
          onClick={() => setActiveTab('users')}
          className="rounded-2xl p-3.5 sm:p-4 transition-all cursor-pointer bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white shadow-md shadow-rose-600/20 hover:shadow-lg hover:-translate-y-0.5 border border-rose-500/50 min-w-0"
        >
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/80 block truncate">
            Platform Users
          </span>
          <span className="text-xl sm:text-2xl font-black text-white mt-1 block">{users.length}</span>
          <span className="text-[10px] text-white/80 font-medium truncate block">Students &amp; Staff</span>
        </div>

        <div 
          onClick={() => { setActiveTab('reports'); setTypeFilter('lost'); }}
          className="rounded-2xl p-3.5 sm:p-4 transition-all cursor-pointer bg-gradient-to-br from-rose-50 to-orange-50/50 border border-rose-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 min-w-0"
        >
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 block truncate">
            Active Lost
          </span>
          <span className="text-xl sm:text-2xl font-black text-rose-700 mt-1 block">{activeLost}</span>
          <span className="text-[10px] text-rose-700/80 font-medium truncate block">Search Active</span>
        </div>

        <div 
          onClick={() => { setActiveTab('reports'); setTypeFilter('found'); }}
          className="rounded-2xl p-3.5 sm:p-4 transition-all cursor-pointer bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 min-w-0"
        >
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 block truncate">
            Safe Custody
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 block">{itemsInCustody}</span>
          <span className="text-[10px] text-emerald-700/80 font-medium truncate block">In Vault / Desk</span>
        </div>

        <div 
          onClick={() => setActiveTab('claims')}
          className="rounded-2xl p-3.5 sm:p-4 transition-all cursor-pointer bg-gradient-to-br from-amber-50 to-yellow-50/50 border border-amber-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 min-w-0"
        >
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 block truncate">
            Pending Claims
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-700 mt-1 block">{pendingClaims}</span>
          <span className="text-[10px] text-amber-700/80 font-medium truncate block">Awaiting Inspection</span>
        </div>

        <div 
          onClick={() => setActiveTab('ledger')}
          className="rounded-2xl p-3.5 sm:p-4 transition-all cursor-pointer bg-gradient-to-br from-sky-50 to-blue-50/50 border border-sky-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 min-w-0"
        >
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600 block truncate">
            Recovered / Returned
          </span>
          <span className="text-xl sm:text-2xl font-black text-sky-700 mt-1 block">{returnedItems}</span>
          <span className="text-[10px] text-emerald-600 font-bold truncate block">{recoveryRate}% Recovery</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="glass-panel rounded-full p-1.5 shadow-2xs flex items-center gap-1.5 overflow-x-auto scrollbar-none no-scrollbar">
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer active:scale-95 ${
            activeTab === 'reports' 
              ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>All Campus Listings ({items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer active:scale-95 ${
            activeTab === 'users' 
              ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-md shadow-rose-600/25' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Campus Users Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer active:scale-95 ${
            activeTab === 'claims' 
              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md shadow-amber-500/25' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Claims Review Queue ({pendingClaims} Pending)</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer active:scale-95 ${
            activeTab === 'ledger' 
              ? 'bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-700 text-white shadow-md shadow-emerald-600/25' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>Official Handover Ledger ({returnedItems})</span>
        </button>

        <button
          onClick={() => setActiveTab('hotspots')}
          className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer active:scale-95 ${
            activeTab === 'hotspots' 
              ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 text-white shadow-md shadow-purple-600/25' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Campus Hotspots &amp; Analytics</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ALL LISTINGS MANAGEMENT                                           */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Listings Filter Toolbar */}
          <div className="glass-panel rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by title, location, student name, roll number, or phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white/80 border border-slate-200/80 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-600 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                className="px-3 py-2 bg-white/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="all">All Types (Lost &amp; Found)</option>
                <option value="lost">Lost Reports Only</option>
                <option value="found">Found Reports Only</option>
              </select>

              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-white/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="all">All Statuses</option>
                <option value="lost">Lost</option>
                <option value="found">Found</option>
                <option value="match_found">Match Found</option>
                <option value="claim_pending">Claim Pending</option>
                <option value="claimed">Claimed</option>
                <option value="verified">Verified</option>
                <option value="returned">Returned</option>
                <option value="recovered">Recovered</option>
              </select>
            </div>
          </div>

          {/* Listings Table with Direct Edit and Delete */}
          <div className="glass-panel rounded-3xl overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-xs text-slate-700">
                <thead className="bg-slate-100/80 border-b border-slate-200/80 font-bold uppercase tracking-wider text-[10px] text-slate-500">
                  <tr>
                    <th className="p-3.5">Item Details</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Campus Location</th>
                    <th className="p-3.5">Reported By (Student)</th>
                    <th className="p-3.5">Status Flow</th>
                    <th className="p-3.5 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No listings match your current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map(item => {
                      // Find user profile for this item
                      const itemUser = users.find(u => 
                        u.id === item.userId || 
                        (u.email && item.userEmail && u.email.toLowerCase() === item.userEmail.toLowerCase()) ||
                        (u.uidOrRoll && item.userUid && u.uidOrRoll.toLowerCase() === item.userUid.toLowerCase())
                      );

                      // Security logic: only the original owner or administrator can edit or delete
                      const isItemOwner = Boolean(
                        currentUser && (
                          currentUser.id === item.userId || 
                          (currentUser.email && item.userEmail && currentUser.email.toLowerCase() === item.userEmail.toLowerCase())
                        )
                      );
                      const canModify = Boolean(isAdmin || isItemOwner);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={item.imageUrl || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=200&auto=format&fit=crop&q=80'}
                                alt={item.title || 'Reported Item'}
                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                              />
                              <div>
                                <span className="font-bold text-slate-900 block truncate max-w-[200px] text-sm">
                                  {item.title || 'Untitled Item'}
                                </span>
                                <span className="text-[11px] text-slate-400 block">
                                  {item.dateTime ? new Date(item.dateTime).toLocaleDateString() : 'Recent'} • Color: {item.color || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              item.type === 'lost' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {item.type || 'lost'}
                            </span>
                          </td>

                          <td className="p-3.5 font-semibold text-slate-800">
                            {item.category || 'General Item'}
                          </td>

                          <td className="p-3.5 text-slate-600 max-w-[170px]">
                            <span className="font-medium text-slate-900 block truncate">{item.locationBlock || 'Campus Grounds'}</span>
                            <span className="text-[10px] text-slate-400 block truncate">{item.specificSpot || ''}</span>
                          </td>

                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-900 block">{item.userName || item.userEmail || 'CU User'}</span>
                              <span className="text-[10px] text-slate-500 block">
                                UID: {item.userUid || 'N/A'} • {item.hidePhone ? '(Phone Hidden)' : (item.userPhone || 'No Phone')}
                              </span>
                              {itemUser && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedUserForListings(itemUser)}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 hover:text-red-900 mt-0.5"
                                  title="View all listings submitted by this student"
                                >
                                  <Users className="w-3 h-3" />
                                  <span>View User's Listings</span>
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="p-3.5">
                            {canModify ? (
                              <select
                                value={item.status || 'lost'}
                                onChange={e => updateItemStatus(item.id, e.target.value as ItemStatus, currentUser?.id, isAdmin, currentUser?.email)}
                                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-600 shadow-2xs"
                              >
                                <option value="lost">Lost</option>
                                <option value="found">Found</option>
                                <option value="match_found">Match Found</option>
                                <option value="claim_pending">Claim Pending</option>
                                <option value="claimed">Claimed</option>
                                <option value="verified">Verified</option>
                                <option value="returned">Returned</option>
                                <option value="recovered">Recovered</option>
                              </select>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                                {(item.status || 'lost').replace('_', ' ')}
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit Listing: strictly restricted to owner or admin */}
                              {canModify && onEditItem && (
                                <button
                                  type="button"
                                  onClick={() => handleEditClick(item)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-950 text-white rounded-full text-xs font-extrabold transition-all shadow-2xs active:scale-95 cursor-pointer"
                                  title="Edit full report details (Owner / Admin only)"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                              )}

                              {/* View Details */}
                              <button
                                type="button"
                                onClick={() => onViewItemDetails(item)}
                                className="px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-full transition-all active:scale-95 cursor-pointer"
                                title="Inspect details"
                              >
                                View
                              </button>

                              {/* Delete Listing: strictly restricted to owner or admin */}
                              {canModify ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item)}
                                  className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-colors"
                                  title="Permanently delete this report (Owner / Admin only)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <span 
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-200/70 rounded-lg cursor-not-allowed"
                                  title="Protected: Only the listing owner or administrator can edit or delete this report"
                                >
                                  <Lock className="w-3 h-3 text-slate-400" />
                                  <span>Locked</span>
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: USERS & PLATFORM DIRECTORY                                         */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Users Header Toolbar */}
          <div className="glass-panel rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search campus users by name, roll number, email, phone, or department..."
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white/80 border border-slate-200/80 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-600 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={userRoleFilter}
                onChange={e => setUserRoleFilter(e.target.value as any)}
                className="px-3 py-2 bg-white/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="all">All Roles (Students &amp; Admins)</option>
                <option value="student">Students Only</option>
                <option value="admin">Administrators Only</option>
              </select>

              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold text-white bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 transition-all shadow-md shadow-rose-600/25 cursor-pointer active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add New User</span>
              </button>
            </div>
          </div>

          {/* Users Directory Table */}
          <div className="glass-panel rounded-3xl overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-xs text-slate-700">
                <thead className="bg-slate-100/80 border-b border-slate-200/80 font-bold uppercase tracking-wider text-[10px] text-slate-500">
                  <tr>
                    <th className="p-3.5">Campus Member</th>
                    <th className="p-3.5">Contact Info</th>
                    <th className="p-3.5">Academic Dept / Unit</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Activity &amp; Listings</th>
                    <th className="p-3.5 text-right">User Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No registered users match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => {
                      const uEmail = (user.email || '').toLowerCase();
                      const uUid = (user.uidOrRoll || '').toLowerCase();

                      // Count this user's items
                      const userItems = safeItems.filter(i => 
                        (user.id && i.userId === user.id) || 
                        (uEmail && (i.userEmail || '').toLowerCase() === uEmail) ||
                        (uUid && (i.userUid || '').toLowerCase() === uUid)
                      );
                      const lostCount = userItems.filter(i => i.type === 'lost').length;
                      const foundCount = userItems.filter(i => i.type === 'found').length;
                      const userClaimsCount = safeClaims.filter(c => 
                        (user.id && c.claimantId === user.id) || 
                        (uEmail && (c.claimantEmail || '').toLowerCase() === uEmail) ||
                        (uUid && (c.claimantUid || '').toLowerCase() === uUid)
                      ).length;

                      const isAdminUser = user.role === 'admin';
                      const displayName = user.name || user.email || 'Campus Member';
                      const displayInitial = (displayName.charAt(0) || 'U').toUpperCase();

                      return (
                        <tr key={user.id || user.email} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-700 to-rose-600 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                                {displayInitial}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block text-sm">
                                  {displayName}
                                </span>
                                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <GraduationCap className="w-3.5 h-3.5 text-red-600" />
                                  UID: {user.uidOrRoll || 'Not Provided'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className="text-slate-800 font-medium block">{user.email}</span>
                            <span className="text-[11px] text-slate-500 block">{user.phone || 'No Phone Registered'}</span>
                          </td>

                          <td className="p-3.5 text-slate-600 max-w-[200px]">
                            <span className="block truncate font-medium">{user.department || 'Chandigarh University'}</span>
                            <span className="text-[10px] text-slate-400">Joined: {user.joinedDate}</span>
                          </td>

                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              isAdminUser 
                                ? 'bg-red-100 text-red-800 border border-red-200' 
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}>
                              {isAdminUser && <ShieldCheck className="w-3 h-3 text-red-700" />}
                              <span>{isAdminUser ? 'Admin' : 'Student'}</span>
                            </span>
                          </td>

                          <td className="p-3.5">
                            <button
                              type="button"
                              onClick={() => setSelectedUserForListings(user)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-95"
                            >
                              <FileText className="w-3.5 h-3.5 text-red-700" />
                              <span>{userItems.length} Listings</span>
                              <span className="text-[10px] text-slate-400">({lostCount}L / {foundCount}F)</span>
                            </button>
                          </td>

                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Manage User's Listings */}
                              <button
                                type="button"
                                onClick={() => setSelectedUserForListings(user)}
                                className="px-3.5 py-1.5 text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-950 rounded-full transition-all shadow-2xs cursor-pointer active:scale-95"
                                title="Manage all listings reported by this user"
                              >
                                Manage Listings
                              </button>

                              {/* Edit Profile */}
                              <button
                                type="button"
                                onClick={() => setEditingUser(user)}
                                className="p-1.5 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                                title="Edit user details"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {/* Toggle Role */}
                              <button
                                type="button"
                                onClick={() => handleToggleRole(user)}
                                className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold transition-all cursor-pointer active:scale-95 ${
                                  isAdminUser 
                                    ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200' 
                                    : 'text-red-700 bg-red-50 hover:bg-red-100 border border-red-200'
                                }`}
                                title={isAdminUser ? 'Demote to student' : 'Promote to admin'}
                              >
                                {isAdminUser ? 'Demote' : 'Make Admin'}
                              </button>

                              {/* Delete User */}
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user)}
                                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                                title="Delete user account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CLAIMS VERIFICATION QUEUE                                          */}
      {/* ========================================================================= */}
      {activeTab === 'claims' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-950">
              Student Ownership Claims Awaiting Security Verification
            </h3>
            <span className="text-xs text-slate-500 font-medium hidden sm:block">
              Review claimant proof against physical item holding specs
            </span>
          </div>

          {safeClaims.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center shadow-md">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="font-black text-slate-900 text-lg">No Pending Claims</h4>
              <p className="text-xs text-slate-500 mt-1">
                All submitted student ownership claims have been resolved and verified.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {safeClaims.map(claim => {
                const item = safeItems.find(i => i && i.id === claim.itemId);
                const isPending = claim.status === 'pending';
                const isVerified = claim.status === 'verified';
                const isReturned = claim.status === 'returned';
                const claimIdStr = String(claim.id || '000000');

                return (
                  <div
                    key={claim.id}
                    className="glass-card rounded-2xl p-5 shadow-xs space-y-4"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100/80 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-red-900 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                            CLAIM #{claimIdStr.slice(-6).toUpperCase()}
                          </span>
                          <h4 className="font-black text-slate-950 text-base">{claim.itemTitle || item?.title || 'Reported Property'}</h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isReturned
                              ? 'bg-slate-950 text-white'
                              : isVerified
                              ? 'bg-emerald-100 text-emerald-800'
                              : claim.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {claim.status || 'pending'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Claimed by {claim.claimantName || 'Student'} (UID: <strong>{claim.claimantUid || 'N/A'}</strong>) • {claim.claimantEmail || ''} • {claim.claimantPhone || ''}
                        </p>
                      </div>

                      {/* Admin Decision Actions */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleVerifyClaim(claim.id)}
                              className="px-4 py-2 bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-700 hover:from-emerald-400 hover:via-teal-500 hover:to-emerald-600 text-white rounded-full text-xs font-extrabold shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              <span>Approve &amp; Verify</span>
                            </button>
                            <button
                              onClick={() => handleRejectClaim(claim.id)}
                              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-full text-xs font-bold transition-all cursor-pointer active:scale-95"
                            >
                              Reject Claim
                            </button>
                          </>
                        )}

                        {isVerified && (
                          <>
                            <button
                              onClick={() => handleReturnClaim(claim.id)}
                              className="px-4 py-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 hover:from-slate-800 hover:to-slate-900 text-white rounded-full text-xs font-extrabold shadow-md shadow-slate-900/25 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>Mark Handed Over / Returned</span>
                            </button>
                            {item && (
                              <button
                                onClick={() => onViewReceipt(claim, item)}
                                className="px-4 py-2 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-full text-xs font-extrabold shadow-md shadow-rose-600/25 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Issue Gate Pass</span>
                              </button>
                            )}
                          </>
                        )}

                        {isReturned && item && (
                          <button
                            onClick={() => onViewReceipt(claim, item)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full text-xs font-extrabold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5 text-red-600" />
                            <span>View Handover Pass</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteClaim(claim.id)}
                          className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                          title="Permanently delete this claim record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Evidence Comparison Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Found Item Specs */}
                      {item && (
                        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                          <div className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center justify-between">
                            <span>Item in Safe Custody</span>
                            <span className="text-slate-500 font-normal">Found at {item.locationBlock}</span>
                          </div>
                          <div className="flex items-center gap-3 pt-1">
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200"
                            />
                            <div className="text-slate-600 space-y-0.5">
                              <p><strong>Category:</strong> {item.category} • <strong>Color:</strong> {item.color}</p>
                              <p><strong>Location Spot:</strong> {item.specificSpot}</p>
                              <p className="line-clamp-2"><strong>Finder's Note:</strong> {item.description}</p>
                            </div>
                          </div>
                          {item.secretVerificationQuestion && (
                            <p className="text-amber-800 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-[11px] mt-2">
                              <strong>Finder's Challenge Question:</strong> "{item.secretVerificationQuestion}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* Right: Claimant's Submitted Proof */}
                      <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 space-y-2 text-xs">
                        <span className="font-bold text-amber-950 text-xs uppercase tracking-wider block">
                          Claimant's Submitted Ownership Proof
                        </span>
                        <p className="text-slate-700">
                          <strong>Proof Description:</strong> {claim.proofDescription}
                        </p>
                        {claim.serialNumberOrIdentifier && (
                          <p className="text-slate-700">
                            <strong>Serial / Identifier:</strong> {claim.serialNumberOrIdentifier}
                          </p>
                        )}
                        {claim.secretAnswer && (
                          <p className="text-amber-950 font-bold">
                            <strong>Answer to Challenge:</strong> "{claim.secretAnswer}"
                          </p>
                        )}
                        {claim.proofImageUrl && (
                          <div className="pt-2">
                            <span className="text-[11px] font-semibold text-slate-600 block mb-1">Attached Bill / Document:</span>
                            <img
                              src={claim.proofImageUrl}
                              alt="Proof"
                              className="w-20 h-20 rounded-xl object-cover border border-slate-300 shadow-2xs"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: HANDOVER LEDGER                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-950">
              Campus Property Handover Register &amp; Clearance Logs
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Official record of items returned to owners
            </span>
          </div>

          <div className="glass-panel rounded-3xl overflow-hidden shadow-md">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/70 border-b border-slate-200/80 font-bold uppercase tracking-wider text-[10px] text-slate-500">
                <tr>
                  <th className="p-3.5">Item Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Holding / Release Point</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Official Pass</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {safeItems.filter(i => i && (i.status === 'returned' || i.status === 'recovered')).map(item => {
                  const claim = safeClaims.find(c => c && c.itemId === item.id) || {
                    id: `claim_${item.id}`,
                    itemId: item.id,
                    itemTitle: item.title || 'Returned Item',
                    itemType: item.type || 'found',
                    claimantId: item.userId || '',
                    claimantName: item.userName || 'Student',
                    claimantEmail: item.userEmail || '',
                    claimantPhone: item.userPhone || '+91 98765 00000',
                    claimantUid: item.userUid || '21BCS10482',
                    proofDescription: 'Verified with physical ID card check at security desk.',
                    status: 'returned' as const,
                    pickupLocation: item.currentHoldingLocation || 'Main Security Gate 1',
                    createdAt: item.createdAt || new Date().toISOString(),
                  };

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="p-3.5 font-bold text-slate-950">{item.title || 'Campus Item'}</td>
                      <td className="p-3.5">{item.category || 'General'}</td>
                      <td className="p-3.5 text-slate-600">{item.currentHoldingLocation || 'Security Gate 1'}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-950 text-emerald-400 uppercase">
                          {item.status || 'returned'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => onViewReceipt(claim, item)}
                          className="px-4 py-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-full text-xs font-extrabold inline-flex items-center gap-1.5 shadow-md shadow-rose-600/25 transition-all cursor-pointer active:scale-95"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Handover Pass</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CAMPUS HOTSPOTS & ANALYTICS                                        */}
      {/* ========================================================================= */}
      {activeTab === 'hotspots' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Hotspots Card */}
          <div className="glass-panel rounded-3xl p-6 shadow-md space-y-4">
            <h3 className="text-base font-black text-slate-950 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-700" />
              <span>Campus Misplacement Hotspots</span>
            </h3>
            <p className="text-xs text-slate-500">
              Areas with highest reported lost items across Chandigarh University
            </p>

            <div className="space-y-3 pt-2">
              {sortedHotspots.slice(0, 5).map(([location, count], idx) => {
                const percentage = Math.round((count / totalReports) * 100);
                return (
                  <div key={location} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{location}</span>
                      <span className="text-slate-500 font-bold">{count} items ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-red-600 to-red-800 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Handover Centers */}
          <div className="glass-panel rounded-3xl p-6 shadow-md space-y-4">
            <h3 className="text-base font-black text-slate-950 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-700" />
              <span>Designated Campus Safe Custody Points</span>
            </h3>
            <div className="space-y-3 pt-1 text-xs">
              <div className="p-3.5 bg-white/70 rounded-2xl border border-slate-200/80">
                <span className="font-bold text-slate-950 block">Main Security Gate 1 (NH-95 Highway)</span>
                <span className="text-slate-500 text-[11px]">Primary 24x7 Lost &amp; Found Central Locker • Intercom: Ext 401</span>
              </div>
              <div className="p-3.5 bg-white/70 rounded-2xl border border-slate-200/80">
                <span className="font-bold text-slate-950 block">Central Library Circulation Counter</span>
                <span className="text-slate-500 text-[11px]">2nd Floor Reading Hall reception • 08:00 AM - 10:00 PM</span>
              </div>
              <div className="p-3.5 bg-white/70 rounded-2xl border border-slate-200/80">
                <span className="font-bold text-slate-950 block">Student Welfare Center (Block C3)</span>
                <span className="text-slate-500 text-[11px]">Room 102 • Lost ID card issuing &amp; physical verification</span>
              </div>
              <div className="p-3.5 bg-white/70 rounded-2xl border border-slate-200/80">
                <span className="font-bold text-slate-950 block">Security Gate 2 (Hostel Complex)</span>
                <span className="text-slate-500 text-[11px]">Boys &amp; Girls Hostel Gate Booth • 24x7 security guard desk</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS: USER LISTINGS, EDIT USER, ADD USER                                */}
      {/* ========================================================================= */}
      {selectedUserForListings && (
        <AdminUserListingsModal
          user={selectedUserForListings}
          items={items}
          isOpen={Boolean(selectedUserForListings)}
          onClose={() => setSelectedUserForListings(null)}
          onEditItem={item => onEditItem?.(item)}
          onDeleteItem={itemId => {
            if (onDeleteItem) {
              onDeleteItem(itemId);
            } else {
              deleteItem(itemId, currentUser?.id, true);
            }
          }}
          onViewItemDetails={onViewItemDetails}
        />
      )}

      {editingUser && (
        <AdminEditUserModal
          user={editingUser}
          isOpen={Boolean(editingUser)}
          onClose={() => setEditingUser(null)}
          onUserUpdated={updated => {
            setUsers(getStoredUsers());
          }}
        />
      )}

      {isAddUserModalOpen && (
        <AdminAddUserModal
          isOpen={isAddUserModalOpen}
          onClose={() => setIsAddUserModalOpen(false)}
          onUserCreated={newUser => {
            setUsers(getStoredUsers());
          }}
        />
      )}
    </div>
  );
};
