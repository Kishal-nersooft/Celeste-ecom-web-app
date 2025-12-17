"use client";
import React, { useRef, useState, useEffect } from "react";
import PopularProductCard from "./PopularProductCard";
import { Product } from "../store";
import { getPopularProducts } from "../lib/api";
import { POPULAR_PRODUCTS_MODE } from "../lib/popular-products-config";
import { useLocation } from "../contexts/LocationContext";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const PopularItemsSection = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { deliveryType, defaultAddress, selectedStore } = useLocation();

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const cardWidth = 420; // Approximate width of each popular product card + gap
      scrollContainerRef.current.scrollBy({
        left: -cardWidth,
        behavior: "smooth",
      });
      setTimeout(checkScrollButtons, 300);
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const cardWidth = 420; // Approximate width of each popular product card + gap
      scrollContainerRef.current.scrollBy({
        left: cardWidth,
        behavior: "smooth",
      });
      setTimeout(checkScrollButtons, 300);
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        // Determine storeIds and location based on delivery type
        let storeIds: number[] | undefined;
        let latitude: number | undefined;
        let longitude: number | undefined;

        if (deliveryType === 'pickup') {
          // For pickup mode, use selected store ID
          if (selectedStore?.id) {
            storeIds = [parseInt(selectedStore.id.toString())];
            console.log("🛍️ PopularItems: Using pickup mode with store ID:", storeIds[0]);
          } else {
            // Fallback to default stores if no store selected
            storeIds = [1, 2, 3, 4];
            console.log("🛍️ PopularItems: Using pickup mode with default stores:", storeIds);
          }
        } else {
          // For delivery mode, use location coordinates
          if (defaultAddress?.latitude && defaultAddress?.longitude) {
            latitude = parseFloat(defaultAddress.latitude);
            longitude = parseFloat(defaultAddress.longitude);
            console.log("🚚 PopularItems: Using delivery mode with location:", { latitude, longitude });
          } else {
            console.log("⚠️ PopularItems: Delivery mode but no location available - trying without location");
            // Try without location as fallback
            latitude = undefined;
            longitude = undefined;
          }
        }

        // Fetch 6 popular products using the configured mode
        console.log("🔥 PopularItems: Fetching products with mode:", POPULAR_PRODUCTS_MODE);
        console.log("📋 PopularItems: Request params:", {
          mode: POPULAR_PRODUCTS_MODE,
          storeIds,
          latitude,
          longitude,
          deliveryType
        });
        
        let products = await getPopularProducts(
          POPULAR_PRODUCTS_MODE, // mode from config
          6, // limit
          undefined, // timeWindowDays
          undefined, // categoryIds
          1, // minInteractions (minimum allowed by API)
          true, // includePricing
          true, // includeCategories
          false, // includeTags
          true, // includeInventory
          true, // includePopularityMetrics
          storeIds, // storeIds (for pickup) or undefined (for delivery)
          latitude, // latitude (for delivery)
          longitude // longitude (for delivery)
        );
        
        console.log("✅ PopularItems: Received products:", products?.length || 0);
        
        // If no products with current mode, try 'trending' as fallback
        if (products.length === 0 && POPULAR_PRODUCTS_MODE !== 'trending') {
          console.log("🔄 PopularItems: No products with current mode, trying 'trending' as fallback...");
          products = await getPopularProducts(
            'trending', // Fallback to trending
            6,
            undefined,
            undefined,
            1, // minInteractions
            true,
            true,
            false,
            true,
            true,
            storeIds,
            latitude,
            longitude
          );
          console.log("✅ PopularItems: Fallback received products:", products?.length || 0);
        }
        
        if (Array.isArray(products) && products.length > 0) {
          setPopularProducts(products);
        } else {
          console.warn("⚠️ PopularItems: No products returned from API");
          setPopularProducts([]);
        }
      } catch (error) {
        console.error("❌ Error fetching popular products:", error);
        setPopularProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [deliveryType, defaultAddress, selectedStore]);

  useEffect(() => {
    checkScrollButtons();
  }, [popularProducts]);

  if (loading) {
    return (
      <div className="w-full py-8">
        <div className="text-center py-10 text-gray-500">
          <p>Loading popular items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-8">
      {/* Header with section name and See All button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-600">
          Popular Items
        </h2>
        <div className="flex items-center gap-2">
          <Link 
            href="/popular-items" 
            className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
          >
            See All
          </Link>
          <div className="flex gap-1">
            <button
              onClick={scrollLeft}
              disabled={!canScrollLeft}
              className={`p-2 rounded-full transition-colors ${
                canScrollLeft
                  ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={scrollRight}
              disabled={!canScrollRight}
              className={`p-2 rounded-full transition-colors ${
                canScrollRight
                  ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable product container */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          onScroll={checkScrollButtons}
          className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 scroll-smooth"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {popularProducts.map((product) => (
            <motion.div
              key={product?.id}
              layout
              initial={{ opacity: 0.2 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-shrink-0 w-[400px]"
            >
              <PopularProductCard product={product} />
            </motion.div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default PopularItemsSection;
