"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getParentCategories } from "../lib/api";
import { Category } from "./Categories";

interface Props {
  onSelectCategory: (categoryId: number | null, isDeals?: boolean) => void;
  selectedCategoryId?: number | null;
}

const VerticalCategorySelector = ({ onSelectCategory, selectedCategoryId }: Props) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleCategoryClick = (categoryId: number | null, isDeals: boolean = false) => {
    console.log("🔍 VerticalCategorySelector - Category clicked:", { categoryId, isDeals });
    // Directly filter products by category
    onSelectCategory(categoryId, isDeals);
  };


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

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-600 mb-3">Categories</div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3 p-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-600 mb-3">Categories</div>
        <div className="text-xs text-red-500">Error loading categories</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-600 mb-3">Categories</div>
      <div className="max-h-80 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {displayCategories.map((category) => {
          const isAllCategory = category.name === "All";
          const isDealsCategory = category.name === "Deals";
          const isActive = (selectedCategoryId === null && isAllCategory) || 
                          (selectedCategoryId === -1 && isDealsCategory) ||
                          (selectedCategoryId === category.id && !isAllCategory && !isDealsCategory);

          return (
            <button
              key={category.id || 'all'}
              onClick={() => handleCategoryClick(isAllCategory ? null : category.id, isDealsCategory)}
              className={cn(
                "w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors duration-200",
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  isActive ? "bg-gray-200" : "bg-gray-100"
                )}
              >
                {category.image_url ? (
                  <Image
                    src={category.image_url as string}
                    alt={category.name}
                    width={20}
                    height={20}
                    style={{ objectFit: "contain" }}
                  />
                ) : isAllCategory ? (
                  <Image
                    src="/all_category_icon.png"
                    alt={category.name}
                    width={20}
                    height={20}
                    style={{ objectFit: "contain" }}
                  />
                ) : isDealsCategory ? (
                  <span
                    className={cn(
                      "text-xs font-bold",
                      isActive ? "text-gray-700" : "text-gray-500"
                    )}
                  >
                    🏷️
                  </span>
                ) : (
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isActive ? "text-gray-700" : "text-gray-500"
                    )}
                  >
                    {category.name.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium truncate flex-1",
                  isActive ? "text-gray-900" : "text-gray-600"
                )}
              >
                {category.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default VerticalCategorySelector;
