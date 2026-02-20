'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

// Banner data interface - ready for future API integration
interface OfferBanner {
  id: string;
  imageUrl: string;
  altText: string;
  link?: string; // Optional link for future use
}

// Static banner data - will be replaced with API data in the future
const staticBanners: OfferBanner[] = [
  {
    id: 'offer-1',
    imageUrl: '/OfferBanners/offer-banner-1.png',
    altText: 'Special Offer 1',
  },
  {
    id: 'offer-2',
    imageUrl: '/OfferBanners/offer-banner-2.png',
    altText: 'Special Offer 2',
  },
  {
    id: 'offer-3',
    imageUrl: '/OfferBanners/offer-banner-1.png',
    altText: 'Special Offer 3',
  },
  {
    id: 'offer-4',
    imageUrl: '/OfferBanners/offer-banner-2.png',
    altText: 'Special Offer 4',
  },
  {
    id: 'offer-5',
    imageUrl: '/OfferBanners/offer-banner-1.png',
    altText: 'Special Offer 5',
  },
];

interface OfferBannerSliderProps {
  banners?: OfferBanner[]; // Optional prop for future API data
}

const OfferBannerSlider: React.FC<OfferBannerSliderProps> = ({ 
  banners = staticBanners 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Duplicate banners for seamless infinite scroll
  const duplicatedBanners = [...banners, ...banners];

  useEffect(() => {
    // Simulate loading state
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer || isPaused) return;

    let animationFrameId: number;
    let scrollPosition = 0;
    const scrollSpeed = 0.5; // Pixels per frame

    const scroll = () => {
      if (!scrollContainer || isPaused) return;

      scrollPosition += scrollSpeed;
      
      // Get the width of the original banners (half of total scrollable width)
      const halfWidth = scrollContainer.scrollWidth / 2;
      
      // Reset scroll position when we've scrolled through the first set
      if (scrollPosition >= halfWidth) {
        scrollPosition = 0;
      }
      
      scrollContainer.scrollLeft = scrollPosition;
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPaused]);

  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  if (isLoading) {
    return (
      <div className="w-full my-4 sm:my-5 md:my-6">
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[360px] h-[90px] sm:h-[100px] md:h-[110px] bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full mt-4 mb-8 sm:mt-5 sm:mb-10 md:mt-6 md:mb-12 overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={scrollRef}
        className="flex gap-3 sm:gap-4 overflow-x-hidden"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {duplicatedBanners.map((banner, index) => (
          <div
            key={`${banner.id}-${index}`}
            className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[360px] lg:w-[400px] 
                       h-[90px] sm:h-[100px] md:h-[110px] lg:h-[120px]
                       relative rounded-xl overflow-hidden 
                       shadow-sm hover:shadow-md transition-shadow duration-300
                       cursor-pointer group"
          >
            {/* Image container */}
            <div className="relative w-full h-full">
              <Image
                src={banner.imageUrl}
                alt={banner.altText}
                fill
                className="object-cover rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
                sizes="(max-width: 640px) 280px, (max-width: 768px) 320px, (max-width: 1024px) 360px, 400px"
                priority={index < 5} // Prioritize first set of images
              />
              
              {/* Subtle gradient overlay for better visual appeal */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default OfferBannerSlider;
