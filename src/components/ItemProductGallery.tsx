import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  X, 
  Star, 
  Image as ImageIcon,
  Images,
  ZoomIn,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Mail,
  Send,
  Link2,
  Smartphone,
  MapPin,
  Tag
} from 'lucide-react';

interface ItemProductGalleryProps {
  itemId?: string;
  images?: string[];
  imageUrl?: string;
  image?: string;
  title: string;
  category?: string;
  itemType?: 'lost' | 'found';
  locationBlock?: string;
  description?: string;
  className?: string;
}

export const ItemProductGallery: React.FC<ItemProductGalleryProps> = ({
  itemId,
  images,
  imageUrl,
  image,
  title,
  category,
  itemType = 'lost',
  locationBlock,
  description,
  className = '',
}) => {
  // Normalize images array with backwards-compatibility fallbacks
  const normalizedImages: string[] = React.useMemo(() => {
    const list: string[] = [];
    if (Array.isArray(images) && images.length > 0) {
      images.forEach(img => {
        if (img && typeof img === 'string' && img.trim() && !list.includes(img.trim())) {
          list.push(img.trim());
        }
      });
    }
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() && !list.includes(imageUrl.trim())) {
      list.unshift(imageUrl.trim());
    }
    if (image && typeof image === 'string' && image.trim() && !list.includes(image.trim())) {
      if (!list.includes(image.trim())) {
        list.push(image.trim());
      }
    }
    return list;
  }, [images, imageUrl, image]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});

  // Share Modal & Clipboard states
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedBroadcast, setCopiedBroadcast] = useState(false);

  // Touch swipe tracking
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Keep active index in bounds if image list changes
  useEffect(() => {
    if (activeIndex >= normalizedImages.length) {
      setActiveIndex(Math.max(0, normalizedImages.length - 1));
    }
  }, [normalizedImages.length, activeIndex]);

  // Keyboard navigation (ArrowLeft, ArrowRight, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'Escape') {
        if (isShareOpen) {
          setIsShareOpen(false);
        } else if (lightboxOpen) {
          setLightboxOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [normalizedImages.length, lightboxOpen, isShareOpen]);

  const goToPrev = () => {
    if (normalizedImages.length <= 1) return;
    setActiveIndex(prev => (prev === 0 ? normalizedImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    if (normalizedImages.length <= 1) return;
    setActiveIndex(prev => (prev === normalizedImages.length - 1 ? 0 : prev + 1));
  };

  // Zoom on hover handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomOrigin({ x, y });
  };

  // Mobile swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = touchStartXRef.current - endX;
    const diffY = (touchStartYRef.current || 0) - endY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const handleImageError = (index: number) => {
    setFailedImages(prev => ({ ...prev, [index]: true }));
  };

  // Build clean Share URL and text summary
  const shareUrl = typeof window !== 'undefined'
    ? (itemId ? `${window.location.origin}${window.location.pathname}?item=${encodeURIComponent(itemId)}` : window.location.href)
    : '';

  const shareTitle = `SAHAYAK: ${title} (${itemType === 'lost' ? 'Lost Item' : 'Found Item'})`;

  const shareBroadcastText = `🚨 *SAHAYAK Campus Lost & Found*
📌 *Item:* ${title}
🏷 *Category:* ${category || 'Campus Belongings'}
🚩 *Status:* ${itemType === 'lost' ? 'Reported Lost (Help Find)' : 'Reported Found (Available for Claim)'}
${locationBlock ? `📍 *Location:* ${locationBlock}\n` : ''}${description ? `📝 *Description:* ${description}\n` : ''}🔗 *View or Claim on SAHAYAK:*
${shareUrl}`;

  const handleOpenShare = () => {
    setIsShareOpen(true);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `Check this ${itemType} item report on SAHAYAK Campus Lost & Found: "${title}"`,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Native share error, opening fallback modal:', err);
        }
      }
    }
    setIsShareOpen(true);
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleCopyBroadcast = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareBroadcastText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareBroadcastText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedBroadcast(true);
      setTimeout(() => setCopiedBroadcast(false), 2500);
    } catch (err) {
      console.error('Failed to copy broadcast text:', err);
    }
  };

  // If no images at all or active image has failed
  const hasNoImages = normalizedImages.length === 0;
  const currentImageFailed = failedImages[activeIndex];
  const activeImageUrl = normalizedImages[activeIndex];

  return (
    <div className={`flex flex-col space-y-3 ${className}`}>
      {/* Main Large Image Container */}
      <div 
        className="relative aspect-4/3 sm:aspect-16/11 w-full rounded-2xl bg-slate-900/5 border border-slate-200/90 overflow-hidden shadow-xs select-none group flex items-center justify-center"
        onMouseEnter={() => setIsZooming(true)}
        onMouseLeave={() => setIsZooming(false)}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {hasNoImages || currentImageFailed ? (
          /* Clean Fallback Placeholder */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-200/80 flex items-center justify-center text-slate-400 mb-3 group-hover:scale-105 transition-transform">
              <ImageIcon className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-sm font-extrabold text-slate-800">
              No Photo Uploaded
            </p>
            <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
              This campus registry listing was submitted without photo attachments. Refer to description, color, and location markers.
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
              {category && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/90 text-slate-600 border border-slate-200 text-[11px] font-semibold">
                  Category: {category}
                </span>
              )}
              {/* Share button right on fallback card */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenShare();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 hover:bg-slate-950 text-white text-[11px] font-extrabold shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Share2 className="w-3 h-3 text-rose-400" />
                <span>Share Listing</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Interactive Image with Smooth Transition and Zoom on Hover */}
            <div className="w-full h-full overflow-hidden flex items-center justify-center cursor-zoom-in">
              <img
                src={activeImageUrl}
                alt={`${title} - Photo ${activeIndex + 1}`}
                onError={() => handleImageError(activeIndex)}
                referrerPolicy="no-referrer"
                loading="eager"
                className="w-full h-full object-cover transition-transform duration-300 ease-out will-change-transform"
                style={{
                  transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                  transform: isZooming ? 'scale(1.75)' : 'scale(1)',
                }}
              />
            </div>

            {/* Subtle Gradient vignette for overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/30 pointer-events-none" />

            {/* Top Badges & Actions Bar */}
            <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-10">
              {/* Cover Badge or Photo Number */}
              {activeIndex === 0 ? (
                <span className="pointer-events-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-700 text-white text-[10px] font-black uppercase shadow-xs tracking-wider border border-white/20">
                  <Star className="w-2.5 h-2.5 fill-white" />
                  <span>Cover Photo</span>
                </span>
              ) : (
                <span className="pointer-events-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/75 backdrop-blur-md text-white text-[10px] font-bold shadow-xs border border-white/10">
                  <span>Photo {activeIndex + 1} of {normalizedImages.length}</span>
                </span>
              )}

              {/* Action Buttons: Modern Share & Fullscreen Expand */}
              <div className="pointer-events-auto flex items-center gap-1.5">
                {/* Modern Share Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenShare();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/80 hover:bg-slate-950 text-white backdrop-blur-md shadow-sm hover:shadow text-xs font-extrabold transition-all active:scale-95 border border-white/20 hover:border-white/40 cursor-pointer group/share"
                  title="Share item details with anyone"
                  aria-label="Share item details"
                >
                  <Share2 className="w-3.5 h-3.5 text-rose-400 group-hover/share:rotate-12 transition-transform" />
                  <span>Share</span>
                </button>

                {/* Expand Fullscreen Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxOpen(true);
                  }}
                  className="p-1.5 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white backdrop-blur-md shadow-xs transition-transform active:scale-90 hover:scale-105 cursor-pointer border border-white/15"
                  title="Expand full screen"
                  aria-label="View full size image"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Previous (<) and Next (>) Navigation Arrows */}
            {normalizedImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrev();
                  }}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white backdrop-blur-md border border-white/20 shadow-md flex items-center justify-center opacity-85 group-hover:opacity-100 hover:scale-110 active:scale-95 transition-all cursor-pointer z-10"
                  aria-label="Previous image"
                  title="Previous image (Left Arrow)"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 -ml-0.5" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white backdrop-blur-md border border-white/20 shadow-md flex items-center justify-center opacity-85 group-hover:opacity-100 hover:scale-110 active:scale-95 transition-all cursor-pointer z-10"
                  aria-label="Next image"
                  title="Next image (Right Arrow)"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 -mr-0.5" />
                </button>
              </>
            )}

            {/* Bottom Bar: Image Count & Zoom Hint */}
            <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between text-white text-[10px] pointer-events-none z-10">
              <span className="bg-slate-950/75 backdrop-blur-md px-2 py-0.5 rounded-md font-semibold border border-white/10 flex items-center gap-1">
                <Images className="w-3 h-3 text-red-400" />
                <span>{activeIndex + 1} / {normalizedImages.length}</span>
              </span>

              <span className="hidden sm:inline-flex items-center gap-1 bg-slate-950/75 backdrop-blur-md px-2 py-0.5 rounded-md font-medium text-white/80 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="w-3 h-3 text-white" />
                <span>Hover to zoom • Swipe on mobile</span>
              </span>
            </div>
          </>
        )}
      </div>

      {/* Row of Interactive Clickable Thumbnails (E-Commerce Style Amazon/Flipkart) */}
      {normalizedImages.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-slate-300">
          {normalizedImages.map((thumbUrl, idx) => {
            const isActive = idx === activeIndex;
            const isThumbFailed = failedImages[idx];

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  isActive 
                    ? 'border-red-600 ring-2 ring-red-600/30 shadow-xs scale-105 z-10' 
                    : 'border-slate-200/90 hover:border-slate-400 opacity-70 hover:opacity-100'
                }`}
                title={`View photo ${idx + 1}`}
                aria-label={`View photo ${idx + 1} of ${normalizedImages.length}`}
              >
                {isThumbFailed ? (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                ) : (
                  <img
                    src={thumbUrl}
                    alt={`Thumbnail ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}

                {/* Primary Cover indicator dot */}
                {idx === 0 && (
                  <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-red-600 ring-1 ring-white" title="Cover photo" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && !hasNoImages && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Header toolbar */}
          <div 
            className="absolute top-4 inset-x-4 flex items-center justify-between text-white z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white truncate max-w-[200px] sm:max-w-md">
                {title}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs font-mono">
                {activeIndex + 1} / {normalizedImages.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Share in Fullscreen */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenShare();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-extrabold transition-all cursor-pointer ring-1 ring-white/25"
                title="Share item"
              >
                <Share2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Share</span>
              </button>

              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer ring-1 ring-white/20"
                aria-label="Close fullscreen gallery"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Fullscreen Main Image */}
          <div 
            className="relative max-w-5xl max-h-[82vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={activeImageUrl}
              alt={`${title} - Full size photo ${activeIndex + 1}`}
              className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl"
            />

            {/* Navigation buttons */}
            {normalizedImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goToPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md flex items-center justify-center transition-transform active:scale-90 cursor-pointer ring-1 ring-white/20"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-6 h-6 -ml-0.5" />
                </button>

                <button
                  type="button"
                  onClick={goToNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md flex items-center justify-center transition-transform active:scale-90 cursor-pointer ring-1 ring-white/20"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-6 h-6 -mr-0.5" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Bottom Thumbnail Strip */}
          {normalizedImages.length > 1 && (
            <div 
              className="absolute bottom-4 inset-x-4 flex items-center justify-center gap-2 overflow-x-auto py-2 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              {normalizedImages.map((thumbUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    idx === activeIndex
                      ? 'border-red-500 ring-2 ring-red-500 scale-110'
                      : 'border-white/30 opacity-60 hover:opacity-100'
                  }`}
                  aria-label={`Thumbnail ${idx + 1}`}
                >
                  <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modern Interactive Share Dialog Modal */}
      {isShareOpen && (
        <div 
          className="fixed inset-0 z-[120] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsShareOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-item-title"
        >
          <div 
            className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200/90 shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200 text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shrink-0">
                  <Share2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 id="share-item-title" className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Share Item Details
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Help campus students return or claim this item
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsShareOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close share dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Item Mini Card Preview */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
                {activeImageUrl ? (
                  <img src={activeImageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.2 rounded-full text-[9px] font-black uppercase ${
                    itemType === 'lost' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {itemType === 'lost' ? 'Lost Item' : 'Found Item'}
                  </span>
                  {category && (
                    <span className="text-[10px] text-slate-500 font-semibold truncate">
                      • {category}
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 truncate mt-0.5">
                  {title}
                </h4>
                {locationBlock && (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{locationBlock}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Native OS Share Button (Mobile/Supported Browsers) */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 text-white font-extrabold text-xs shadow-md shadow-red-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-white" />
                <span>Share via Device Apps (AirDrop, WhatsApp, SMS)</span>
              </button>
            )}

            {/* Quick Share Channels Grid */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Quick Share Channels
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* WhatsApp */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareBroadcastText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 group text-center cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">WhatsApp</span>
                </a>

                {/* Telegram */}
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-900 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 group text-center cursor-pointer"
                >
                  <Send className="w-5 h-5 text-sky-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Telegram</span>
                </a>

                {/* Email */}
                <a
                  href={`mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareBroadcastText)}`}
                  className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 group text-center cursor-pointer"
                >
                  <Mail className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Email</span>
                </a>

                {/* Twitter / X */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`[SAHAYAK Campus Lost & Found] ${title}`)}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-900 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 group text-center cursor-pointer"
                >
                  <ExternalLink className="w-5 h-5 text-slate-700 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">X / Twitter</span>
                </a>
              </div>
            </div>

            {/* Copy Link Bar */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Direct Item Link
              </span>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-100 border border-slate-300 text-xs font-mono text-slate-700 truncate select-all focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    copiedLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Campus WhatsApp Group Broadcast Text Copy */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleCopyBroadcast}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  copiedBroadcast
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                {copiedBroadcast ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Formatted Broadcast Text Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Formatted Text for WhatsApp & Telegram Groups</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
