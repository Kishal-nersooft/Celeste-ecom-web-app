"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCategory } from "../contexts/CategoryContext";
import { getCategoryIconPath } from "@/lib/category-icons-config";
import {
  getCategoryDisplayName,
  stripCategoryEmojis,
} from "@/lib/category-display-name";
import { normalizeImageUrl } from "@/lib/normalize-image-url";

interface LazyCategoryImageProps {
  src: string;
  alt: string;
  root: HTMLDivElement | null;
}

function LazyCategoryImage({ src, alt, root }: LazyCategoryImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        root,
        rootMargin: "80px",
        threshold: 0.01,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [root]);

  return (
    <div ref={ref} className="flex items-center justify-center w-full h-full">
      {isVisible ? (
        <Image
          src={src}
          alt={alt}
          width={40}
          height={40}
          loading="lazy"
          sizes="40px"
          className="w-[30px] h-[30px] sm:w-9 sm:h-9 md:w-10 md:h-10 object-contain"
        />
      ) : (
        <div className="w-[30px] h-[30px] sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-gray-200" />
      )}
    </div>
  );
}

// New Category interface matching backend schema
export interface Category {
  id: number;
  name: string;
  /** Storefront label from the API. Falls back to `name` when omitted. */
  display_name?: string;
  sort_order: number;
  description?: string;
  image_url?: string;
  parent_category_id?: number;
  subcategories?: Category[];
}

/** Nav items include synthetic All/Deals entries whose id may be null. */
export type SelectableCategory = Omit<Category, "id" | "image_url"> & {
  id: number | null;
  image_url?: string | null;
};

interface Props {
  onSelectCategory: (
    categoryId: number | null,
    isDeals?: boolean,
    categoryName?: string
  ) => void;
  categories?: Category[];
}

