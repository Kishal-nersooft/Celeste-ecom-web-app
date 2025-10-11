"use client";

import React, { useState, useEffect } from "react";
import { useLocation } from "@/contexts/LocationContext";
import { useCategory } from "@/contexts/CategoryContext";
import ProductList from "@/components/ProductList";
import PopularItemsSection from "@/components/PopularItemsSection";
import DiscountBanner from "@/components/DiscountBanner";
import StoresGrid from "@/components/StoresGrid";
import { useAuth } from "@/components/FirebaseAuthProvider";
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
  const { deliveryType } = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { selectedCategoryId, isDealsSelected, setLastVisitedCategory } =
    useCategory();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [loading, setLoading] = useState(false);

  // Clean console logs - only show once when data changes
  if (
    products.length > 0 &&
    products.length !== (window as any).lastHomeProductCount
  ) {
    console.log("🏠 HomeClient - Products loaded:", products.length);
    (window as any).lastHomeProductCount = products.length;
  }

  // Fetch data on client side after authentication is ready
  useEffect(() => {
    const fetchData = async () => {
      // Only fetch products and categories for delivery mode
      if (deliveryType === "delivery") {
        console.log("🏠 HomeClient - Fetching data for delivery mode...");
        setLoading(true);

        try {
          const [productsResponse, categoriesResponse] = await Promise.all([
            getProductsWithPricing(
              null,
              1,
              20,
              false,
              true,
              true,
              [1, 2, 3, 4]
            ), // Reduced page size to 20 for better performance
            getParentCategories(),
          ]);

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
  }, [authLoading, deliveryType]); // Wait for authentication to be ready and watch deliveryType changes

  // Show loading only for delivery mode or auth loading
  if (authLoading) {
    return (
      <div className="text-center py-10">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Show loading for delivery mode when fetching products
  if (deliveryType === "delivery" && loading) {
    return (
      <div className="text-center py-10">
        <div className="text-gray-500">Loading products...</div>
      </div>
    );
  }

  return (
    <>
      {deliveryType === "pickup" ? (
        // Pickup mode: Show only stores (no popular items or products)
        <>
          <StoresGrid />
          <DiscountBanner />
        </>
      ) : (
        // Delivery mode: Show all products as before
        <>
          <ProductList
            title={true}
            products={products}
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            isDealsSelected={isDealsSelected}
          />
          <PopularItemsSection />
          <DiscountBanner />
        </>
      )}
    </>
  );
};

export default HomeClient;
