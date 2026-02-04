'use client';

import Image from "next/image";
import React, { useEffect, useState, useRef } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "./ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface Banner {
  id: string;
  imageUrl: string;
}

const DiscountBanner = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi>();
  const autoplayPlugin = useRef(
    Autoplay({
      delay: 3000,
      stopOnInteraction: false,
    })
  );

  useEffect(() => {
    // Simulate async data fetching
    const getBanners = async (): Promise<Banner[]> => {
      // Return static data with image URLs
      return [
        {
          id: "banner1",
          imageUrl: "/CarouselImages/Celeste-Web-home-page-banner---1.png",
        },
        {
          id: "banner2",
          imageUrl: "/CarouselImages/Celeste-Web-home-page-banner---2.png",
        },
        {
          id: "banner3",
          imageUrl: "/CarouselImages/Celeste-Web-home-page-banner---3.png",
        },
      ];
    };

    getBanners().then((bannersData) => {
      setBanners(bannersData);
      setLoading(false);
    });
  }, []);

  const handleMouseEnter = () => {
    if (autoplayPlugin.current) {
      autoplayPlugin.current.stop();
    }
  };

  const handleMouseLeave = () => {
    if (autoplayPlugin.current) {
      autoplayPlugin.current.play();
    }
  };

  if (loading) {
    return (
      <div className="w-full my-3">
        <div className="flex items-center justify-center h-32 sm:h-40 md:h-48 bg-gray-100 rounded-lg animate-pulse">
          <div className="text-sm text-gray-400">Loading offers...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="w-full my-3 relative"
    >
      <Carousel
        className="w-full"
        plugins={[autoplayPlugin.current]}
        setApi={setApi}
      >
        <CarouselContent className="-ml-0">
          {banners.map((banner) => (
            <CarouselItem key={banner.id} className="pl-0">
              <div className="w-full relative">
                {/* Responsive height: smaller on mobile, larger on desktop */}
                <div className="w-full h-[140px] sm:h-[180px] md:h-[220px] lg:h-[260px] xl:h-[300px] relative rounded-lg overflow-hidden">
                  <Image
                    src={banner.imageUrl}
                    alt="Discount Banner"
                    fill
                    priority
                    className="object-cover rounded-lg"
                    sizes="100vw"
                  />
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 h-8 w-8 sm:h-9 sm:w-9 shadow-lg hover:shadow-xl transition-shadow duration-200 bg-white/90 hover:bg-white" />
        <CarouselNext className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10 h-8 w-8 sm:h-9 sm:w-9 shadow-lg hover:shadow-xl transition-shadow duration-200 bg-white/90 hover:bg-white" />
      </Carousel>
    </div>
  );
};

export default DiscountBanner;