const Categories = ({
  onSelectCategory,
  categories: initialCategories,
}: Props) => {
  const {
    selectedCategoryId,
    isDealsSelected,
    categories: contextCategories,
    categoriesLoading,
    categoriesError,
  } = useCategory();
  const hasInitial =
    Array.isArray(initialCategories) && initialCategories.length > 0;
  const categories = hasInitial ? initialCategories! : contextCategories;
  const loading = hasInitial ? false : categoriesLoading;
  const error = hasInitial ? null : categoriesError;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const CategorySelectorSkeleton = ({ count = 14 }: { count?: number }) => {
    return (
      <div className="py-2 sm:py-3 md:py-4 px-4">
        <div className="relative">
          <button
            disabled
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 sm:p-1.5 md:p-2 rounded-full bg-gray-100 text-gray-400 cursor-not-allowed"
          >
            <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 md:w-4 md:h-4" />
          </button>
          <button
            disabled
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 sm:p-1.5 md:p-2 rounded-full bg-gray-100 text-gray-400 cursor-not-allowed"
          >
            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 md:w-4 md:h-4" />
          </button>

          <div className="flex overflow-x-auto space-x-2 sm:space-x-3 md:space-x-4 pb-2 px-6 sm:px-7 md:px-8 scrollbar-hide">
            {Array.from({ length: count }).map((_, idx) => (
              <div key={idx} className="flex flex-col animate-pulse">
                <div className="flex flex-shrink-0 flex-col items-center w-[4.75rem] sm:w-[5.5rem] md:w-24">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gray-200" />
                  <div className="mt-1 sm:mt-1.5 md:mt-2 h-3 sm:h-3.5 md:h-4 w-14 sm:w-16 md:w-20 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const handleCategoryClick = (
    categoryId: number | null,
    isDeals: boolean = false,
    categoryName?: string
  ) => {
    onSelectCategory(categoryId, isDeals, categoryName);
  };

  // Check scroll buttons on mount and when categories change
  useEffect(() => {
    checkScrollButtons();
  }, [categories]);

  // Determine active category based on context
  const activeCategory = isDealsSelected ? -1 : selectedCategoryId;

  // Create an "All" category option that will be shown first
  const allCategoryOption: SelectableCategory = {
    id: null,
    name: "All",
    sort_order: 0,
    description: "Show all products",
    image_url: "/all_category_icon.png",
  };

  // Create a "Deals" category option
  const dealsCategoryOption: SelectableCategory = {
    id: -1, // Use -1 to distinguish from real categories
    name: "Deals",
    sort_order: 1,
    description: "Show all discounted products",
    image_url: null,
  };
  
  // Add "All" and "Deals" options at the beginning of categories
  const displayCategories: SelectableCategory[] = [
    allCategoryOption,
    dealsCategoryOption,
    ...categories,
  ];

  if (loading) return <CategorySelectorSkeleton />;
  if (error) return <div>Error: {error}</div>;

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const categoryWidth = 96; // Approximate width of each category + gap
      scrollContainerRef.current.scrollBy({
        left: -categoryWidth * 3, // Scroll by 3 categories at a time
        behavior: "smooth",
      });
      // Update button states after scroll
      setTimeout(checkScrollButtons, 300);
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const categoryWidth = 96; // Approximate width of each category + gap
      scrollContainerRef.current.scrollBy({
        left: categoryWidth * 3, // Scroll by 3 categories at a time
        behavior: "smooth",
      });
      // Update button states after scroll
      setTimeout(checkScrollButtons, 300);
    }
  };


  return (
    <div className="py-2 sm:py-3 md:py-4 px-4">
      <div className="relative">
        {/* Left scroll button */}
        <button
          onClick={scrollLeft}
          disabled={!canScrollLeft}
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 sm:p-1.5 md:p-2 rounded-full transition-colors ${
            canScrollLeft
              ? "bg-black hover:bg-gray-800 text-white shadow-lg"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 md:w-4 md:h-4" />
        </button>

        {/* Right scroll button */}
        <button
          onClick={scrollRight}
          disabled={!canScrollRight}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 sm:p-1.5 md:p-2 rounded-full transition-colors ${
            canScrollRight
              ? "bg-black hover:bg-gray-800 text-white shadow-lg"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 md:w-4 md:h-4" />
        </button>

        {/* Categories container */}
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto space-x-2 sm:space-x-3 md:space-x-4 pb-2 px-6 sm:px-7 md:px-8 scrollbar-hide"
          onScroll={checkScrollButtons}
        >
          {displayCategories.map((category) => {
            const isAllCategory = category.name === "All";
            const isDealsCategory = category.name === "Deals";
            const isActive = activeCategory === category.id;
            const fullName = stripCategoryEmojis(category.name) || category.name;
            const displayName = getCategoryDisplayName(
              category.name,
              category.display_name
            );
            
            return (
              <div key={category.id || 'all'} className="flex flex-shrink-0 flex-col">
                {/* Main Category */}
                <div
                  className={cn(
                    "flex w-[4.75rem] sm:w-[5.5rem] md:w-24 flex-col items-center cursor-pointer",
                    isActive
                      ? "text-black"
                      : "text-black"
                  )}
                  title={fullName}
                  onClick={() =>
                    handleCategoryClick(
                      category.id,
                      isDealsCategory,
                      isDealsCategory ? "Deals" : category.name
                    )
                  }
                >
                  <div
                    className={cn(
                      "w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center p-1 sm:p-1.5 md:p-2 transition-colors duration-200 relative",
                      isActive
                        ? "bg-black"
                        : "bg-gray-100 group-hover:bg-gray-200"
                    )}
                  >
                    {(() => {
                      // Priority 1: Use backend image_url if available
                      if (category.image_url) {
                        return (
                          <LazyCategoryImage
                            src={normalizeImageUrl(category.image_url as string)}
                            alt={fullName}
                            root={scrollContainerRef.current}
                          />
                        );
                      }
                      
                      // Priority 2: Use local icon mapping
                      const localIconPath = getCategoryIconPath(category.name);
                      if (localIconPath) {
                        return (
                          <LazyCategoryImage
                            src={localIconPath}
                            alt={fullName}
                            root={scrollContainerRef.current}
                          />
                        );
                      }
                      
                      // Priority 3: Fallback to first 4 letters
                      return (
                        <span
                          className={cn(
                            "text-[8px] sm:text-[10px] md:text-xs text-center font-medium",
                            isActive
                              ? "text-white"
                              : "text-gray-700"
                          )}
                        >
                          {fullName.substring(0, 4)}
                        </span>
                      );
                    })()}
                  </div>
                  <p className={cn(
                    "mt-1 sm:mt-1.5 md:mt-2 w-full text-[10px] sm:text-[11px] md:text-xs text-center leading-tight break-words line-clamp-2 min-h-[2.5em]",
                    isActive ? "text-black font-bold" : "text-black font-medium"
                  )}>
                    {displayName}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Categories;
