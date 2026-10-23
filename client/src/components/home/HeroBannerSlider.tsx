import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBannerStore } from '../../store/useBannerStore';

interface HeroBannerSliderProps {
  autoPlayInterval?: number;
}

export const HeroBannerSlider: React.FC<HeroBannerSliderProps> = ({
  autoPlayInterval = 4500,
}) => {
  const { banners } = useBannerStore();

  // Filter active banners and sort by order
  const activeBanners = banners
    .filter((b) => b.isActive)
    .sort((a, b) => a.order - b.order);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

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
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    const swipeThreshold = 45;

    if (diff > swipeThreshold) {
      // Swiped left -> next slide
      handleNext();
    } else if (diff < -swipeThreshold) {
      // Swiped right -> prev slide
      handlePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Fallback if no active banners exist
  if (totalSlides === 0) {
    return (
      <div className="flex flex-col min-w-0 h-full">
        <Link
          to="/products"
          className="block relative rounded-2xl overflow-hidden shadow-sm h-full group bg-[#161820]"
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
      className="flex flex-col min-w-0 h-full relative group select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative rounded-2xl overflow-hidden shadow-sm h-full bg-[#161820] border border-gray-200/50">
        {/* Slider Track */}
        <div
          className="flex h-full w-full transition-transform duration-500 ease-out"
          style={{ transform: `translate3d(-${currentIndex * 100}%, 0, 0)` }}
        >
          {activeBanners.map((banner, index) => {
            const isExternal = banner.linkUrl.startsWith('http://') || banner.linkUrl.startsWith('https://');

            const content = (
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
                {/* Subtle dark gradient overlay at bottom for title/subtitle readability if present */}
                {(banner.title || banner.subtitle) && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent pt-12 pb-5 px-6 pointer-events-none">
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

            return isExternal ? (
              <a
                key={banner.id}
                href={banner.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full h-full min-w-full"
                title={banner.title}
              >
                {content}
              </a>
            ) : (
              <Link
                key={banner.id}
                to={banner.linkUrl}
                className="block w-full h-full min-w-full"
                title={banner.title}
              >
                {content}
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
