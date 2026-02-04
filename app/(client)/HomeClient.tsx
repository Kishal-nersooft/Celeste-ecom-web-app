"use client";

import React, { useState, useEffect } from "react";
import { useLocation } from "@/contexts/LocationContext";
import { useCategory } from "@/contexts/CategoryContext";
import ProductList from "@/components/ProductList";
import PopularItemsSection from "@/components/PopularItemsSection";
import RecentItemsSection from "@/components/RecentItemsSection";
import StoresGrid from "@/components/StoresGrid";
import DiscountBanner from "@/components/DiscountBanner";
import LocationLoadingIndicator from "@/components/LocationLoadingIndicator";
import { useAuth } from "@/components/FirebaseAuthProvider";
import Loader from "@/components/Loader";
import PopupAds from "@/components/PopupAds";
import { Product } from "../../store";
import { Category } from "../../components/Categories";
import { getProductsWithPricing, getParentCategories } from "../../lib/api";

interface HomeClientProps {
  products: Product[];
  categories: Category[];
}

const HomeClient: React.FC<HomeClientProps> = ({
  products: initialProducts,
  categories: initialCategories,
}) => {
  const { deliveryType, defaultAddress, isLocationLoading, isLocationReady, hasLocationSelected } = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { selectedCategoryId, isDealsSelected, setLastVisitedCategory } =
    useCategory();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [loading, setLoading] = useState(false);

  // Clean console logs - only show once when data changes
  React.useEffect(() => {
    if (
      products.length > 0 &&
      typeof window !== 'undefined' &&
      products.length !== (window as any).lastHomeProductCount
    ) {
      console.log("🏠 HomeClient - Products loaded:", products.length);
      (window as any).lastHomeProductCount = products.length;
    }
  }, [products.length]);

  // Fetch data on client side - optimized for quick loading with cached location
  useEffect(() => {
    const fetchData = async () => {
      // Only fetch products and categories for delivery mode
      if (deliveryType === "delivery") {
        // If location is still loading, wait for it
        if (isLocationLoading) {
          console.log("🏠 HomeClient - Waiting for location data...");
          return;
        }

        setLoading(true);

        try {
          let productsResponse, categoriesResponse;

          // Case 1: No location selected and not logged in - show all products from all 4 stores
          if (!hasLocationSelected && !isLocationReady && !user) {
            console.log("🏠 HomeClient - No location selected, fetching all products from all stores...");
            [productsResponse, categoriesResponse] = await Promise.all([
              getProductsWithPricing(
                null,
                1,
                20,
                false,
                true,
                true,
                [1, 2, 3, 4], // All 4 store IDs - no location params
                undefined,    // No latitude
                undefined     // No longitude
              ),
              getParentCategories(),
            ]);
          }
          // Case 2: Location selected (with or without login) - fetch with location coordinates
          else if (isLocationReady && defaultAddress) {
            console.log("🏠 HomeClient - Location ready, fetching data with cached coordinates...");
            const latitude = defaultAddress.latitude;
            const longitude = defaultAddress.longitude;
            console.log("📍 Using cached coordinates for immediate stock loading:", { latitude, longitude });

            [productsResponse, categoriesResponse] = await Promise.all([
              getProductsWithPricing(
                null,
                1,
                20,
                false,
                true,
                true,
                [1, 2, 3, 4], // Store IDs
                latitude,     // Latitude for inventory data
                longitude     // Longitude for inventory data
              ),
              getParentCategories(),
            ]);
          }
          // Case 3: Logged in but no location - try to load from backend addresses
          else if (user && !isLocationReady) {
            // Wait a bit more for location to load from backend
            console.log("🏠 HomeClient - User logged in, waiting for location from backend...");
            setLoading(false);
            return;
          }
          // Case 4: No location data available
          else {
            console.log("⚠️ Location not ready, fetching all products from all stores...");
            [productsResponse, categoriesResponse] = await Promise.all([
              getProductsWithPricing(
                null,
                1,
                20,
                false,
                true,
                true,
                [1, 2, 3, 4], // All 4 store IDs - no location params
                undefined,
                undefined
              ),
              getParentCategories(),
            ]);
          }

          console.log("🏠 HomeClient - Data fetched successfully");

          setProducts(Array.isArray(productsResponse) ? productsResponse : []);
          setCategories(
            Array.isArray(categoriesResponse) ? categoriesResponse : []
          );
        } catch (error) {
          console.error("HomeClient - Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      } else {
        // For pickup mode, no need to fetch products or categories
        console.log(
          "🏠 HomeClient - Pickup mode - skipping product/category fetch"
        );
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, deliveryType, isLocationLoading, isLocationReady, defaultAddress, hasLocationSelected, user]); // Wait for authentication to be ready and watch deliveryType and address changes

  // Show loading only for delivery mode or auth loading
  if (authLoading) {
    return <Loader />;
  }

  // Show location loading indicator only if user is logged in and location is loading
  // For non-logged-in users, we show products even without location
  if (deliveryType === "delivery" && user && (isLocationLoading || !isLocationReady)) {
    return (
      <div className="min-h-screen">
        <LocationLoadingIndicator 
          isLocationLoading={isLocationLoading}
          isLocationReady={isLocationReady}
          className="py-20"
        />
      </div>
    );
  }

  // Show loading for delivery mode when fetching products
  if (deliveryType === "delivery" && loading) {
    return <Loader />;
  }

  return (
    <>
      {/* Popup Ads Component - Shows after 5 seconds */}
      {/* Fetches promotions from API, with fallback to local image if no promotions available */}
      <PopupAds 
        imageUrl="/popup-ads/popup-ad-image.png" // Fallback image if no API promotions
        delay={5000}
      />
      
      {deliveryType === "pickup" ? (
        // Pickup mode: Show only stores (no popular items or products)
        <>
          <StoresGrid />
          <DiscountBanner />
        </>
      ) : (
        // Delivery mode: Show all products as before
        // Note: DiscountBanner is now positioned inside ProductList (under categories, above products)
        <>
          <ProductList
            title={true}
            products={products}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            isDealsSelected={isDealsSelected}
          />
          <RecentItemsSection />
          <PopularItemsSection />
        </>
      )}
    </>
  );
};

export default HomeClient;
