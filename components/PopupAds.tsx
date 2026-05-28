"use client";

import React, { useState, useEffect, useCallback } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActivePromotions, Promotion } from "@/lib/api";

interface PopupAdsProps {
  imageUrl?: string; // Optional fallback image URL
  delay?: number; // Delay in milliseconds before showing popup
  productId?: number | null; // Optional product ID for targeted promotions
  categoryId?: number | null; // Optional category ID for targeted promotions
}

const PopupAds: React.FC<PopupAdsProps> = ({ 
  imageUrl, 
  delay = 5000, // Default 5 seconds
  productId,
  categoryId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPromotion, setHasPromotion] = useState(false);
  // Keep the last promotion image base URL so we can retry alternate Google Drive URL formats.
  const [promotionBaseUrl, setPromotionBaseUrl] = useState<string | null>(null);

  const extractGoogleDriveFileId = useCallback((url: string): string | null => {
    const fromPath = url.match(/\/d\/([a-zA-Z0-9_-]+)(?:\/|$|\?)/);
    if (fromPath) return fromPath[1];
    try {
      const u = new URL(url);
      if (!u.hostname.endsWith("drive.google.com")) return null;
      const id = u.searchParams.get("id");
      if (id && /^[a-zA-Z0-9_-]+$/.test(id)) return id;
    } catch {
      const q = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (q) return q[1];
    }
    return null;
  }, []);

  // Get image URL - supports local paths and Google Drive (Drive often 403s hotlinked drive.google.com URLs).
  const getImageUrl = useCallback(
    (url: string, retry: number = 0): string => {
      if (url.startsWith("/")) {
        return url;
      }

      const fileId = extractGoogleDriveFileId(url);
      if (!fileId) {
        return url;
      }

      // Prefer lh3 / usercontent first; drive.google.com/uc often returns 403 for cross-site <img>.
      switch (retry) {
        case 0:
          return `https://lh3.googleusercontent.com/d/${fileId}`;
        case 1:
          return `https://drive.usercontent.google.com/uc?export=view&id=${fileId}`;
        case 2:
          return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920`;
        case 3:
          return `https://drive.google.com/uc?export=view&id=${fileId}`;
        case 4:
          return `https://drive.google.com/uc?export=download&id=${fileId}`;
        default:
          return `https://lh3.googleusercontent.com/d/${fileId}`;
      }
    },
    [extractGoogleDriveFileId]
  );

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleImageError = () => {
    // If we have a promotion with multiple images, try the next one
    if (promotion) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const imageUrls = isMobile 
        ? promotion.image_urls_mobile 
        : promotion.image_urls_web;
      
      // Try next image in the array
      const currentIndex = imageUrls?.indexOf(currentImageUrl) ?? -1;
      if (imageUrls && currentIndex >= 0 && currentIndex < imageUrls.length - 1) {
        setCurrentImageUrl(imageUrls[currentIndex + 1]);
        return;
      }
      
      // If no more images in current array, try fallback array
      const fallbackUrls = isMobile ? promotion.image_urls_web : promotion.image_urls_mobile;
      if (fallbackUrls && fallbackUrls.length > 0) {
        setCurrentImageUrl(fallbackUrls[0]);
        return;
      }
    }
    
    // If it's a local path, don't retry - just show error
    if (currentImageUrl && currentImageUrl.startsWith('/')) {
      console.error("Failed to load popup ad image from local path:", currentImageUrl);
      setImageError(true);
      return;
    }
    
    // For Google Drive URLs or fallback imageUrl, try different formats
    const base = promotionBaseUrl || imageUrl || null;
    if (base && retryCount < 4) {
      // Try next URL format (matches getImageUrl cases 0–4)
      const nextRetry = retryCount + 1;
      setRetryCount(nextRetry);
      setCurrentImageUrl(getImageUrl(base, nextRetry));
    } else {
      // All retry attempts failed
      console.error("Failed to load popup ad image after multiple attempts");
      setImageError(true);
    }
  };

  // Fetch promotions from API - always fetch fresh data on mount
  useEffect(() => {
    const fetchPromotion = async () => {
      setIsLoading(true);
      setImageError(false);
      setCurrentImageUrl(''); // Clear previous image URL
      
      try {
        // Only send productId and categoryId if they are provided
        const options: { productId?: number | null; categoryId?: number | null } = {};
        if (productId !== undefined && productId !== null) {
          options.productId = productId;
        }
        if (categoryId !== undefined && categoryId !== null) {
          options.categoryId = categoryId;
        }
        
        // Always fetch fresh promotions from backend (backend sends random promotion)
        const promotions = await getActivePromotions('popup', options);

        if (promotions && promotions.length > 0) {
          const activePromotion = promotions[0];
          setPromotion(activePromotion);
          setHasPromotion(true);
          
          // Determine which image URL to use based on device
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
          const imageUrls = isMobile 
            ? activePromotion.image_urls_mobile 
            : activePromotion.image_urls_web;
          
          
          if (imageUrls && imageUrls.length > 0 && imageUrls[0]) {
            // Use the image URL directly from the API response
            const rawUrl = imageUrls[0];
            setPromotionBaseUrl(rawUrl);
            setRetryCount(0);
            const selectedImageUrl = getImageUrl(rawUrl, 0);
            setCurrentImageUrl(selectedImageUrl);
          } else {
            // Fallback to web images if mobile images not available
            const fallbackUrls = activePromotion.image_urls_web;
            if (fallbackUrls && fallbackUrls.length > 0 && fallbackUrls[0]) {
              const rawFallbackUrl = fallbackUrls[0];
              setPromotionBaseUrl(rawFallbackUrl);
              setRetryCount(0);
              const fallbackUrl = getImageUrl(rawFallbackUrl, 0);
              setCurrentImageUrl(fallbackUrl);
            } else {
              console.error('❌ No valid image URLs in promotion:', activePromotion);
              setImageError(true);
            }
          }
        } else {
          // No promotions from API, use fallback imageUrl if provided
          setHasPromotion(false);
          setPromotionBaseUrl(null);
          if (imageUrl) {
            setRetryCount(0);
            setCurrentImageUrl(getImageUrl(imageUrl, 0));
          } else {
            setImageError(true);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching promotions:', error);
        // On error, use fallback imageUrl if provided
        setHasPromotion(false);
        setPromotionBaseUrl(null);
        if (imageUrl) {
          setRetryCount(0);
          setCurrentImageUrl(getImageUrl(imageUrl, 0));
        } else {
          setImageError(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Always fetch fresh random promotion from backend when component mounts
    // Empty deps array ensures we fetch fresh data every time user visits homepage
    // Backend sends random promotion, so each visit gets a different random image
    fetchPromotion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Fetch fresh random promotion on every mount (homepage visit)

  useEffect(() => {
    // Reset state when component mounts to ensure popup shows on every visit
    setIsOpen(false);
    setImageError(false);
    setRetryCount(0);
    
    // Only set timer if we have an image URL (from API or fallback)
    if (currentImageUrl && !isLoading) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, delay);

      // Cleanup timer on unmount
      return () => clearTimeout(timer);
    }
  }, [delay, currentImageUrl, isLoading]);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <DialogPrimitive.Portal>
        {/* Overlay with smooth fade animation */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:duration-300 data-[state=open]:duration-300"
          )}
          onClick={handleClose}
        />
        
        {/* Centered Card/Modal Content - Size adapts to image dimensions with proportional scaling */}
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-[101]",
            "w-auto max-w-[85vw] sm:max-w-[70vw] md:max-w-[600px] h-auto",
            "translate-x-[-50%] translate-y-[-50%]",
            "bg-transparent",
            "shadow-2xl",
            "p-0 border-0",
            "overflow-visible",
            "scale-75 sm:scale-80 md:scale-90", // Proportionally scale down: 75% mobile, 80% tablet, 90% desktop
            "transition-all duration-500 ease-out",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
          )}
          onInteractOutside={(e) => {
            // Allow closing on overlay click
            handleClose();
          }}
        >
          {/* Accessibility: Hidden Title and Description */}
          <DialogPrimitive.Title className="sr-only">
            Promotional Advertisement
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            A promotional advertisement popup. Click outside or use the close button to dismiss.
          </DialogPrimitive.Description>

          <div className="relative inline-block">
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute -top-2 -right-2 z-50 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm p-1.5 sm:p-2 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Close popup"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </button>

            {/* Image Container - Size adapts to image dimensions */}
            <div 
              className="relative cursor-default"
              onClick={(e) => {
                // Prevent closing when clicking on image
                e.stopPropagation();
              }}
            >
              {isLoading ? (
                <div className="w-64 h-64 flex items-center justify-center bg-gray-50 rounded-2xl">
                  <div className="animate-pulse text-gray-400">Loading promotion...</div>
                </div>
              ) : !imageError && currentImageUrl ? (
                <img
                  key={currentImageUrl}
                  src={currentImageUrl}
                  alt="Promotional advertisement"
                  className="block w-auto h-auto max-w-[85vw] sm:max-w-[70vw] md:max-w-[600px] max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                  onError={(e) => {
                    console.error("❌ Image load error:", currentImageUrl);
                    console.error("Image element:", e.target);
                    handleImageError();
                  }}
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement;
                  }}
                  loading="eager"
                />
              ) : imageError ? (
                <div className="w-64 h-64 flex flex-col items-center justify-center bg-gray-100 rounded-2xl p-4">
                  <p className="text-gray-500 text-sm text-center mb-2">
                    {hasPromotion ? "Promotion image failed to load." : "No active promotions available."}
                  </p>
                  {hasPromotion && promotion && (
                    <div className="text-gray-400 text-xs text-center space-y-1">
                      <p>Promotion ID: {promotion.id}</p>
                      <p>Web URLs: {promotion.image_urls_web?.length || 0}</p>
                      <p>Mobile URLs: {promotion.image_urls_mobile?.length || 0}</p>
                      <p className="text-xs break-all mt-2">URL: {currentImageUrl}</p>
                    </div>
                  )}
                  {!hasPromotion && imageUrl && (
                    <p className="text-gray-400 text-xs text-center">
                      Fallback path: {imageUrl}
                    </p>
                  )}
                </div>
              ) : (
                <div className="w-64 h-64 flex items-center justify-center bg-gray-50 rounded-2xl">
                  <div className="animate-pulse text-gray-400">Loading image...</div>
                </div>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default PopupAds;

