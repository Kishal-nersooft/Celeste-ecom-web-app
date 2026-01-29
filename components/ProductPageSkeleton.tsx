import React from "react";
import Container from "./Container";

const ProductPageSkeleton = () => {
  return (
    <div className="animate-pulse">
      {/* Breadcrumb Skeleton */}
      <Container className="py-2 sm:py-3 md:py-4">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
          <div className="h-4 w-16 bg-gray-200 rounded"></div>
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
          <div className="h-4 w-20 bg-gray-200 rounded"></div>
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
        </div>
      </Container>

      <Container className="flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-8 lg:gap-10 py-2 sm:py-4 md:py-6 lg:py-8">
        {/* Image Skeleton */}
        <div className="w-full md:w-1/2">
          <div className="border border-darkBlue/20 shadow-md rounded-md overflow-hidden bg-gray-100 relative">
            {/* Discount Tag Skeleton (top left) */}
            <div className="absolute top-2 left-2 sm:top-3 sm:left-3 md:top-4 md:left-4 z-10">
              <div className="h-6 w-16 sm:h-7 sm:w-20 md:h-8 md:w-24 bg-gray-300 rounded-md"></div>
            </div>
            
            {/* Image */}
            <div className="w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[550px] bg-gray-300"></div>
            
            {/* Future Pricing Skeleton (bottom left) */}
            <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 md:bottom-4 md:left-4 z-10">
              <div className="h-5 w-20 sm:h-6 sm:w-24 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="w-full md:w-1/2 flex flex-col gap-3 sm:gap-4 md:gap-5">
          {/* Brand Skeleton */}
          <div className="h-4 sm:h-5 md:h-6 bg-gray-200 rounded w-24 mb-1"></div>
          
          {/* Product Name Skeleton */}
          <div className="space-y-2">
            <div className="h-7 sm:h-9 md:h-11 lg:h-12 bg-gray-200 rounded w-3/4"></div>
            <div className="h-6 sm:h-7 md:h-8 bg-gray-200 rounded w-1/2"></div>
          </div>

          {/* Unit Skeleton */}
          <div className="h-3 sm:h-4 bg-gray-200 rounded w-20"></div>

          {/* Price Skeleton */}
          <div className="flex items-center gap-3">
            <div className="h-8 sm:h-10 md:h-12 bg-gray-200 rounded w-32 sm:w-36 md:w-40"></div>
            <div className="h-4 sm:h-5 bg-gray-200 rounded w-24 line-through"></div>
          </div>

          {/* Description Skeleton */}
          <div className="space-y-2 mt-2">
            <div className="h-3 sm:h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-3 sm:h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 sm:h-4 bg-gray-200 rounded w-4/6"></div>
          </div>

          {/* Add to Cart Button Skeleton */}
          <div className="h-12 sm:h-14 bg-gray-200 rounded-md w-full"></div>

          {/* Replacement Note Button Skeleton */}
          <div className="h-14 sm:h-16 md:h-20 bg-gray-200 rounded-md w-full border border-gray-300"></div>
        </div>
      </Container>
    </div>
  );
};

export default ProductPageSkeleton;

