"use client";

import React, { useState, useEffect } from "react";
import { useLocation } from "@/contexts/LocationContext";
import { useCategory } from "@/contexts/CategoryContext";
import ProductList from "@/components/ProductList";
import PopularItemsSection from "@/components/PopularItemsSection";
import RecentItemsSection from "@/components/RecentItemsSection";
import StoresGrid from "@/components/StoresGrid";
import DiscountBanner from "@/components/DiscountBanner";
import { useAuth } from "@/components/FirebaseAuthProvider";
import PopupAds from "@/components/PopupAds";
import { Product } from "../../store";
import { Category } from "../../components/Categories";
import { getParentCategories } from "../../lib/api";

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
  const { selectedCategoryId, isDealsSelected } =
    useCategory();
  const [products] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);

  // Fall back to a client fetch only when the server could not provide categories.
  useEffect(() => {
    if (initialCategories.length > 0) {
      return;
    }

    let cancelled = false;

    const fetchCategories = async () => {
      try {
        const categoriesResponse = await getParentCategories();
        if (cancelled) return;
        setCategories(
          Array.isArray(categoriesResponse) ? categoriesResponse : []
        );
      } catch (error) {
        console.error("HomeClient - Error fetching categories:", error);
      }
    };

    fetchCategories();
    return () => {
      cancelled = true;
    };
  }, [initialCategories]);

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
            products={products}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            isDealsSelected={isDealsSelected}
            initialParentCategoryNames={initialParentCategoryNames}
            initialParentProducts={initialParentProducts}
          />
          {user && <RecentItemsSection />}
          <PopularItemsSection />
        </>
      )}
    </>
  );
};

export default HomeClient;
