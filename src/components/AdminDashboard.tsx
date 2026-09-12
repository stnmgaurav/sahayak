import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ItemReport, ItemClaim } from '../types';
import { updateClaim, updateItemStatus, deleteItem } from '../lib/storage';
import { SahayakLogo } from './SahayakLogo';
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
  ArrowUpRight
} from 'lucide-react';

interface AdminDashboardProps {
  items: ItemReport[];
  claims: ItemClaim[];
  onViewItemDetails: (item: ItemReport) => void;
  onViewReceipt: (claim: ItemClaim, item: ItemReport) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  items,
  claims,
  onViewItemDetails,
  onViewReceipt,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'claims' | 'reports' | 'ledger' | 'hotspots'>('claims');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'lost' | 'found'>('all');

  // Stats calculation
  const totalReports = items.length;
  const activeLost = items.filter(i => i.type === 'lost' && i.status !== 'returned').length;
  const itemsInCustody = items.filter(i => i.type === 'found' && i.status !== 'returned').length;
  const pendingClaims = claims.filter(c => c.status === 'pending').length;
  const returnedItems = items.filter(i => i.status === 'returned').length;
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
    const reason = window.prompt('Enter reason for rejecting this claim (e.g. Serial number mismatch, incorrect secret answer):');
    if (reason !== null) {
      updateClaim(claimId, {
        status: 'rejected',
        adminNotes: reason || 'Claim rejected due to insufficient ownership evidence.',
      });
    }
  };

  // Filtered reports
  const filteredReports = items.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.locationBlock.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Hotspots calculation
  const hotspotCounts: Record<string, number> = {};
  items.forEach(i => {
    const block = i.locationBlock.split('(')[0].trim();
    hotspotCounts[block] = (hotspotCounts[block] || 0) + 1;
  });
  const sortedHotspots = Object.entries(hotspotCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
              Chandigarh University Central Lost &amp; Found Registry • Physical Vault Management &amp; Verified Gate Passes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-slate-200 text-xs font-bold backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Live Registry Online</span>
          </span>
        </div>
      </div>

      {/* Bento Grid KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="glass-panel p-4 rounded-2xl shadow-2xs hover:shadow-md transition-all">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Total Reports
          </span>
          <span className="text-2xl font-black text-slate-950 mt-1 block">{totalReports}</span>
          <span className="text-[10px] text-slate-500 font-medium">Logged on Campus</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl shadow-2xs hover:shadow-md transition-all">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 block">
            Active Lost
          </span>
          <span className="text-2xl font-black text-rose-700 mt-1 block">{activeLost}</span>
          <span className="text-[10px] text-rose-600/80 font-medium">Unrecovered</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl shadow-2xs hover:shadow-md transition-all">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">
            In Safe Custody
          </span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">{itemsInCustody}</span>
          <span className="text-[10px] text-emerald-600/80 font-medium">Inside Campus Vaults</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl shadow-2xs hover:shadow-md transition-all">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block">
            Pending Claims
          </span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">{pendingClaims}</span>
          <span className="text-[10px] text-amber-700/80 font-medium">Awaiting Inspection</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl shadow-2xs hover:shadow-md transition-all">
          <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 block">
            Items Returned
          </span>
          <span className="text-2xl font-black text-sky-700 mt-1 block">{returnedItems}</span>
          <span className="text-[10px] text-sky-700/80 font-medium">Signed Over to Students</span>
        </div>

        <div className="glass-panel p-4 rounded-2xl shadow-2xs hover:shadow-md transition-all">
          <span className="text-[10px] font-black uppercase tracking-wider text-red-700 block">
            Recovery Rate
          </span>
          <span className="text-2xl font-black text-red-800 mt-1 block">{recoveryRate}%</span>
          <span className="text-[10px] text-emerald-600 font-bold">Campus High</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-panel rounded-2xl p-1.5 shadow-2xs flex items-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'claims' 
              ? 'bg-red-800 text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Claims Review Queue ({pendingClaims} Pending)</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'reports' 
              ? 'bg-slate-950 text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>All Campus Registry Records ({items.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'ledger' 
              ? 'bg-slate-950 text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>Official Handover Ledger ({returnedItems})</span>
        </button>

        <button
          onClick={() => setActiveTab('hotspots')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'hotspots' 
              ? 'bg-slate-950 text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Campus Hotspots &amp; Analytics</span>
        </button>
      </div>

      {/* TAB 1: CLAIMS VERIFICATION QUEUE */}
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

          {claims.length === 0 ? (
            <div className="glass-panel rounded-3xl p-12 text-center shadow-md">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="font-black text-slate-900 text-lg">No Pending Claims</h4>
              <p className="text-xs text-slate-500 mt-1">
                All submitted student ownership claims have been resolved and verified.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {claims.map(claim => {
                const item = items.find(i => i.id === claim.itemId);
                const isPending = claim.status === 'pending';
                const isVerified = claim.status === 'verified';
                const isReturned = claim.status === 'returned';

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
                            CLAIM #{claim.id.slice(-6).toUpperCase()}
                          </span>
                          <h4 className="font-black text-slate-950 text-base">{claim.itemTitle}</h4>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            isReturned
                              ? 'bg-slate-950 text-white'
                              : isVerified
                              ? 'bg-emerald-100 text-emerald-800'
                              : claim.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {claim.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Claimed by {claim.claimantName} (UID: <strong>{claim.claimantUid}</strong>) • {claim.claimantEmail} • {claim.claimantPhone}
                        </p>
                      </div>

                      {/* Admin Decision Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleVerifyClaim(claim.id)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              <span>Approve &amp; Mark Verified</span>
                            </button>
                            <button
                              onClick={() => handleRejectClaim(claim.id)}
                              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors"
                            >
                              Reject Claim
                            </button>
                          </>
                        )}

                        {isVerified && (
                          <>
                            <button
                              onClick={() => handleReturnClaim(claim.id)}
                              className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>Mark Handed Over / Returned</span>
                            </button>
                            {item && (
                              <button
                                onClick={() => onViewReceipt(claim, item)}
                                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
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
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>View Handover Pass</span>
                          </button>
                        )}
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

      {/* TAB 2: ALL REPORTS REGISTRY */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="glass-panel rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by title, location, student name, or roll..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white/80 border border-slate-200/80 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-600"
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
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700"
              >
                <option value="all">All Statuses</option>
                <option value="lost">Lost</option>
                <option value="found">Found</option>
                <option value="match_found">Match Found</option>
                <option value="claim_pending">Claim Pending</option>
                <option value="verified">Verified</option>
                <option value="returned">Returned</option>
              </select>
            </div>
          </div>

          {/* Table / List */}
          <div className="glass-panel rounded-3xl overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100/70 border-b border-slate-200/80 font-bold uppercase tracking-wider text-[10px] text-slate-500">
                  <tr>
                    <th className="p-3.5">Item</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Campus Location</th>
                    <th className="p-3.5">Reported By</th>
                    <th className="p-3.5">Status Flow</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block truncate max-w-[180px]">
                              {item.title}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(item.dateTime).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.type === 'lost' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-800">{item.category}</td>
                      <td className="p-3.5 text-slate-600 max-w-[160px] truncate">{item.locationBlock}</td>
                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 block">{item.userName}</span>
                        <span className="text-[10px] text-slate-400">{item.userUid || item.userEmail}</span>
                      </td>
                      <td className="p-3.5">
                        <select
                          value={item.status}
                          onChange={e => updateItemStatus(item.id, e.target.value as any)}
                          className="px-2.5 py-1 bg-white/90 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                        >
                          <option value="lost">Lost</option>
                          <option value="found">Found</option>
                          <option value="match_found">Match Found</option>
                          <option value="claim_pending">Claim Pending</option>
                          <option value="verified">Verified</option>
                          <option value="returned">Returned</option>
                        </select>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => onViewItemDetails(item)}
                          className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200/60 rounded-lg"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete report for "${item.title}"?`)) {
                              deleteItem(item.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                          title="Delete report"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HANDOVER LEDGER */}
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
                {items.filter(i => i.status === 'returned').map(item => {
                  const claim = claims.find(c => c.itemId === item.id) || {
                    id: `claim_${item.id}`,
                    itemId: item.id,
                    itemTitle: item.title,
                    itemType: item.type,
                    claimantId: item.userId,
                    claimantName: item.userName,
                    claimantEmail: item.userEmail,
                    claimantPhone: item.userPhone || '+91 98765 00000',
                    claimantUid: item.userUid || '21BCS10482',
                    proofDescription: 'Verified with physical ID card check at security desk.',
                    status: 'returned' as const,
                    pickupLocation: item.currentHoldingLocation || 'Main Security Gate 1',
                    createdAt: item.createdAt,
                  };

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="p-3.5 font-bold text-slate-950">{item.title}</td>
                      <td className="p-3.5">{item.category}</td>
                      <td className="p-3.5 text-slate-600">{item.currentHoldingLocation || 'Security Gate 1'}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-950 text-emerald-400">
                          RETURNED
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => onViewReceipt(claim, item)}
                          className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
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

      {/* TAB 4: CAMPUS HOTSPOTS & ANALYTICS */}
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
    </div>
  );
};
