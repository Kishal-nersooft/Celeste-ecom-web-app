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
      <div className="w-full max-w-screen-xl mx-auto mt-10 mb-5">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading offers...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="w-full max-w-6xl mx-auto mt-4 mb-4 relative"
    >
      <Carousel
        className="w-full"
        plugins={[autoplayPlugin.current]}
        setApi={setApi}
      >
      <CarouselContent>
        {banners.map((banner) => (
          <CarouselItem key={banner.id}>
            <div className="w-full relative flex items-center justify-center px-4">
              <div className="w-full h-[450px] relative rounded-xl overflow-hidden">
                <Image
                  src={banner.imageUrl}
                  alt="Discount Banner"
                  fill
                  priority
                  className="object-contain rounded-xl"
                  style={{ 
                    borderRadius: '0.75rem',
                    objectFit: 'contain'
                  }}
                />
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
        <CarouselPrevious className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 shadow-xl hover:shadow-2xl transition-shadow duration-200" />
        <CarouselNext className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 shadow-xl hover:shadow-2xl transition-shadow duration-200" />
      </Carousel>
    </div>
  );
};

export default DiscountBanner;
