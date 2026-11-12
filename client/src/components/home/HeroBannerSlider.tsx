import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBannerStore } from '../../store/useBannerStore';
import { bannerService } from '../../api/services/banner.service';

interface HeroBannerSliderProps {
  autoPlayInterval?: number;
}

export const HeroBannerSlider: React.FC<HeroBannerSliderProps> = ({
  autoPlayInterval = 4500,
}) => {
  const { banners } = useBannerStore();

  // Filter active HERO_SLIDER banners and sort by displayOrder
  const activeBanners = banners
    .filter((b) => b.isActive && (!b.position || b.position === 'HERO_SLIDER'))
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  // Track if a swipe is in progress to prevent click + navigate
  const isSwiping = useRef(false);

  // Safe bounds check in case banners change
  const totalSlides = activeBanners.length;

  useEffect(() => {
    if (currentIndex >= totalSlides && totalSlides > 0) {
      setCurrentIndex(0);
    }
  }, [totalSlides, currentIndex]);

  const handleNext = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const handlePrev = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Autoplay timer
  useEffect(() => {
    if (totalSlides <= 1 || isPaused) return;

    const timer = setInterval(() => {
      handleNext();
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [totalSlides, isPaused, autoPlayInterval, handleNext]);

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    // Mark as swiping if movement exceeds small threshold
    if (touchStartX.current !== null && Math.abs(touchEndX.current - touchStartX.current) > 10) {
      isSwiping.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) {
      touchStartX.current = null;
      touchEndX.current = null;
      isSwiping.current = false;
      return;
    }
    const diff = touchStartX.current - touchEndX.current;
    const swipeThreshold = 50;

    if (Math.abs(diff) >= swipeThreshold) {
      if (diff > 0) {
        // Swiped left -> next slide
        handleNext();
      } else {
        // Swiped right -> prev slide
        handlePrev();
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
    // Keep isSwiping true briefly so click handler on link can check it
    setTimeout(() => {
      isSwiping.current = false;
    }, 50);
  };

  // Fallback if no active banners exist
  if (totalSlides === 0) {
    return (
      <div className="flex flex-col min-w-0 w-full h-full">
        <Link
          to="/products"
          className="block relative rounded-2xl overflow-hidden shadow-sm w-full h-full aspect-[1300/692] lg:aspect-auto group bg-[#161820]"
          title="Khám phá ngay"
        >
          <img
            src="/images/macbook-hero-banner.jpg"
            alt="Nexor Premium Technology"
            className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
          />
        </Link>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col min-w-0 w-full h-full relative group select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative rounded-2xl overflow-hidden shadow-sm w-full h-full aspect-[1300/692] lg:aspect-auto bg-[#161820] border border-gray-200/50">
        {/* Slider Track (Absolute positioned to prevent images from blowing up container height) */}
        <div
          className="absolute inset-0 flex h-full w-full transition-transform duration-500 ease-out"
          style={{ transform: `translate3d(-${currentIndex * 100}%, 0, 0)` }}
        >
          {activeBanners.map((banner, index) => {
            const targetLink = banner.linkUrl?.trim() || '/products';
            const isExternal = targetLink.startsWith('http://') || targetLink.startsWith('https://');
            const hasBakedArtwork = /\/images\/(macbook-|promo-|tech-future-banner)/.test(banner.imageUrl || '');

            const slideContent = (
              <div className="relative w-full h-full min-w-full overflow-hidden shrink-0">
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.02]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/macbook-hero-banner.jpg';
                  }}
                />
                {/* Gradient overlay for title/subtitle readability, safely cleared above slider dots */}
                {!hasBakedArtwork && (banner.title || banner.subtitle) && (
                  <div
                    className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent pt-14 px-6 pointer-events-none ${
                      totalSlides > 1 ? 'pb-11 sm:pb-12' : 'pb-5'
                    }`}
                  >
                    <h3 className="text-white text-base sm:text-lg font-bold drop-shadow-md leading-tight line-clamp-1">
                      {banner.title}
                    </h3>
                    {banner.subtitle && (
                      <p className="text-gray-200 text-xs mt-1 drop-shadow-sm line-clamp-1 max-w-xl">
                        {banner.subtitle}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );

            // Handle click: block navigation if a swipe was in progress, else track click
            const handleLinkClick = (e: React.MouseEvent) => {
              if (isSwiping.current) {
                e.preventDefault();
                return;
              }
              if (banner.id > 0) {
                bannerService.trackClick(banner.id);
              }
            };

            return isExternal ? (
              <a
                key={banner.id}
                href={targetLink}
                target="_blank"
                rel="noreferrer"
                className="block w-full h-full min-w-full"
                title={banner.title}
                onClick={handleLinkClick}
              >
                {slideContent}
              </a>
            ) : (
              <Link
                key={banner.id}
                to={targetLink}
                className="block w-full h-full min-w-full"
                title={banner.title}
                onClick={handleLinkClick}
              >
                {slideContent}
              </Link>
            );
          })}
        </div>

        {/* Previous Button */}
        {totalSlides > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/35 hover:bg-black/65 text-white/90 hover:text-white backdrop-blur-xs flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 sm:hover:scale-105 border border-white/20 shadow-md cursor-pointer"
            aria-label="Previous Banner"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Next Button */}
        {totalSlides > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/35 hover:bg-black/65 text-white/90 hover:text-white backdrop-blur-xs flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 sm:hover:scale-105 border border-white/20 shadow-md cursor-pointer"
            aria-label="Next Banner"
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* Indicator Dots */}
        {totalSlides > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/25 backdrop-blur-xs border border-white/10">
            {activeBanners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  currentIndex === index
                    ? 'w-6 bg-white shadow-xs'
                    : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Đi tới banner ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroBannerSlider;
