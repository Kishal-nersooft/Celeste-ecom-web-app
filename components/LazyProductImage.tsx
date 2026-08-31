"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";

interface LazyProductImageProps {
  src: string;
  alt: string;
  /** Horizontal scroll container; defers load until the card is near the viewport. */
  scrollRoot?: HTMLDivElement | null;
  className?: string;
}

/**
 * Loads a product image only when its card intersects the scroll container
 * (or the page viewport when no scroll root is provided).
 */
const LazyProductImage: React.FC<LazyProductImageProps> = ({
  src,
  alt,
  scrollRoot,
  className,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        root: scrollRoot ?? null,
        rootMargin: "80px",
        threshold: 0.01,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollRoot]);

  return (
    <div ref={ref} className="w-full h-full">
      {isVisible ? (
        <Image
          src={src}
          alt={alt}
          width={200}
          height={200}
          loading="lazy"
          sizes="(max-width: 640px) 140px, (max-width: 768px) 160px, (max-width: 1024px) 180px, 200px"
          className={className}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="w-full h-full bg-gray-200 animate-pulse" />
      )}
    </div>
  );
};

export default LazyProductImage;
