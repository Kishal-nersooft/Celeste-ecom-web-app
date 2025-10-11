"use client";

import Link from "next/link";
import React from "react";
import CartIcon from "./CartIcon";
import Categories from "./Categories";
import Container from "./Container";
import Image from "next/image";
import logo from "@/images/logo.png";
import { BsBasket } from "react-icons/bs";
import { FiUser } from "react-icons/fi";
import Title from "./Title";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import toast from "react-hot-toast";
import { SidePanel } from "./SidePanel";
import LocationSelector from "./LocationSelector";
import CacheRefreshButton from "./CacheRefreshButton";
import CartPreviewPanel from "./CartPreviewPanel";
import useCartStore from "@/store";
import { useLocation } from "@/contexts/LocationContext";
import deliveryIcon from "@/images/delivery-icon.png";
import pickupIcon from "@/images/pickup-icon.png";

export const Header = () => {
  const { user, loading } = useAuth();
  const { selectedLocation, setSelectedLocation, deliveryType, hasSelectedDeliveryType } = useLocation();
  const cartStore = useCartStore();
  const itemCount = cartStore.items.length;

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Clear cart store on logout to prevent permission issues
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cart-store');
      }
      toast.success("Signed out successfully!");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="bg-black fixed top-0 left-0 right-0 z-50 border-b border-b-gray-200 py-1 w-full">
      <Container className="flex justify-between py-3">
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
          <form action="/search">
            <input
              type="search"
              name="q"
              placeholder="Search..."
              className="w-96 border border-gray-300 rounded-full px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </form>
          {/* <CacheRefreshButton /> */}
          <div className="relative">
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
          </div>
          {loading ? (
            <div>Loading...</div>
          ) : user ? (
            <div className="flex items-center gap-2">
              {/* <Link href="/orders" className="flex items-center text-sm gap-2 border border-gray-200 px-2 py-1 rounded-md shadow-md hover:shadow-none hoverEffect bg-white">
                <FiUser className="w-6 h-6" />
                Orders
              </Link> */}
              <button onClick={handleSignOut} className="flex items-center text-sm gap-2 border border-gray-200 px-2 py-1 rounded-md shadow-md hover:shadow-none hoverEffect bg-white text-red-600">
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/sign-in" className="text-sm text-blue-600 hover:underline">
                Sign In
              </Link>
              <Link href="/sign-up" className="text-sm text-blue-600 hover:underline">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};
