"use client";

import React, { useEffect } from "react";
import { useLocation } from "@/contexts/LocationContext";
import { useCategory } from "@/contexts/CategoryContext";
import ProductList from "@/components/ProductList";
import PopularItemsSection from "@/components/PopularItemsSection";
import RecentItemsSection from "@/components/RecentItemsSection";
import StoresGrid from "@/components/StoresGrid";
import DiscountBanner from "@/components/DiscountBanner";
import { useAuth } from "@/components/FirebaseAuthProvider";
import PopupAds from "@/components/PopupAds";
import LazyMount from "@/components/LazyMount";
import { Product } from "../../store";
import { Category } from "../../components/Categories";

interface HomeClientProps {
  products: Product[];
  categories: Category[];
  parentCategoryNames?: { [key: number]: string };
  parentProducts?: { [key: number]: Product[] };
}

const HomeClient: React.FC<HomeClientProps> = ({
  products: initialProducts,
  categories: initialCategories,
  parentCategoryNames: initialParentCategoryNames,
  parentProducts: initialParentProducts,
}) => {
  const { deliveryType } = useLocation();
  const { user } = useAuth();
  const {
    selectedCategoryId,
    isDealsSelected,
    categories: contextCategories,
    seedParentCategories,
  } = useCategory();

  // Prefer SSR categories; otherwise use the shared context list.
  const categories =
    initialCategories.length > 0 ? initialCategories : contextCategories;

  useEffect(() => {
    if (initialCategories.length > 0) {
      seedParentCategories(initialCategories);
    }
  }, [initialCategories, seedParentCategories]);

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
        // Delivery mode: Show catalogue immediately; auth/location refine pricing in ProductList
        <>
          <ProductList
            title={true}
            products={initialProducts}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            isDealsSelected={isDealsSelected}
            initialParentCategoryNames={initialParentCategoryNames}
            initialParentProducts={initialParentProducts}
          />
          {user && (
            <LazyMount>
              <RecentItemsSection />
            </LazyMount>
          )}
          <LazyMount>
            <PopularItemsSection />
          </LazyMount>
        </>
      )}
    </>
  );
};

export default HomeClient;
