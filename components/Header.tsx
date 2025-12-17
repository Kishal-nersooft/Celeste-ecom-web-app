"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import CartIcon from "./CartIcon";
import Categories from "./Categories";
import Container from "./Container";
import Image from "next/image";
import logo from "@/images/logo.png";
import { BsBasket } from "react-icons/bs";
import Title from "./Title";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { SidePanel } from "./SidePanel";
import LocationSelector from "./LocationSelector";
import CartPreviewPanel from "./CartPreviewPanel";
import useCartStore from "@/store";
import { useLocation } from "@/contexts/LocationContext";
import deliveryIcon from "@/images/delivery-icon.png";
import pickupIcon from "@/images/pickup-icon.png";
import SearchBar from "./SearchBar";
import Loader from "./Loader";

export const Header = () => {
  const { user, loading } = useAuth();
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
        {/* Mobile Layout (below lg) */}
        <div className="space-y-2 lg:hidden">
          {/* Row 1: Hamburger, Logo, Cart/Login - Hidden when scrolled */}
          <div className={`flex items-center justify-between gap-2 transition-all duration-300 ease-in-out ${isScrolled ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
            {/* Left: SidePanel and Logo */}
            <div className="flex items-center gap-2">
              <SidePanel />
              <Link href="/">
                <Image src={logo} alt="Shop Logo" width={90} height={36} priority className="object-contain" />
              </Link>
            </div>

            {/* Right: Cart and Sign Up */}
            <div className="flex items-center gap-2">
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
              
              {loading ? (
                <Loader />
              ) : user ? null : (
                <Link 
                  href="/sign-up" 
                  className="px-2 py-1 bg-gray-200 text-black font-bold rounded-full text-[10px] hover:bg-gray-300 transition-colors duration-200 shadow-sm hover:shadow-md"
                >
                  Sign Up
                </Link>
              )}
            </div>
          </div>

          {/* Row 2: Location Selector + Icon - Hidden when scrolled */}
          <div className={`flex items-center gap-1 transition-all duration-300 ease-in-out ${isScrolled ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
            <div className="flex-1 [&_button]:!min-w-[120px] [&_button]:!max-w-[200px] [&_button]:!text-[10px] [&_button]:!h-8 [&_button]:!px-2 [&_button]:!gap-1 [&_svg]:!w-3 [&_svg]:!h-3">
              <LocationSelector onLocationSelect={handleLocationSelect} />
            </div>
            {hasSelectedDeliveryType && (
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0 ml-1">
                <Image 
                  src={deliveryType === 'delivery' ? deliveryIcon : pickupIcon} 
                  alt={deliveryType === 'delivery' ? 'Delivery' : 'Pickup'} 
                  width={14} 
                  height={14}
                  style={{ width: '14px', height: '14px' }}
                />
              </div>
            )}
          </div>

          {/* Row 3: Search Bar - Always Visible (Full Width when scrolled) */}
          <div className="w-full">
            <SearchBar 
              className="w-full"
              placeholder="Search..."
              maxResults={10}
            />
          </div>
        </div>

        {/* Desktop Layout (lg and above) */}
        <div className="hidden lg:flex justify-between items-center">
          <div className="flex items-center gap-8">
            <SidePanel />
            <Link href="/">
              <Image src={logo} alt="Shop Logo" width={120} height={48} priority />
            </Link>
            <div className="flex items-center gap-2">
              <LocationSelector onLocationSelect={handleLocationSelect} />
              {hasSelectedDeliveryType && (
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <Image 
                    src={deliveryType === 'delivery' ? deliveryIcon : pickupIcon} 
                    alt={deliveryType === 'delivery' ? 'Delivery' : 'Pickup'} 
                    width={20} 
                    height={20}
                    style={{ width: '20px', height: '20px' }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-10">
            <SearchBar 
              className="w-96"
              placeholder="Search..."
              maxResults={10}
            />
            
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
            
            {loading ? (
              <Loader />
            ) : user ? (
              <div className="flex items-center gap-2">
                {/* <Link href="/orders" className="flex items-center text-sm gap-2 border border-gray-200 px-2 py-1 rounded-md shadow-md hover:shadow-none hoverEffect bg-white">
                  <FiUser className="w-6 h-6" />
                  Orders
                </Link> */}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link 
                  href="/sign-in" 
                  className="px-4 py-2 bg-gray-200 text-black font-bold rounded-full text-sm hover:bg-gray-300 transition-colors duration-200 shadow-sm hover:shadow-md"
                >
                  Sign In
                </Link>
                <Link 
                  href="/sign-up" 
                  className="px-4 py-2 bg-gray-200 text-black font-bold rounded-full text-sm hover:bg-gray-300 transition-colors duration-200 shadow-sm hover:shadow-md"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
};
