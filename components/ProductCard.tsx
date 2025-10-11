import Image from "next/image";
import React, { memo, useMemo } from "react";
import { LuStar } from "react-icons/lu";
// import ProductCartBar from "./ProductCartBar";
import PriceView from "./PriceView";
import Link from "next/link";
import AddToCartButton from "./AddToCartButton";
import { Product } from "../store";
import { useCategory } from "../contexts/CategoryContext";
// Removed discount-utils import - using direct pricing data instead

const ProductCard = memo(({ product }: { product: Product }) => {
  const { selectedCategoryId, isDealsSelected, setLastVisitedCategory } =
    useCategory();

  // Safety check for invalid product
  if (!product || !product.id || !product.name) {
    console.error("ProductCard: Invalid product received:", product);
    return null;
  }

  // Memoize expensive calculations
  const isDiscounted = useMemo(() => {
    return (
      product.pricing &&
      product.pricing.discount_applied !== null &&
      product.pricing.discount_applied !== undefined &&
      product.pricing.discount_applied > 0
    );
  }, [product.pricing]);

  // Simplified debug - only log if there's an issue
  if (!product.pricing && product.id) {
    console.warn(`⚠️ Product ${product.id} missing pricing data`);
  } else if (
    product.pricing &&
    product.pricing.discount_applied > 0 &&
    !isDiscounted
  ) {
    console.error(
      `❌ Discount detection failed for product ${product.id}:`,
      product.pricing
    );
  }

  const discountInfo = useMemo(() => {
    return isDiscounted
      ? {
          percentage: Math.round(product.pricing?.discount_percentage || 0),
          priceList: product.pricing?.applied_price_lists?.[0] || "discount",
          isKnown: true,
        }
      : {
          percentage: 0,
          priceList: "",
          isKnown: false,
        };
  }, [isDiscounted, product.pricing]);

  // Get the first valid image URL
  const imageUrl = useMemo(() => {
    return product?.image_urls?.[0] || product?.imageUrl;
  }, [product?.image_urls, product?.imageUrl]);

  const hasValidImage = useMemo(() => {
    return imageUrl && imageUrl.trim() !== "" && imageUrl.startsWith("http");
  }, [imageUrl]);

  return (
    <div
      className={`border border-gray-300 rounded-lg overflow-hidden group text-xs flex flex-col h-[240px] w-full max-w-[180px] relative ${
        isDiscounted ? "bg-black text-white" : "bg-gray-100"
      }`}
    >
      <div
        className={`border-b overflow-hidden relative h-1/2 ${
          isDiscounted ? "border-gray-600" : "border-gray-300"
        }`}
      >
        {/* Discount Tag */}
        {isDiscounted && discountInfo.percentage > 0 && (
          <div className="absolute top-2 left-2 z-10">
            <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
              {discountInfo.percentage}% off
              {discountInfo.isKnown && (
                <span className="text-xs opacity-75">*</span>
              )}
            </div>
          </div>
        )}

        {hasValidImage && (
          <Link
            href={`/product/${product?.id}`}
            onClick={() => {
              // Save current category state when product is clicked
              setLastVisitedCategory(selectedCategoryId, isDealsSelected);
            }}
          >
            <Image
              src={imageUrl}
              alt={product.name || "Product image"}
              width={500}
              height={500}
              loading="lazy"
              className={`w-full h-full object-cover overflow-hidden transition-transform duration-500 group-hover:scale-105`}
              onError={(e) => {
                console.error("Image failed to load:", e);
                e.currentTarget.style.display = "none";
              }}
            />
          </Link>
        )}
      </div>

      {/* Add to Cart Button - Right side, vertically centered */}
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 z-20">
        <AddToCartButton product={product} />
      </div>

      <div className="p-2 flex flex-col gap-1 h-1/2 justify-between pr-8">
        <PriceView
          price={
            product?.pricing?.final_price ||
            product?.base_price ||
            product?.price
          }
          originalPrice={
            isDiscounted ? product?.pricing?.base_price : undefined
          }
          isDiscounted={isDiscounted}
        />
        <p
          className={`text-[10px] font-bold tracking-wide line-clamp-1 uppercase ${
            isDiscounted ? "text-white" : "text-black"
          }`}
        >
          {product?.brand}
        </p>
        <p
          className={`text-sm tracking-wide font-semibold line-clamp-1 capitalize ${
            isDiscounted ? "text-white" : "text-black"
          }`}
        >
          {product?.name}
        </p>
        <p
          className={`text-[10px] tracking-wide line-clamp-1 ${
            isDiscounted ? "text-gray-300" : "text-black"
          }`}
        >
          {product?.unit_measure || product?.unit}
        </p>
      </div>
    </div>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
