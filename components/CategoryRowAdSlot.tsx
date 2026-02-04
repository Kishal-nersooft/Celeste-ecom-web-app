"use client";

import Image from "next/image";
import React from "react";

// Default ad image (local). Later replace with image URL from backend.
import defaultAdImage from "@/images/Celeste-Popup-advert.png";

interface CategoryRowAdSlotProps {
  /** Image URL from backend. Falls back to local default if not provided. */
  imageUrl?: string | null;
  /** Optional link when ad is clicked */
  linkUrl?: string | null;
  /** Accessible label for the ad */
  alt?: string;
  className?: string;
}

/**
 * Ad slot shown on the right of the first 2 category product rows (homepage, "All").
 * Height: from first category header (See All line) to bottom of second product row.
 * Width: ~56% on desktop (about double the previous size); hidden on mobile.
 */
const CategoryRowAdSlot = ({
  imageUrl,
  linkUrl,
  alt = "Advertisement",
  className = "",
}: CategoryRowAdSlotProps) => {
  const src = imageUrl ?? defaultAdImage;

  const content = (
    <div
      className={`
        relative w-full flex-1 min-h-0 overflow-hidden rounded-lg bg-gray-100
        ${className}
      `}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 0px, 20vw"
      />
    </div>
  );

  if (linkUrl) {
    return (
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block w-full"
      >
        {content}
      </a>
    );
  }

  return content;
};

export default CategoryRowAdSlot;
