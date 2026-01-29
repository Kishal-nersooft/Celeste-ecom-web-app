import React from "react";

const ProductCardSkeleton = () => {
  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100 flex flex-col h-[170px] sm:h-[190px] md:h-[210px] lg:h-[240px] w-full max-w-[140px] sm:max-w-[160px] md:max-w-[180px] relative animate-pulse">
      {/* Image skeleton - 65% height */}
      <div className="border-b border-gray-300 overflow-hidden relative h-[65%] bg-gray-200">
        {/* Discount tag skeleton (top left) */}
        <div className="absolute top-1 left-1 sm:top-2 sm:left-2 z-10">
          <div className="h-4 w-10 sm:h-5 sm:w-12 bg-gray-300 rounded-md"></div>
        </div>
        
        {/* Image placeholder */}
        <div className="w-full h-full bg-gray-300"></div>
        
        {/* Future pricing skeleton (bottom left) */}
        <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 z-10">
          <div className="h-3 w-12 sm:h-4 sm:w-16 bg-gray-300 rounded"></div>
        </div>
      </div>

      {/* Add to cart button skeleton - positioned at 65% from top */}
      <div className="absolute right-1 sm:right-2 top-[65%] transform -translate-y-1/2 z-20">
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-300 rounded-full"></div>
      </div>

      {/* Content skeleton - 35% height */}
      <div className="p-1.5 sm:p-2 flex flex-col gap-0 sm:gap-0.5 h-[35%] justify-between pr-6 sm:pr-8">
        {/* Price skeleton */}
        <div className="flex flex-col gap-0.5">
          <div className="h-4 sm:h-5 bg-gray-300 rounded w-16 sm:w-20"></div>
          <div className="h-3 sm:h-4 bg-gray-300 rounded w-12 sm:w-14 line-through opacity-50"></div>
        </div>

        {/* Brand skeleton */}
        <div className="h-2 sm:h-2.5 bg-gray-300 rounded w-16 sm:w-20"></div>

        {/* Name skeleton - 2 lines */}
        <div className="space-y-1">
          <div className="h-3 sm:h-3.5 bg-gray-300 rounded w-full"></div>
          <div className="h-3 sm:h-3.5 bg-gray-300 rounded w-4/5"></div>
        </div>
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
