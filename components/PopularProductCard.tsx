import Image from "next/image";
import React from "react";
import { LuHeart } from "react-icons/lu";
import Link from "next/link";
import { Product } from "../store";
import PriceFormatter from "./PriceFormatter";

interface PopularProductCardProps {
  product: Product;
}

const PopularProductCard = ({ product }: PopularProductCardProps) => {
  // Safety check for invalid product
  if (!product || !product.id || !product.name) {
    console.error('PopularProductCard: Invalid product received:', product);
    return null;
  }

  const isDiscounted = product?.pricing && product.pricing.discount_applied > 0;
  const finalPrice = product?.pricing?.final_price || product?.base_price || product?.price;
  const originalPrice = isDiscounted ? product?.pricing?.base_price : undefined;
  
  // Get the first valid image URL
  const imageUrl = product?.image_urls?.[0] || product?.imageUrl;
  const hasValidImage = imageUrl && imageUrl.trim() !== '' && imageUrl.startsWith('http');

  return (
    <div className={`relative rounded-2xl overflow-hidden group h-[280px] w-full max-w-[400px] shadow-lg ${
      isDiscounted ? 'bg-black text-white' : 'bg-gray-100'
    }`}>
      {/* Background pattern with food icons */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-4 left-8 text-2xl">🍕</div>
        <div className="absolute top-12 right-12 text-xl">🍦</div>
        <div className="absolute top-20 left-16 text-lg">🍎</div>
        <div className="absolute bottom-16 right-8 text-xl">🥕</div>
        <div className="absolute bottom-8 left-12 text-lg">🍫</div>
        <div className="absolute top-8 right-20 text-lg">🐟</div>
        <div className="absolute bottom-20 left-20 text-xl">🍞</div>
        <div className="absolute top-16 left-4 text-lg">🌶️</div>
        <div className="absolute bottom-12 right-16 text-xl">🍉</div>
      </div>

      {/* Favorite button */}
      <button className="absolute top-4 right-4 z-20 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors">
        <LuHeart className="h-4 w-4 text-black" />
      </button>

      <div className="flex h-full">
        {/* Left section - Text and controls */}
        <div className="flex-1 p-6 flex flex-col justify-between relative z-10">
          {/* Product name */}
          <div className="space-y-1">
            <h3 className={`text-lg font-bold tracking-wide ${
              isDiscounted ? 'text-white' : 'text-black'
            }`}>
              {product?.brand}
            </h3>
            <h4 className={`text-base font-bold tracking-wide ${
              isDiscounted ? 'text-white' : 'text-black'
            }`}>
              {product?.name}
            </h4>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {isDiscounted ? (
                <>
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-bold">
                    {Math.round(product?.pricing?.discount_percentage || 0)}% OFF
                  </span>
                  <PriceFormatter 
                    amount={finalPrice} 
                    className="text-red-600 font-semibold text-lg" 
                  />
                  {originalPrice && (
                    <PriceFormatter 
                      amount={originalPrice} 
                      className="line-through text-gray-400 text-sm" 
                    />
                  )}
                </>
              ) : (
                <PriceFormatter 
                  amount={finalPrice} 
                  className="text-white text-2xl font-bold" 
                />
              )}
            </div>
          </div>

          {/* Delivery info */}
          <div className={`text-sm ${
            isDiscounted ? 'text-white' : 'text-gray-600'
          }`}>
            Delivery Free - 35 min
          </div>

          {/* Add to Cart button */}
          <Link href={`/product/${product?.id}`}>
            <button className={`font-semibold py-3 px-6 rounded-xl transition-colors w-full ${
              isDiscounted 
                ? 'bg-white text-black hover:bg-gray-100' 
                : 'bg-black text-white hover:bg-gray-800'
            }`}>
              Add to Cart
            </button>
          </Link>
        </div>

        {/* Right section - Product image */}
        <div className="w-40 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Main product image */}
            <div className="relative z-10">
              {hasValidImage ? (
                <Image
                  src={imageUrl}
                  alt={product.name || 'Product image'}
                  width={140}
                  height={140}
                  className="object-contain h-36 w-36"
                  onError={(e) => {
                    console.error('Image failed to load:', e);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-36 h-36 bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500 text-xs">No Image</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopularProductCard;