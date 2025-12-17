"use client";

import React from "react";

/**
 * SearchSkeleton - Loading skeleton component for search results
 * This component provides a loading placeholder while search results are being fetched
 */
const SearchSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  );
};

export default SearchSkeleton;
