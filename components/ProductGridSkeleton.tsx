"use client";
import React from "react";
import ProductCardSkeleton from "./ProductCardSkeleton";

interface Props {
  count?: number;
}

const ProductGridSkeleton = ({ count = 12 }: Props) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
};

export default ProductGridSkeleton;
