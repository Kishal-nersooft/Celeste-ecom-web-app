'use client';

import React, { useEffect, useState } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);

  // Show exactly 3 banners (no infinite scrolling)
  const displayedBanners = banners.slice(0, 3);

  useEffect(() => {
    // Simulate loading state
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="hidden md:block w-full my-4 sm:my-5 md:my-6">
        <div className="grid grid-cols-3 gap-4 items-center">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className={
                index === 0
                  ? 'justify-self-start w-[300px] sm:w-[340px] md:w-[380px] max-w-full'
                  : index === 1
                    ? 'justify-self-center w-[300px] sm:w-[340px] md:w-[380px] max-w-full'
                    : 'justify-self-end w-[300px] sm:w-[340px] md:w-[380px] max-w-full'
              }
            >
              <div className="h-[100px] sm:h-[110px] md:h-[120px] bg-gray-100 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const bannerCardClassName =
    'w-[300px] sm:w-[340px] md:w-[380px] lg:w-[420px] max-w-full h-[100px] sm:h-[110px] md:h-[120px] lg:h-[130px] ' +
    'relative rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer group';

  return (
    <div 
      className="hidden md:block w-full mt-4 mb-8 sm:mt-5 sm:mb-10 md:mt-6 md:mb-12 overflow-hidden"
    >
      <div
        className="grid grid-cols-3 gap-4 items-center"
      >
        {displayedBanners.map((banner, index) => (
          <div
            key={`${banner.id}-${index}`}
            className={
              index === 0
                ? 'justify-self-start'
                : index === 1
                  ? 'justify-self-center'
                  : 'justify-self-end'
            }
          >
            <div className={bannerCardClassName}>
            {/* Image container */}
            <div className="relative w-full h-full">
              <Image
                src={banner.imageUrl}
                alt={banner.altText}
                fill
                className="object-cover rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
                // Each banner occupies ~1/3 of the container width
                sizes="(max-width: 640px) 32vw, (max-width: 768px) 32vw, (max-width: 1024px) 33vw, 33vw"
                priority={index < 3}
              />
              
              {/* Subtle gradient overlay for better visual appeal */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OfferBannerSlider;
