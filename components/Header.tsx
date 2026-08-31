"use client";

import Link from "next/link";
import React, { useState, useEffect, Suspense } from "react";
import CartIcon from "./CartIcon";
import Categories from "./Categories";
import Container from "./Container";
import Image from "next/image";
import logo from "@/images/logo.png";
import { BsBasket } from "react-icons/bs";
import Title from "./Title";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { SidePanel } from "./SidePanel";
import { LocationSelectorProvider, LocationSelectorTrigger } from "./LocationSelector";
import CartPreviewPanel from "./CartPreviewPanel";
import useCartStore from "@/store";
import { useLocation } from "@/contexts/LocationContext";
import deliveryIcon from "@/images/delivery-icon.png";
import pickupIcon from "@/images/pickup-icon.png";
import SearchBar from "./SearchBar";

export const Header = () => {
  const { user, isGuest } = useAuth();
  const { selectedLocation, setSelectedLocation, deliveryType, hasSelectedDeliveryType } = useLocation();
  const cartStore = useCartStore();
  const itemCount = cartStore.items.length;
  const [isScrolled, setIsScrolled] = useState(false);

  // Detect scroll for mobile
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
  };

  return (
    <div className="bg-black fixed top-0 left-0 right-0 z-50 border-b border-b-gray-200 py-1 w-full transition-all duration-300 ease-in-out">
      <Container className="py-3">
        <LocationSelectorProvider onLocationSelect={handleLocationSelect}>
        <div className="flex flex-col gap-2 lg:flex-row lg:justify-between lg:items-center">
          {/* Left: logo, location (mobile rows 1–2 collapse on scroll; desktop inline) */}
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-8 min-w-0 flex-1">
            {/* Row 1: Hamburger, Logo, Cart/Login — hidden on mobile scroll */}
            <div className={`flex items-center justify-between gap-2 lg:justify-start lg:gap-8 transition-all duration-300 ease-in-out ${isScrolled ? 'opacity-0 h-0 overflow-hidden lg:opacity-100 lg:h-auto' : 'opacity-100 h-auto'}`}>
              <div className="flex items-center gap-2">
                <SidePanel />
                <Link href="/">
                  <Image src={logo} alt="Shop Logo" width={90} height={36} priority className="object-contain h-auto w-auto lg:w-[120px] lg:h-12" />
                </Link>
              </div>

              {/* Mobile cart/login — desktop cart is in the right block */}
              <div className="flex items-center gap-2 lg:hidden">
                {user && (
                  <CartPreviewPanel>
                    <button 
                      className="relative flex items-center justify-center w-8 h-8 border border-gray-200 rounded-md shadow-md hover:shadow-none hoverEffect bg-white cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-darkBlue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h8M17 18a2 2 0 100 4 2 2 0 000-4zM9 18a2 2 0 100 4 2 2 0 000-4z" />
                      </svg>
                      {itemCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center shadow-lg">
                          {itemCount > 99 ? '99+' : itemCount}
                        </span>
                      )}
                    </button>
                  </CartPreviewPanel>
                )}
                
                {isGuest && (
                  <Link 
                    href="/login" 
                    className="px-2 py-1 bg-gray-200 text-black font-bold rounded-full text-[10px] hover:bg-gray-300 transition-colors duration-200 shadow-sm hover:shadow-md"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>

            {/* Row 2: Location — hidden on mobile scroll; always visible on desktop */}
            <div className={`flex items-center gap-1 lg:gap-2 transition-all duration-300 ease-in-out ${isScrolled ? 'opacity-0 h-0 overflow-hidden lg:opacity-100 lg:h-auto' : 'opacity-100 h-auto'}`}>
              <div className="flex-1 lg:flex-none [&_button]:!min-w-[90px] [&_button]:!max-w-[130px] [&_button]:!text-[10px] [&_button]:!h-8 [&_button]:!px-2 [&_button]:!gap-1 [&_svg]:!w-3 [&_svg]:!h-3 lg:[&_button]:!min-w-0 lg:[&_button]:!max-w-[160px] lg:[&_button]:!text-sm lg:[&_button]:!h-auto">
                <LocationSelectorTrigger />
              </div>
              {hasSelectedDeliveryType && (
                <div className="w-6 h-6 lg:w-8 lg:h-8 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0 ml-1">
                  <Image 
                    src={deliveryType === 'delivery' ? deliveryIcon : pickupIcon} 
                    alt={deliveryType === 'delivery' ? 'Delivery' : 'Pickup'} 
                    width={14} 
                    height={14}
                    className="lg:hidden"
                    style={{ width: '14px', height: '14px' }}
                  />
                  <Image 
                    src={deliveryType === 'delivery' ? deliveryIcon : pickupIcon} 
                    alt={deliveryType === 'delivery' ? 'Delivery' : 'Pickup'} 
                    width={20} 
                    height={20}
                    className="hidden lg:block"
                    style={{ width: '20px', height: '20px' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right: single SearchBar + desktop cart/login */}
          <div className="flex items-center gap-2 lg:gap-10 w-full lg:w-auto shrink-0">
            <Suspense fallback={
              <div className="w-full lg:w-96 h-8 rounded-full bg-gray-200 animate-pulse" />
            }>
              <SearchBar 
                className="w-full lg:w-96"
                placeholder="Search..."
                maxResults={10}
              />
            </Suspense>

            <div className="hidden lg:flex items-center gap-10">
              {user && (
                <CartPreviewPanel>
                  <button 
                    className="relative flex items-center justify-center w-12 h-12 border border-gray-200 rounded-md shadow-md hover:shadow-none hoverEffect bg-white cursor-pointer"
                  >
                    <svg className="w-6 h-6 text-darkBlue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h8M17 18a2 2 0 100 4 2 2 0 000-4zM9 18a2 2 0 100 4 2 2 0 000-4z" />
                    </svg>
                    {itemCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg">
                        {itemCount > 99 ? '99+' : itemCount}
                      </span>
                    )}
                  </button>
                </CartPreviewPanel>
              )}
              
              {isGuest && (
                <Link 
                    href="/login" 
                    className="px-4 py-2 bg-gray-200 text-black font-bold rounded-full text-sm hover:bg-gray-300 transition-colors duration-200 shadow-sm hover:shadow-md"
                  >
                    Login
                </Link>
              )}
            </div>
          </div>
        </div>
        </LocationSelectorProvider>
      </Container>
    </div>
  );
};
