'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Heart, ArrowRight } from 'lucide-react';
import { useLocation } from '@/contexts/LocationContext';
import { Store } from '@/types/store';
import Image from 'next/image';
import storeImage from '@/images/store-image.jpeg';
import celesteLogo from '@/images/CelesteLogoiconwhitecopy2 copy.png';

interface StoreCardProps {
  store: Store;
  distance?: string;
}

const StoreCard: React.FC<StoreCardProps> = ({ store, distance = "35 Km" }) => {
  const router = useRouter();
  const { setSelectedStore, setSelectedLocation, setDeliveryType } = useLocation();

  const handleStoreClick = () => {
    // Set the selected store in context with all details
    setSelectedStore(store);
    // Set the location to store name for header display
    setSelectedLocation(store.name);
    // Ensure we're in pickup mode
    setDeliveryType('pickup');
    // Navigate to the store page
    router.push(`/store/${store.id}`);
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer w-full"
      onClick={handleStoreClick}
    >
      {/* Store Image */}
      <div className="relative h-56 overflow-hidden">
        {/* Store Background Image */}
        <Image
          src={storeImage}
          alt="Store"
          fill
          className="object-cover"
        />
        
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/40"></div>
        
        {/* Logo and Store Name Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center space-x-3">
            {/* Celeste Logo */}
            <div className="w-12 h-12 relative">
              <Image
                src={celesteLogo}
                alt="Celeste Logo"
                fill
                className="object-contain"
              />
            </div>
            
            {/* Store Name */}
            <h3 className="text-white font-bold text-xl">
              {store.name}
            </h3>
          </div>
        </div>
        
        {/* Heart Icon */}
        <button 
          className="absolute top-3 right-3 p-2 bg-white/80 rounded-full hover:bg-white transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            // Handle favorite functionality
          }}
        >
          <Heart className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Store Details */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center text-base text-gray-600 mb-2">
              <MapPin className="h-5 w-5 mr-3 flex-shrink-0" />
              <span className="truncate">{store.address}</span>
            </div>
            
            <div className="text-base text-gray-500 font-medium">
              {distance}
            </div>
          </div>
          
          <button 
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors ml-4"
            onClick={(e) => {
              e.stopPropagation();
              handleStoreClick();
            }}
          >
            <ArrowRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreCard;
