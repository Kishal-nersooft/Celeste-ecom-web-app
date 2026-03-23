"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { Category } from "./Categories";
import Image from "next/image";

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
  const normalizeImageUrl = (url: string): string => {
    // Normalize Google Drive image links to the "drive.google.com/uc?export=view&id=..."
    // format so they work with Next's image loader.
    try {
      const u = new URL(url);
      const id = u.searchParams.get("id");

      if (!id) return url;

      // If it's already drive.google.com/uc, just ensure export=view.
      if (u.hostname === "drive.google.com") {
        // Most inputs are: /uc?export=view&id=...
        return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(
          id
        )}`;
      }

      // If it's drive.usercontent.google.com/download?...id=..., convert back.
      if (u.hostname === "drive.usercontent.google.com") {
        return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(
          id
        )}`;
      }
    } catch {
      // ignore parsing errors
    }
    return url;
  };

  const getSubcategoryImageUrl = (subcategory: any): string | null => {
    if (!subcategory) return null;

    const candidates: Array<any> = [
      subcategory.image_url,
      subcategory.imageUrl,
      subcategory.image,
      // Some backends use different naming for web/mobile variants
      subcategory.image_url_web,
      subcategory.image_url_mobile,
    ];

    for (const c of candidates) {
      if (typeof c === "string" && c.trim().length > 0)
        return normalizeImageUrl(c);
    }

    const arrayKeys = [
      "image_urls",
      "imageUrls",
      "image_urls_web",
      "image_urls_mobile",
    ];

    for (const key of arrayKeys) {
      const arr = subcategory?.[key];
      if (!Array.isArray(arr) || arr.length === 0) continue;

      const first = arr[0];
      if (typeof first === "string" && first.trim().length > 0) return first;
      if (first && typeof first === "object") {
        const objCandidates = [
          (first as any).image_url,
          (first as any).imageUrl,
          (first as any).url,
          (first as any).image,
        ];
        for (const oc of objCandidates) {
          if (typeof oc === "string" && oc.trim().length > 0)
            return normalizeImageUrl(oc);
        }
      }
    }

    return null;
  };

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
            const imageUrl = getSubcategoryImageUrl(subcategory);
            
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
                {/* Circular Subcategory Image */}
                <div
                  className={cn(
                    "relative w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-medium mb-1 flex-shrink-0 overflow-hidden",
                    isActive
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  )}
                >
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={subcategory.name}
                      fill
                      sizes="(max-width: 768px) 24px, (max-width: 1024px) 28px, 32px"
                      className="rounded-full object-contain"
                      style={{ objectFit: "contain" }}
                      priority={false}
                    />
                  ) : (
                    subcategory.name.charAt(0).toUpperCase()
                  )}
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
