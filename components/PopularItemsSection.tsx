"use client";
import React, { useRef, useState, useEffect } from "react";
import PopularProductCard from "./PopularProductCard";
import { Product } from "../store";
import { getProductsWithPricing } from "../lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const PopularItemsSection = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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
        const allProducts = await getProductsWithPricing(null, 1, 100, false, true, true, [1, 2, 3, 4]);
        if (Array.isArray(allProducts) && allProducts.length > 0) {
          const shuffled = [...allProducts].sort(() => Math.random() - 0.5);
          setPopularProducts(shuffled.slice(0, 6));
        }
      } catch (error) {
        console.error("Error fetching popular products:", error);
        setPopularProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

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
            href="/categories" 
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
