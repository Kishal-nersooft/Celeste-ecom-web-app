"use client";
import React, { useRef, useState, useEffect, ReactNode } from "react";
import ProductCardSkeleton from "./ProductCardSkeleton";

interface LazyMountProps {
  children: ReactNode;
  /** Pixels before the element enters the viewport to start mounting */
  rootMargin?: string;
  /** Number of skeleton cards to show as placeholder */
  skeletonCount?: number;
}

/**
 * Defers mounting its children until the placeholder scrolls near the viewport.
 * Shows skeleton product cards as the placeholder so layout doesn't shift.
 */
const LazyMount: React.FC<LazyMountProps> = ({
  children,
  rootMargin = "200px",
  skeletonCount = 6,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  if (mounted) return <>{children}</>;

  return (
    <div ref={ref} className="mb-4 sm:mb-6 md:mb-8">
      <div className="flex gap-2 sm:gap-2.5 md:gap-3 overflow-hidden pb-4">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px]"
          >
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LazyMount;
