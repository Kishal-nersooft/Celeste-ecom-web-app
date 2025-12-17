"use client";

import AddToCartButton from "@/components/AddToCartButton";
import Container from "@/components/Container";
import PriceView from "@/components/PriceView";
import SmartBackButton from "@/components/SmartBackButton";
import FuturePricingDisplay from "@/components/FuturePricingDisplay";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { useLocation } from "@/contexts/LocationContext";
import Image from "next/image";
import { notFound } from "next/navigation";
import React, { useEffect, useState } from "react";
import { FaRegQuestionCircle } from "react-icons/fa";
import { FiShare2 } from "react-icons/fi";
import { LuStar } from "react-icons/lu";
import { RxBorderSplit } from "react-icons/rx";
import { TbTruckDelivery } from "react-icons/tb";
import { Product } from "../../../../store";
import { getProductById, getProductsWithPricing } from "@/lib/api";
import Loader from "@/components/Loader";

const ProductPage = ({ params }: { params: { slug: string } }) => {
  const { user, loading: authLoading } = useAuth();
  const { defaultAddress, isLocationLoading } = useLocation();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { slug } = params;

  // Fetch product data (works with or without authentication)
  useEffect(() => {
    const fetchProduct = async () => {
      // Wait for auth to finish loading (but don't require user to be logged in)
      if (authLoading) return;
      
      // For location loading, only wait if user is logged in (non-logged-in users can view without location)
      if (user && isLocationLoading) return;

      try {
        console.log("🔍 ProductPage - Fetching product...");
        console.log("🔍 ProductPage - User authenticated:", !!user);
        console.log("🔍 ProductPage - Product slug:", slug);
        console.log("🔍 ProductPage - Default address:", defaultAddress);
        
        setLoading(true);
        setError(null);

        // Get latitude and longitude from default address (can be from localStorage for non-logged-in users)
        const latitude = defaultAddress?.latitude;
        const longitude = defaultAddress?.longitude;

        console.log("🔍 ProductPage - Using location:", { latitude, longitude });

        // Use latitude and longitude for proper inventory lookup (no store IDs)
        // If no location, fetch without location params (will show from all stores)
        const foundProduct = await getProductById(
          slug, // Product ID/slug
          undefined, // No store IDs - let backend determine based on location
          latitude, // User's latitude (or undefined if no location)
          longitude // User's longitude (or undefined if no location)
        );

        if (!foundProduct) {
          console.log("❌ ProductPage - Product not found:", slug);
          setError("Product not found");
          return;
        }

        console.log("✅ ProductPage - Found product:", {
          id: foundProduct.id,
          name: foundProduct.name,
          pricing: foundProduct.pricing
        });

        setProduct(foundProduct);
      } catch (error) {
        console.error("❌ ProductPage - Error fetching product:", error);
        setError("Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [user, authLoading, slug, defaultAddress, isLocationLoading]);

  // Debug logging when product is loaded
  useEffect(() => {
    if (product) {
      console.log("=== PRODUCT PAGE DEBUG ===");
      console.log("Product ID/Slug:", slug);
      console.log("Full Product Data:", JSON.stringify(product, null, 2));
      console.log("Pricing Data:", product?.pricing);
      console.log("Discount Applied:", product?.pricing?.discount_applied);
      console.log("Discount Percentage:", product?.pricing?.discount_percentage);
      console.log("Final Price:", product?.pricing?.final_price);
      console.log("Base Price:", product?.pricing?.base_price);
      console.log("Legacy Price:", product?.price);
      // console.log("Inventory Data:", product?.inventory); // Inventory not available in Product type
      console.log("Image URLs:", product?.image_urls);
      console.log("Product Name:", product?.name);
      console.log("Product Brand:", product?.brand);
      console.log("========================");
    }
  }, [product, slug]);

  // Handle loading and error states
  // Only wait for location loading if user is logged in
  if (authLoading || (user && isLocationLoading) || loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!product) {
    return notFound();
  }

  // Get the first valid image URL
  const imageUrl = product?.image_urls?.[0] || product?.imageUrl;
  const hasValidImage =
    imageUrl && imageUrl.trim() !== "" && imageUrl.startsWith("http");

  return (
    <div>
      {/* Back Button */}
      <Container className="py-2 sm:py-3 md:py-4">
        <SmartBackButton className="mb-2 sm:mb-3 md:mb-4" />
      </Container>

      <Container className="flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-8 lg:gap-10 py-2 sm:py-4 md:py-6 lg:py-8">
        {hasValidImage && (
          <div className="w-full md:w-1/2 h-auto border border-darkBlue/20 shadow-md rounded-md group overflow-hidden relative">
            {/* Discount Tag on Product Image */}
            {((product?.pricing?.discount_applied && product.pricing.discount_applied > 0) || 
              (product?.pricing?.discount_percentage && product.pricing.discount_percentage > 0)) && (
                <div className="absolute top-2 left-2 sm:top-3 sm:left-3 md:top-4 md:left-4 z-10">
                  <div className="bg-red-500 text-white text-xs sm:text-sm md:text-base lg:text-lg font-bold px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-md sm:rounded-lg shadow-lg">
                    {Math.round(product.pricing?.discount_percentage || 0)}% OFF
                  </div>
                </div>
              )}
            <Image
              src={imageUrl}
              alt={product.name || "Product image"}
              width={700}
              height={700}
              priority
              className="w-full max-h-[300px] sm:max-h-[400px] md:max-h-[500px] lg:max-h-[550px] group-hover:scale-110 hoverEffect rounded-md"
              style={{ objectFit: "cover" }}
            />
            {/* Future Pricing Display - Bottom left of image area */}
            <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 md:bottom-4 md:left-4 z-10">
              <FuturePricingDisplay product={product} textSize="md" />
            </div>
          </div>
        )}
        <div className="w-full md:w-1/2 flex flex-col gap-3 sm:gap-4 md:gap-5">
          <div>
            {/* Discount Tag for Product Page */}
            {((product?.pricing?.discount_applied && product.pricing.discount_applied > 0) || 
              (product?.pricing?.discount_percentage && product.pricing.discount_percentage > 0)) && (
                <div className="mb-4">
                  {/* <div className="bg-red-500 text-white text-lg font-bold px-4 py-2 rounded-lg inline-block shadow-lg">
                  🎉 {product.pricing.applied_discounts[0].discount_value}% OFF - Limited Time Offer!
                </div> */}
                </div>
              )}

            <p className="text-sm sm:text-base md:text-lg font-bold text-gray-800 mb-1 uppercase tracking-wide">
              {product?.brand}
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2">{product?.name}</p>
            <p className="text-xs sm:text-sm text-gray-500 mb-2">
              {product?.unit_measure || product?.unit}
            </p>
            {/* <div className="flex items-center gap-2">
              <div className="text-lightText flex items-center gap-.5 text-sm">
                {Array.from({ length: 5 }).map((_, index) => {
                  const isLastStar = index === 4;
                  return (
                    <LuStar
                      fill={!isLastStar ? "#fca99b" : "transparent"}
                      key={index}
                      className={`${isLastStar ? "text-gray-500" : "text-lightOrange"}`}
                    />
                  );
                })}
              </div>
              <p className="text-sm font-medium text-gray-500">{`(25 reviews)`}</p>
            </div> */}
          </div>
          {/* Debug Information - Remove this after debugging */}

          {/* Custom Price Display with Discount Styling */}
          {((product?.pricing?.discount_applied && product.pricing.discount_applied > 0) || 
            (product?.pricing?.discount_percentage && product.pricing.discount_percentage > 0)) ? (
            <div className="flex items-center gap-3">
              {/* Discount Percentage Badge */}
              {/* <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-bold">
                {product.pricing?.discount_percentage || 
                 product.pricing?.discount_applied || 
                 0}% OFF
              </span> */}

              {/* Final Price in Red Background - Bigger text for discounted products */}
              <div className="bg-red-500 text-white text-sm sm:text-base md:text-lg font-bold px-2 py-1 sm:px-3 sm:py-1.5 rounded-md">
                LKR{" "}
                {(
                  product?.pricing?.final_price ||
                  product?.base_price ||
                  product?.price ||
                  0
                ).toFixed(2)}
              </div>

              {/* Base Price with Strikethrough */}
              <div className="text-gray-500 text-xs sm:text-sm line-through">
                LKR {(product?.pricing?.base_price || 0).toFixed(2)}
              </div>
            </div>
          ) : (
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
              LKR{" "}
              {(
                product?.pricing?.final_price ||
                product?.base_price ||
                product?.price ||
                0
              ).toFixed(2)}
            </div>
          )}

          {/* Savings Amount Display */}
          {/* {((product?.pricing?.discount_applied && product.pricing.discount_applied > 0) || 
            (product?.pricing?.discount_percentage && product.pricing.discount_percentage > 0)) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-semibold">
                    💰 You Save:
                  </span>
                  <span className="text-green-700 font-bold text-lg">
                    LKR {((product.pricing?.base_price || 0) - (product.pricing?.final_price || 0)).toFixed(2)}
                  </span>
                  <span className="text-green-600 text-sm">
                    ({product.pricing?.discount_percentage || 
                      product.pricing?.discount_applied || 
                      0}% off)
                  </span>
                </div>
              </div>
            )} */}
          {/* Stock display removed as it's not in the new Product interface */}

          {/* <p className="text-base text-gray-800">
            <span className="bg-black text-white px-3 py-1 text-sm font-semibold rounded-md mr-2">
              20
            </span>{" "}
            People are viewing this right now
          </p> */}

          <p className="text-xs sm:text-sm text-gray-600 tracking-wide">
            {product?.description}
          </p>
          <AddToCartButton product={product} />
          <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2 md:gap-2.5 border-b border-b-gray-200 py-3 sm:py-4 md:py-5 -mt-2">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm text-black hover:text-red-600 hoverEffect">
              <RxBorderSplit className="text-sm sm:text-base md:text-lg" />
              <p>Compare color</p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm text-black hover:text-red-600 hoverEffect">
              <FaRegQuestionCircle className="text-sm sm:text-base md:text-lg" />
              <p>Ask a question</p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm text-black hover:text-red-600 hoverEffect">
              <TbTruckDelivery className="text-sm sm:text-base md:text-lg" />
              <p>Delivery & Return</p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm text-black hover:text-red-600 hoverEffect">
              <FiShare2 className="text-sm sm:text-base md:text-lg" />
              <p>Share</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 sm:gap-4 md:gap-5">
            <div className="w-full sm:w-auto sm:flex-1 border border-darkBlue/20 text-center p-2 sm:p-3 hover:border-darkBlue hoverEffect rounded-md">
              <p className="text-sm sm:text-base font-semibold text-black">
                Free Shipping
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                Free shipping over order Rs. 15,000
              </p>
            </div>
            <div className="w-full sm:w-auto sm:flex-1 border border-darkBlue/20 text-center p-2 sm:p-3 hover:border-darkBlue hoverEffect rounded-md">
              <p className="text-sm sm:text-base font-semibold text-black">
                Flexible Payment
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                Pay with Multiple Credit Cards
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default ProductPage;
