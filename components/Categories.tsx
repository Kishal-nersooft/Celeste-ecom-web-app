"use client";
import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getParentCategories } from "../lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCategory } from "../contexts/CategoryContext";

// New Category interface matching backend schema
export interface Category {
  id: number;
  name: string;
  sort_order: number;
  description?: string;
  image_url?: string;
  parent_category_id?: number;
  subcategories?: Category[];
}

interface Props {
  onSelectCategory: (categoryId: number | null, isDeals?: boolean) => void;
}

const Categories = ({ onSelectCategory }: Props) => {
  const pathname = usePathname();
  const { selectedCategoryId, isDealsSelected } = useCategory();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const fetchedCategories = await getParentCategories();
        setCategories(fetchedCategories);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, []);

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const handleCategoryClick = (categoryId: number | null, isDeals: boolean = false) => {
    // Directly select category without expansion
    onSelectCategory(categoryId, isDeals);
  };

  // Check scroll buttons on mount and when categories change
  useEffect(() => {
    checkScrollButtons();
  }, [categories]);

  // Determine active category based on context
  const activeCategory = isDealsSelected ? -1 : selectedCategoryId;

  // Create an "All" category option that will be shown first
  const allCategoryOption = {
    id: null,
    name: "All",
    sort_order: 0,
    description: "Show all products",
    image_url: "/all_category_icon.png"
  };

  // Create a "Deals" category option
  const dealsCategoryOption = {
    id: -1, // Use -1 to distinguish from real categories
    name: "Deals",
    sort_order: 1,
    description: "Show all discounted products",
    image_url: null
  };
  
  // Add "All" and "Deals" options at the beginning of categories
  const displayCategories = [allCategoryOption, dealsCategoryOption, ...categories];

  if (loading) return <div>Loading categories...</div>;
  if (error) return <div>Error: {error}</div>;

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const categoryWidth = 80; // Approximate width of each category + gap
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
      const categoryWidth = 80; // Approximate width of each category + gap
      scrollContainerRef.current.scrollBy({
        left: categoryWidth * 3, // Scroll by 3 categories at a time
        behavior: "smooth",
      });
      // Update button states after scroll
      setTimeout(checkScrollButtons, 300);
    }
  };


  return (
    <div className="py-4 px-4">
      <div className="relative">
        {/* Left scroll button */}
        <button
          onClick={scrollLeft}
          disabled={!canScrollLeft}
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-colors ${
            canScrollLeft
              ? "bg-black hover:bg-gray-800 text-white shadow-lg"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <ChevronLeft size={16} />
        </button>

        {/* Right scroll button */}
        <button
          onClick={scrollRight}
          disabled={!canScrollRight}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-colors ${
            canScrollRight
              ? "bg-black hover:bg-gray-800 text-white shadow-lg"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <ChevronRight size={16} />
        </button>

        {/* Categories container */}
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-hidden space-x-4 pb-2 px-8"
          onScroll={checkScrollButtons}
        >
          {displayCategories.map((category) => {
            const isAllCategory = category.name === "All";
            const isDealsCategory = category.name === "Deals";
            const isActive = activeCategory === category.id;
            
            return (
              <div key={category.id || 'all'} className="flex flex-col">
                {/* Main Category */}
                <div
                  className={cn(
                    "flex flex-col items-center cursor-pointer min-w-[80px]",
                    isActive
                      ? "text-black"
                      : "text-gray-500 hover:text-black"
                  )}
                  onClick={() => handleCategoryClick(category.id, isDealsCategory)}
                >
                  <div
                    className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center p-2 transition-colors duration-200 relative",
                      isActive
                        ? "bg-black"
                        : "bg-gray-100 group-hover:bg-gray-200"
                    )}
                  >
                    {category.image_url ? (
                      <Image
                        src={category.image_url as string}
                        alt={category.name}
                        width={40}
                        height={40}
                        style={{ objectFit: "contain" }}
                      />
                    ) : isAllCategory ? (
                      <Image
                        src="/all_category_icon.png"
                        alt={category.name}
                        width={40}
                        height={40}
                        style={{ objectFit: "contain" }}
                      />
                    ) : isDealsCategory ? (
                      <span
                        className={cn(
                          "text-lg",
                          isActive
                            ? "text-white"
                            : "text-gray-700"
                        )}
                      >
                        🏷️
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "text-xs text-center font-medium",
                          isActive
                            ? "text-white"
                            : "text-gray-700"
                        )}
                      >
                        {category.name.substring(0, 4)}
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    "mt-2 text-xs font-medium text-center line-clamp-1",
                    isActive ? "text-black" : "text-gray-500"
                  )}>
                    {category.name}
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
