import React, { useState, useEffect, useId } from 'react';
import { useAuth } from '../context/AuthContext';
import { ItemReport, ReportType, ItemCategory, ItemColor } from '../types';
import { 
  CU_CAMPUS_LOCATIONS, 
  ITEM_CATEGORIES, 
  ITEM_COLORS 
} from '../data/mockData';
import { saveItem, updateItem, uploadImageFile } from '../lib/storage';
import { evaluateMatch } from '../lib/matching';
import { 
  X, 
  Upload, 
  MapPin, 
  Calendar, 
  Tag, 
  Palette, 
  HelpCircle, 
  Sparkles, 
  CheckCircle2, 
  Image as ImageIcon,
  Building2,
  AlertTriangle,
  Lock,
  LogIn,
  ArrowLeft
} from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType: ReportType;
  existingItems: ItemReport[];
  onItemCreated: (item: ItemReport) => void;
  editingItem?: ItemReport | null;
}

const PRESET_PHOTOS = [
  { label: 'AirPods / TWS', url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80' },
  { label: 'Laptop Charger', url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80' },
  { label: 'ID Card & Lanyard', url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80' },
  { label: 'Scientific Calculator', url: 'https://images.unsplash.com/photo-1611125832047-1d7ad1e8e48f?w=600&auto=format&fit=crop&q=80' },
  { label: 'Hostel Keys', url: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=600&auto=format&fit=crop&q=80' },
  { label: 'College Backpack', url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80' },
  { label: 'Water Bottle', url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80' },
  { label: 'Wrist Watch', url: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&auto=format&fit=crop&q=80' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  initialType,
  existingItems,
  onItemCreated,
  editingItem,
}) => {
  const { currentUser, isAdmin, openAuthModal, loginAsDemo } = useAuth();
  const [type, setType] = useState<ReportType>(initialType);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Electronics');
  const [color, setColor] = useState<ItemColor>('Black');
  const [brandOrModel, setBrandOrModel] = useState('');
  const [description, setDescription] = useState('');
  const [locationBlock, setLocationBlock] = useState(CU_CAMPUS_LOCATIONS[0]);
  const [specificSpot, setSpecificSpot] = useState('');
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [imageUrl, setImageUrl] = useState(PRESET_PHOTOS[0].url);
  const [identifyingMark, setIdentifyingMark] = useState('');
  const [currentHoldingLocation, setCurrentHoldingLocation] = useState('Main Security Gate 1 (NH-95 Entrance) Lost & Found Cupboard');
  const [secretVerificationQuestion, setSecretVerificationQuestion] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputId = useId();

  // Populate fields when editing or resetting
  useEffect(() => {
    if (editingItem) {
      setType(editingItem.type);
      setTitle(editingItem.title);
      setCategory(editingItem.category);
      setColor(editingItem.color);
      setBrandOrModel(editingItem.brandOrModel || '');
      setDescription(editingItem.description);
      setLocationBlock(editingItem.locationBlock);
      setSpecificSpot(editingItem.specificSpot);
      setDateTime(editingItem.dateTime.slice(0, 16));
      setImageUrl(editingItem.imageUrl);
      setIdentifyingMark(editingItem.identifyingMark || '');
      if (editingItem.currentHoldingLocation) setCurrentHoldingLocation(editingItem.currentHoldingLocation);
      if (editingItem.secretVerificationQuestion) setSecretVerificationQuestion(editingItem.secretVerificationQuestion);
    } else {
      setType(initialType);
      setTitle('');
      setCategory('Electronics');
      setColor('Black');
      setBrandOrModel('');
      setDescription('');
      setLocationBlock(CU_CAMPUS_LOCATIONS[0]);
      setSpecificSpot('');
      setDateTime(new Date().toISOString().slice(0, 16));
      setImageUrl(PRESET_PHOTOS[0].url);
      setIdentifyingMark('');
      setCurrentHoldingLocation('Main Security Gate 1 (NH-95 Entrance) Lost & Found Cupboard');
      setSecretVerificationQuestion('');
    }
    setErrorMessage(null);
  }, [editingItem, isOpen, initialType]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMessage(null);
    try {
      const dataUrl = await uploadImageFile(file);
      setImageUrl(dataUrl);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  // Find instant potential matches as user types
  const oppositeType = type === 'lost' ? 'found' : 'lost';
  const instantMatches = existingItems
    .filter(i => i.type === oppositeType && i.status !== 'returned' && i.status !== 'recovered')
    .map(candidate => {
      const dummyReport: ItemReport = {
        id: 'draft',
        type,
        title,
        category,
        color,
        brandOrModel,
        description,
        locationBlock,
        specificSpot,
        dateTime,
        imageUrl,
        status: type,
        userId: currentUser?.id || 'guest',
        userName: currentUser?.name || 'Student',
        userEmail: currentUser?.email || 'student@cuchd.in',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const match = type === 'lost' 
        ? evaluateMatch(dummyReport, candidate)
        : evaluateMatch(candidate, dummyReport);
      return { candidate, score: match.matchScore, reasons: match.reasons };
    })
    .filter(m => m.score >= 50)
    .sort((a, b) => b.score - a.score);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please enter an item name.');
      return;
    }

    if (!currentUser) {
      setErrorMessage('Please sign in to submit a report.');
      openAuthModal('login', `Please sign in with your Chandigarh University ID to submit a ${type === 'lost' ? 'lost' : 'found'} item report.`);
      return;
    }

    // Check ownership if editing
    if (editingItem && editingItem.userId !== currentUser.id && !isAdmin) {
      setErrorMessage('You can only edit items that you have uploaded.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingItem) {
        // Update existing item in database
        const updates: Partial<ItemReport> = {
          title: title.trim(),
          category,
          color,
          brandOrModel: brandOrModel.trim() || undefined,
          description: description.trim(),
          locationBlock,
          specificSpot: specificSpot.trim() || 'Not specified',
          dateTime,
          imageUrl: imageUrl || editingItem.imageUrl,
          identifyingMark: identifyingMark.trim() || undefined,
          currentHoldingLocation: type === 'found' ? currentHoldingLocation : undefined,
          secretVerificationQuestion: type === 'found' ? secretVerificationQuestion.trim() : undefined,
        };

        const success = updateItem(editingItem.id, updates, currentUser.id, isAdmin);
        if (success) {
          onItemCreated({ ...editingItem, ...updates, updatedAt: new Date().toISOString() });
          onClose();
        } else {
          setErrorMessage('Failed to update item: You can only edit your own items.');
        }
        return;
      }

      const hasHighMatch = instantMatches.length > 0 && instantMatches[0].score >= 60;
      const finalStatus = hasHighMatch ? 'match_found' : type;

      const reporterId = currentUser.id;
      const reporterName = currentUser.name;
      const reporterEmail = currentUser.email;
      const reporterPhone = currentUser.phone;
      const reporterUid = currentUser.uidOrRoll;

      const newItem: ItemReport = {
        id: `rep_${Date.now()}`,
        type,
        title: title.trim(),
        category,
        color,
        brandOrModel: brandOrModel.trim() || undefined,
        description: description.trim(),
        locationBlock,
        specificSpot: specificSpot.trim() || 'Not specified',
        dateTime,
        imageUrl: imageUrl || PRESET_PHOTOS[0].url,
        status: finalStatus,
        userId: reporterId,
        userName: reporterName,
        userEmail: reporterEmail,
        userPhone: reporterPhone,
        userUid: reporterUid,
        identifyingMark: identifyingMark.trim() || undefined,
        currentHoldingLocation: type === 'found' ? currentHoldingLocation : undefined,
        secretVerificationQuestion: type === 'found' ? secretVerificationQuestion.trim() : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveItem(newItem);
      onItemCreated(newItem);
      onClose();
    } catch (err: any) {
      setErrorMessage('Failed to save report: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl glass-panel rounded-3xl shadow-2xl border border-white/80 overflow-hidden my-6">
        {/* Header */}
        <div className={`p-5 sm:p-7 pr-16 text-white relative transition-colors ${
          type === 'lost' 
            ? 'bg-gradient-to-r from-red-900 via-red-800 to-red-950' 
            : 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950'
        }`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white/90 hover:text-white p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors"
            aria-label="Close form"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Action Switcher Tabs */}
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => setType('lost')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                type === 'lost'
                  ? 'bg-white text-red-950 shadow-md'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              I Lost Something
            </button>
            <button
              type="button"
              onClick={() => setType('found')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                type === 'found'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              I Found Something
            </button>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white">
            {editingItem 
              ? (type === 'lost' ? 'Edit Lost Item Report' : 'Edit Found Belonging Report')
              : (type === 'lost' ? 'Report a Lost Item on Campus' : 'Report a Found Belonging')}
          </h2>
          <p className="text-xs sm:text-sm text-white/80 mt-1">
            {editingItem
              ? 'Update the details for your reported item. Changes will immediately sync to the campus database.'
              : type === 'lost'
              ? 'Provide clear details to help Chandigarh University security and finders identify your property.'
              : 'Help return this belonging to a fellow student by registering it with the campus lost & found desk.'}
          </p>
        </div>

        {/* Live Potential Match Alert */}
        {title.trim().length > 2 && instantMatches.length > 0 && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3.5 flex items-start gap-3 backdrop-blur-xs">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950">
              <span className="font-bold">Possible Campus Match Detected! ({instantMatches[0].score}% match): </span>
              "{instantMatches[0].candidate.title}" at {instantMatches[0].candidate.locationBlock}.
              <div className="text-amber-800 mt-0.5 text-[11px] font-medium">
                Matching attributes: {instantMatches[0].reasons.join(' • ')}
              </div>
            </div>
          </div>
        )}

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Item Identification */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              1. Item Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item Title / Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. boAt Airdopes 141 in Black Case, or CU Smart ID Card"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as ItemCategory)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                >
                  {ITEM_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Primary Color <span className="text-red-500">*</span>
                </label>
                <select
                  value={color}
                  onChange={e => setColor(e.target.value as ItemColor)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                >
                  {ITEM_COLORS.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Brand or Model Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apple, Casio fx-991CW, HP 65W, Titan, Wildcraft"
                  value={brandOrModel}
                  onChange={e => setBrandOrModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Photo Upload */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              2. Photo of Item
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Image Preview Box */}
              <div className="relative aspect-4/3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-3 text-slate-400">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                    <span className="text-xs">No image selected</span>
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-medium">
                    Uploading image...
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor={fileInputId}
                    className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
                  >
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span>Upload from Device (Cloudinary / File)</span>
                  </label>
                  <input
                    id={fileInputId}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <span className="text-[11px] text-slate-400">Max 5MB (PNG, JPG, WEBP)</span>
                </div>

                {/* Preset Campus Items Selector */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1.5">
                    Or select a common campus item photography preset:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_PHOTOS.map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setImageUrl(p.url)}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                          imageUrl === p.url
                            ? 'bg-red-50 border-red-600 text-red-800 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Campus Location & Timestamp */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              3. Campus Location &amp; Time
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chandigarh University Block / Landmark <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    value={locationBlock}
                    onChange={e => setLocationBlock(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                  >
                    {CU_CAMPUS_LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date &amp; Estimated Time <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="datetime-local"
                    required
                    value={dateTime}
                    onChange={e => setDateTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specific Spot on Campus
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. 2nd Floor Reading Hall Table 14, or Lab 204 near window desk"
                    value={specificSpot}
                    onChange={e => setSpecificSpot(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Detailed Description & Verification Questions */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              4. Description &amp; Ownership Verification
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Detailed Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Mention condition, scratches, stickers, contents, or circumstances..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unique Identifying Mark (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Batman sticker on case, cracked corner, engraving of 'AS'"
                value={identifyingMark}
                onChange={e => setIdentifyingMark(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white"
              />
            </div>

            {/* Found-specific fields: current custody & verification question */}
            {type === 'found' && (
              <div className="space-y-4 p-4 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">
                    Current Holding Location / Safe Custody
                  </label>
                  <select
                    value={currentHoldingLocation}
                    onChange={e => setCurrentHoldingLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-medium text-slate-800"
                  >
                    <option value="Main Security Gate 1 (NH-95 Entrance) Lost & Found Cupboard">
                      Main Security Gate 1 Lost &amp; Found Desk (Recommended)
                    </option>
                    <option value="Security Gate 2 (Hostel Entrance) Guard Room">
                      Security Gate 2 Guard Room
                    </option>
                    <option value="Central Library Circulation & Help Desk">
                      Central Library Circulation Desk
                    </option>
                    <option value="Student Welfare Center (Block C3) Room 102">
                      Student Welfare Center (Block C3)
                    </option>
                    <option value="Currently with Finder (Handover upon verification)">
                      With me (Finder) — Handover upon verification
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-1">
                    Secret Verification Question for the Owner
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. What specific sticker is on the back? Or what wallpaper is on screen?"
                    value={secretVerificationQuestion}
                    onChange={e => setSecretVerificationQuestion(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs text-slate-800"
                  />
                  <p className="text-[11px] text-emerald-700 mt-1">
                    The claimant must answer this question correctly to prove genuine ownership.
                  </p>
                </div>
              </div>
            )}

            {/* Section 4: Reporter Identity & Contact */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                4. Reporter Information
              </h3>

              {currentUser ? (
                <div className="p-3.5 bg-slate-100/90 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-800 text-white flex items-center justify-center font-bold text-xs">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-500">
                        UID: {currentUser.uidOrRoll} • {currentUser.phone || currentUser.email}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                    Verified Student
                  </span>
                </div>
              ) : (
                <div className="space-y-3 p-4 bg-amber-50/80 rounded-2xl border border-amber-200/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                      <Lock className="w-4 h-4 text-amber-700" />
                      <span>Student Sign-In Required</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        openAuthModal('login', `Please sign in with your Chandigarh University ID to submit a ${type === 'lost' ? 'lost' : 'found'} item report.`);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-800 hover:bg-red-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In with CU ID</span>
                    </button>
                  </div>
                  <p className="text-xs text-amber-800/90 leading-relaxed">
                    Chandigarh University security policies mandate that all campus reports be associated with a verified student or faculty profile (including University UID and contact mobile number).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Back / Cancel</span>
            </button>

            <button
              type="submit"
              disabled={submitting}
              className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 ${
                type === 'lost'
                  ? 'bg-red-700 hover:bg-red-800'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {submitting
                  ? (editingItem ? 'Saving Changes...' : 'Publishing...')
                  : editingItem
                  ? 'Save Changes'
                  : type === 'lost'
                  ? 'Publish Lost Report'
                  : 'Register Found Item'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
