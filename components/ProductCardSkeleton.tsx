import React from "react";

const ProductCardSkeleton = () => {
  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100 flex flex-col h-[240px] w-full max-w-[180px] animate-pulse">
      {/* Image skeleton */}
      <div className="border-b border-gray-300 overflow-hidden relative h-1/2 bg-gray-200">
        <div className="w-full h-full bg-gray-300"></div>
      </div>

      {/* Content skeleton */}
      <div className="p-2 flex flex-col gap-1 h-1/2 justify-between pr-8">
        {/* Price skeleton */}
        <div className="flex flex-col gap-1">
          <div className="h-3 bg-gray-300 rounded w-16"></div>
          <div className="h-2 bg-gray-300 rounded w-12"></div>
        </div>

        {/* Brand skeleton */}
        <div className="h-2 bg-gray-300 rounded w-20"></div>

        {/* Name skeleton */}
        <div className="h-4 bg-gray-300 rounded w-full"></div>

        {/* Unit skeleton */}
        <div className="h-2 bg-gray-300 rounded w-14"></div>
      </div>

      {/* Add to cart button skeleton */}
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
