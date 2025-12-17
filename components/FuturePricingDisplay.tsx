"use client";

import React, { useEffect, useState } from "react";
import { Product } from "../store";

interface FuturePricingDisplayProps {
  product: Product;
  className?: string;
  textSize?: "sm" | "md" | "lg";
}

const FuturePricingDisplay: React.FC<FuturePricingDisplayProps> = ({
  product,
  className = "",
  textSize = "sm",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Get valid future pricing items
  const futurePricingItems = React.useMemo(() => {
    if (!product?.future_pricing || !Array.isArray(product.future_pricing)) {
      return [];
    }
    return product.future_pricing.filter(
      (item) =>
        item &&
        item.min_quantity > 0 &&
        item.final_price >= 0 &&
        item.discount_percentage >= 0
    );
  }, [product?.future_pricing]);

  // Auto-cycle through pricing tiers every 5 seconds
  useEffect(() => {
    if (futurePricingItems.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % futurePricingItems.length);
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [futurePricingItems.length]);

  // Don't render if no valid future pricing
  if (futurePricingItems.length === 0) {
    return null;
  }

  const currentPricing = futurePricingItems[currentIndex];
  const textSizeClasses = {
    sm: "text-[8px] sm:text-[9px] md:text-[10px]",
    md: "text-xs sm:text-sm",
    lg: "text-sm sm:text-base",
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ minHeight: "1.5em" }}
    >
      <div
        key={currentIndex}
        className={`${textSizeClasses[textSize]} font-semibold text-white bg-black/70 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded animate-slide-up`}
      >
        Buy {currentPricing.min_quantity} for LKR{" "}
        {currentPricing.final_price.toFixed(2)}
      </div>
    </div>
  );
};

export default FuturePricingDisplay;

