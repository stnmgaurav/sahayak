import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserProfile, ItemReport, ItemStatus } from '../types';
import { updateItemStatus } from '../lib/storage';
import { 
  X, 
  Package, 
  MapPin, 
  Calendar, 
  Edit3, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  Search, 
  Filter,
  User,
  GraduationCap,
  Mail,
  Phone,
  Tag,
  Lock
} from 'lucide-react';

interface AdminUserListingsModalProps {
  user: UserProfile | null;
  items: ItemReport[];
  isOpen: boolean;
  onClose: () => void;
  onEditItem: (item: ItemReport) => void;
  onDeleteItem: (itemId: string) => void;
  onViewItemDetails: (item: ItemReport) => void;
}

export const AdminUserListingsModal: React.FC<AdminUserListingsModalProps> = ({
  user,
  items,
  isOpen,
  onClose,
  onEditItem,
  onDeleteItem,
  onViewItemDetails,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [filterType, setFilterType] = useState<'all' | 'lost' | 'found'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen || !user) return null;

  // Find all items reported by this user (by userId, userEmail, or userUid)
  const userItems = items.filter(i => 
    i.userId === user.id || 
    (user.email && i.userEmail?.toLowerCase() === user.email.toLowerCase()) ||
    (user.uidOrRoll && i.userUid?.toLowerCase() === user.uidOrRoll.toLowerCase())
  );

  const filteredItems = userItems.filter(item => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.locationBlock.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const lostCount = userItems.filter(i => i.type === 'lost').length;
  const foundCount = userItems.filter(i => i.type === 'found').length;
  const recoveredCount = userItems.filter(i => i.status === 'recovered' || i.status === 'returned').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with User Info */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-700 text-white flex items-center justify-center text-xl font-black shadow-md border border-white/20 shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-white">{user.name}</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    user.role === 'admin' 
                      ? 'bg-red-600/40 text-red-200 border border-red-500/40' 
                      : 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/30'
                  }`}>
                    {user.role === 'admin' ? 'Campus Admin' : 'Student'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-1">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-red-400" />
                    <strong>UID:</strong> {user.uidOrRoll || 'Not Provided'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {user.email}
                  </span>
                  {user.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {user.phone}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {user.department || 'Chandigarh University'}
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-center">
                <span className="text-[10px] font-semibold text-slate-300 uppercase block">Lost</span>
                <span className="text-sm font-black text-rose-400">{lostCount}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-center">
                <span className="text-[10px] font-semibold text-slate-300 uppercase block">Found</span>
                <span className="text-sm font-black text-emerald-400">{foundCount}</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/15 text-center">
                <span className="text-[10px] font-semibold text-slate-300 uppercase block">Resolved</span>
                <span className="text-sm font-black text-sky-400">{recoveredCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar: Search & Filter */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search user's reported items..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'all' 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All ({userItems.length})
            </button>
            <button
              onClick={() => setFilterType('lost')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'lost' 
                  ? 'bg-red-800 text-white' 
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Lost ({lostCount})
            </button>
            <button
              onClick={() => setFilterType('found')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'found' 
                  ? 'bg-emerald-700 text-white' 
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Found ({foundCount})
            </button>
          </div>
        </div>

        {/* Listings Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">No listings found for this user</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {searchQuery ? 'Try changing your search query or filter.' : 'This student has not submitted any reports yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left: Thumbnail & Info */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          item.type === 'lost' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.type}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {item.category}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {new Date(item.dateTime).toLocaleDateString()}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm truncate">{item.title}</h4>

                      <p className="text-xs text-slate-500 line-clamp-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-600 shrink-0" />
                        <span className="truncate">{item.locationBlock} • {item.specificSpot}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Status selector and Admin Actions */}
                  <div className="flex items-center gap-2.5 sm:border-l sm:border-slate-100 sm:pl-4 shrink-0 flex-wrap justify-end">
                    {(() => {
                      const isItemOwner = Boolean(
                        currentUser && (
                          currentUser.id === item.userId || 
                          (currentUser.email && item.userEmail && currentUser.email.toLowerCase() === item.userEmail.toLowerCase())
                        )
                      );
                      const canModify = Boolean(isAdmin || isItemOwner);

                      return (
                        <>
                          {/* Status Dropdown */}
                          <div className="flex flex-col">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Status</label>
                            {canModify ? (
                              <select
                                value={item.status}
                                onChange={e => updateItemStatus(item.id, e.target.value as ItemStatus, currentUser?.id, isAdmin, currentUser?.email)}
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600"
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
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 capitalize">
                                {item.status.replace('_', ' ')}
                              </span>
                            )}
                          </div>

                          {/* View Details */}
                          <button
                            onClick={() => onViewItemDetails(item)}
                            className="p-2 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-colors"
                            title="Inspect full item details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Item - Owner or Admin only */}
                          {canModify && (
                            <button
                              onClick={() => {
                                onClose();
                                onEditItem(item);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
                              title="Edit this listing"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          )}

                          {/* Delete Item - Owner or Admin only */}
                          {canModify ? (
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete listing "${item.title}"? This cannot be undone.`)) {
                                  onDeleteItem(item.id);
                                }
                              }}
                              className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                              title="Permanently delete this report"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span 
                              className="p-2 text-slate-400 cursor-not-allowed inline-flex items-center" 
                              title="Protected: Only listing owner or admin can edit or delete"
                            >
                              <Lock className="w-4 h-4 text-slate-300" />
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Total {userItems.length} reports logged by {user.name}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
