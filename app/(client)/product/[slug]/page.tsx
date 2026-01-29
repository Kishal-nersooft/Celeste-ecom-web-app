"use client";

import AddToCartButton from "@/components/AddToCartButton";
import Container from "@/components/Container";
import PriceView from "@/components/PriceView";
import FuturePricingDisplay from "@/components/FuturePricingDisplay";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { useLocation } from "@/contexts/LocationContext";
import Image from "next/image";
import { notFound } from "next/navigation";
import React, { useEffect, useState } from "react";
import { LuStar } from "react-icons/lu";
import { FaEdit } from "react-icons/fa";
import { FaArrowRight } from "react-icons/fa";
import { Product } from "../../../../store";
import { getProductById, getProductsWithPricing, getParentCategoryFromSubcategory, getCategories } from "@/lib/api";
import ProductPageSkeleton from "@/components/ProductPageSkeleton";
import Breadcrumb from "@/components/Breadcrumb";
import SimilarProductsSection from "@/components/SimilarProductsSection";
import RecentItemsSection from "@/components/RecentItemsSection";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ProductPage = ({ params }: { params: { slug: string } }) => {
  const { user, loading: authLoading } = useAuth();
  const { defaultAddress, isLocationLoading } = useLocation();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [breadcrumbItems, setBreadcrumbItems] = useState<{ label: string; href?: string }[]>([]);
  
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

        // Build breadcrumb from product's category data
        if (foundProduct) {
          try {
            const breadcrumbs: { label: string; href?: string }[] = [];
            
            // If product has subcategory ID, get parent category and subcategory
            if (foundProduct.ecommerce_subcategory_id) {
              try {
                // Get parent category from subcategory
                const parentCategory = await getParentCategoryFromSubcategory(foundProduct.ecommerce_subcategory_id);
                breadcrumbs.push({
                  label: parentCategory.name,
                  href: `/categories/${parentCategory.id}`
                });
                
                // Get subcategory details
                const allCategories = await getCategories(true, false);
                const subcategory = allCategories.find((cat: any) => cat.id === foundProduct.ecommerce_subcategory_id);
                if (subcategory) {
                  breadcrumbs.push({
                    label: subcategory.name,
                    href: `/categories/${subcategory.id}`
                  });
                }
              } catch (error) {
                console.error("Error fetching category data:", error);
                // If subcategory fetch fails, try to get parent category directly
                if (foundProduct.ecommerce_category_id) {
                  const allCategories = await getCategories(true, false);
                  const category = allCategories.find((cat: any) => cat.id === foundProduct.ecommerce_category_id);
                  if (category) {
                    breadcrumbs.push({
                      label: category.name,
                      href: `/categories/${category.id}`
                    });
                  }
                }
              }
            } else if (foundProduct.ecommerce_category_id) {
              // If only parent category ID is available (no subcategory)
              const allCategories = await getCategories(true, false);
              const category = allCategories.find((cat: any) => cat.id === foundProduct.ecommerce_category_id);
              if (category) {
                breadcrumbs.push({
                  label: category.name,
                  href: `/categories/${category.id}`
                });
              }
            }
            
            // Add product name as last item (no href)
            breadcrumbs.push({
              label: foundProduct.name
            });
            
            setBreadcrumbItems(breadcrumbs);
          } catch (error) {
            console.error("Error building breadcrumb:", error);
            // Set product name only if breadcrumb fetch fails
            setBreadcrumbItems([{ label: foundProduct.name }]);
          }
        }
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
    return <ProductPageSkeleton />;
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
      {/* Breadcrumb Navigation */}
      {breadcrumbItems.length > 0 && (
        <Container className="py-2 sm:py-3 md:py-4">
          <Breadcrumb items={breadcrumbItems} className="mb-2 sm:mb-3 md:mb-4" />
        </Container>
      )}

      <Container className="flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-8 lg:gap-10 py-2 sm:py-4 md:py-6 lg:py-8">
        {hasValidImage && (
          <div className="w-full md:w-1/2 h-auto border border-darkBlue/20 shadow-md rounded-md group overflow-hidden relative">
            {/* Discount Tag on Product Image */}
            {(() => {
              const discountPercentage = product?.pricing?.discount_percentage || 0;
              const discountApplied = product?.pricing?.discount_applied || 0;
              const hasDiscount = discountPercentage > 0 || discountApplied > 0;
              const displayPercentage = discountPercentage > 0 ? discountPercentage : discountApplied;
              
              return hasDiscount && displayPercentage > 0 ? (
                <div className="absolute top-2 left-2 sm:top-3 sm:left-3 md:top-4 md:left-4 z-10">
                  <div className="bg-red-500 text-white text-xs sm:text-sm md:text-base lg:text-lg font-bold px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-md sm:rounded-lg shadow-lg">
                    {Math.round(displayPercentage)}% OFF
                  </div>
                </div>
              ) : null;
            })()}
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
            {/* Discount Tag for Product Page - Only show if there's an actual discount */}
            {(() => {
              const discountPercentage = product?.pricing?.discount_percentage || 0;
              const discountApplied = product?.pricing?.discount_applied || 0;
              const hasDiscount = discountPercentage > 0 || discountApplied > 0;
              
              return hasDiscount ? (
                <div className="mb-4">
                  {/* <div className="bg-red-500 text-white text-lg font-bold px-4 py-2 rounded-lg inline-block shadow-lg">
                  🎉 {product.pricing.applied_discounts[0].discount_value}% OFF - Limited Time Offer!
                </div> */}
                </div>
              ) : null;
            })()}

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
          {(() => {
            const discountPercentage = product?.pricing?.discount_percentage || 0;
            const discountApplied = product?.pricing?.discount_applied || 0;
            return discountPercentage > 0 || discountApplied > 0;
          })() ? (
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
          
          {/* Add note or edit replacement button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-auto border border-darkBlue/20 hover:border-darkBlue hoverEffect justify-between h-auto py-2 px-3"
              >
                <div className="flex items-center justify-start flex-1">
                  <FaEdit className="text-xs sm:text-sm mr-2 flex-shrink-0" />
                  <div className="flex flex-col items-start text-left">
                    <span className="text-xs sm:text-sm">Add note or edit replacement</span>
                    <span className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Replace only with my approval</span>
                  </div>
                </div>
                <FaArrowRight className="text-xs sm:text-sm ml-2 flex-shrink-0" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-left">Replacement Note</DialogTitle>
              </DialogHeader>
              <div className="py-4 text-left">
                <p className="text-sm sm:text-base text-gray-700 font-medium mb-2">
                  Add note or edit replacement
                </p>
                <p className="text-xs sm:text-sm text-gray-500">
                  Replace only with my approval
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Container>

      {/* Similar Products Section */}
      {product?.id && (
        <Container>
          <SimilarProductsSection productId={product.id} />
        </Container>
      )}

      {/* Recently Bought Products Section */}
      <Container>
        <RecentItemsSection />
      </Container>
    </div>
  );
};

export default ProductPage;
