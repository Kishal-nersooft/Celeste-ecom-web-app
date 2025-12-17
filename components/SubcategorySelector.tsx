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
  // Function to split long names intelligently
  const formatName = (name: string, maxLength: number = 10) => {
    if (name.length <= maxLength) return name;
    
    // Try to split on common delimiters first
    const splitChars = [' & ', ' &', '& ', ' - ', ' -', '- '];
    for (const splitChar of splitChars) {
      if (name.includes(splitChar)) {
        const parts = name.split(splitChar);
        return parts.filter(p => p.trim().length > 0).join('\n');
      }
    }
    
    // Split on space if name is too long
    const words = name.split(' ');
    if (words.length > 1) {
      const midPoint = Math.floor(words.length / 2);
      const firstLine = words.slice(0, midPoint).join(' ');
      const secondLine = words.slice(midPoint).join(' ');
      return `${firstLine}\n${secondLine}`;
    }
    
    return name;
  };

  return (
    <div className="w-20 sm:w-24 md:w-32 bg-white border-r border-gray-200 flex flex-col">
      {/* Subcategories List - Vertical scroll on all screen sizes */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-1 sm:p-2 space-y-1">
          {/* All Subcategories in original order */}
          {subcategories.map((subcategory) => {
            const isActive = selectedSubcategoryId === subcategory.id;
            const formattedName = formatName(subcategory.name);
            const lines = formattedName.split('\n');
            
            return (
              <div
                key={subcategory.id}
                className={cn(
                  "flex flex-col items-center p-1 sm:p-1.5 rounded-lg cursor-pointer transition-colors",
                  isActive
                    ? "bg-green-50 border-l-4 border-green-500"
                    : "hover:bg-gray-50"
                )}
                onClick={() => onSelectSubcategory(subcategory.id)}
              >
                {/* Circular Image Placeholder */}
                <div
                  className={cn(
                    "w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-medium mb-1 flex-shrink-0",
                    isActive
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  )}
                >
                  {subcategory.name.charAt(0).toUpperCase()}
                </div>
                
                {/* Subcategory Name - Small text under the circle, split into lines */}
                <div className="text-center w-full px-0.5">
                  {lines.map((line, index) => (
                    <span
                      key={index}
                      className={cn(
                        "text-[8px] sm:text-[9px] md:text-[10px] font-medium block leading-tight",
                        isActive ? "text-green-700" : "text-gray-700"
                      )}
                    >
                      {line.length > 8 ? line.substring(0, 8) + '...' : line}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SubcategorySelector;
