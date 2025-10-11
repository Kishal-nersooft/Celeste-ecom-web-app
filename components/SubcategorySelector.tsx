"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { Category } from "./Categories";

interface Props {
  subcategories: Category[];
  selectedSubcategoryId: number | null;
  onSelectSubcategory: (subcategoryId: number | null) => void;
  parentCategoryName: string;
  currentSubcategoryId: number;
}

const SubcategorySelector = ({ 
  subcategories, 
  selectedSubcategoryId, 
  onSelectSubcategory,
  parentCategoryName,
  currentSubcategoryId
}: Props) => {
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">
          {parentCategoryName}
        </h2>
      </div>
      
      {/* Subcategories List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {/* All Subcategories in original order */}
          {subcategories.map((subcategory) => {
            const isActive = selectedSubcategoryId === subcategory.id;
            
            return (
              <div
                key={subcategory.id}
                className={cn(
                  "flex items-center p-3 rounded-lg cursor-pointer transition-colors",
                  isActive
                    ? "bg-green-50 border-l-4 border-green-500"
                    : "hover:bg-gray-50"
                )}
                onClick={() => onSelectSubcategory(subcategory.id)}
              >
                {/* Circular Image Placeholder */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mr-3 flex-shrink-0",
                    isActive
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  )}
                >
                  {subcategory.name.charAt(0).toUpperCase()}
                </div>
                
                {/* Subcategory Name */}
                <span
                  className={cn(
                    "text-sm font-medium truncate",
                    isActive ? "text-green-700" : "text-gray-700"
                  )}
                >
                  {subcategory.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SubcategorySelector;
