"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import SubcategorySelector from "@/components/SubcategorySelector";
import { Product } from "../../../../store";
import { Category } from "@/components/Categories";
import { getSubcategories, getProductsBySubcategoryWithPricing, getParentCategoryFromSubcategory, getProductsByParentCategoryWithPagination, getParentCategories } from "@/lib/api";
import { getCategorySlug, resolveCategorySlugToId, toCategorySlug } from "@/lib/category-slug";
import { ArrowLeft } from "lucide-react";
import Loader from "@/components/Loader";
import Image from "next/image";

interface Props {
  categoryId: string;
  fallbackProducts: Product[];
}

const CategoriesPageClient = ({ categoryId, fallbackProducts }: Props) => {
  const router = useRouter();
  const [numericCategoryId, setNumericCategoryId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>(() => fallbackProducts ?? []);
  const [displayCategoryName, setDisplayCategoryName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | null>(null);
  const [parentCategoryName, setParentCategoryName] = useState<string>("");
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  
  // New state for parent category handling
  const [isParentCategory, setIsParentCategory] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const getSubcategoryImageUrl = (subcategory: any): string | null => {
    if (!subcategory) return null;

    const normalizeImageUrl = (url: string): string => {
      // Normalize Google Drive image links to the "drive.google.com/uc?export=view&id=..."
      try {
        const u = new URL(url);
        const id = u.searchParams.get("id");
        if (!id) return url;

        if (u.hostname === "drive.google.com") {
          return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
        }

        if (u.hostname === "drive.usercontent.google.com") {
          return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
        }
      } catch {
        // ignore parsing errors
      }
      return url;
    };

    const candidates: Array<any> = [
      subcategory.image_url,
      subcategory.imageUrl,
      subcategory.image,
      subcategory.image_url_web,
      subcategory.image_url_mobile,
    ];

    for (const c of candidates) {
      if (typeof c === "string" && c.trim().length > 0)
        return normalizeImageUrl(c);
    }

    const arrayKeys = [
      "image_urls",
      "imageUrls",
      "image_urls_web",
      "image_urls_mobile",
    ];

    for (const key of arrayKeys) {
      const arr = subcategory?.[key];
      if (!Array.isArray(arr) || arr.length === 0) continue;

      const first = arr[0];
      if (typeof first === "string" && first.trim().length > 0) return first;
      if (first && typeof first === "object") {
        const objCandidates = [
          first.image_url,
          first.imageUrl,
          first.url,
          first.image,
        ];
        for (const oc of objCandidates) {
          if (typeof oc === "string" && oc.trim().length > 0) return normalizeImageUrl(oc);
        }
      }
    }

    return null;
  };

  // Load more products for parent category
  const loadMoreProducts = useCallback(async () => {
    if (!isParentCategory || loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const result = await getProductsByParentCategoryWithPagination(
        numericCategoryId!,
        12, // Load 12 more products
        nextCursor
      );
      
      setProducts(prev => [...prev, ...result.products]);
      setNextCursor(result.pagination.nextCursor);
      setHasMore(result.pagination.hasMore);
      setTotalProducts(result.pagination.totalCount);
    } catch (error) {
      console.error("Error loading more products:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [isParentCategory, loadingMore, hasMore, nextCursor, numericCategoryId]);

  // Scroll detection for infinite loading
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || !isParentCategory) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100; // 100px threshold
    
    if (isNearBottom && hasMore && !loadingMore) {
      loadMoreProducts();
    }
  }, [isParentCategory, hasMore, loadingMore, loadMoreProducts]);

  useEffect(() => {
    if (categoryId === "recent") {
      router.replace("/recent-items");
      return;
    }
    if (categoryId === "popular-items") {
      router.replace("/popular-items");
      return;
    }

    let cancelled = false;
    resolveCategorySlugToId(categoryId).then((id) => {
      if (!cancelled && id !== null) {
        setNumericCategoryId(id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [categoryId, router]);

  useEffect(() => {
    if (numericCategoryId === null) return;

    const categoryKey = numericCategoryId.toString();

    const fetchCategoryData = async () => {
      try {
        const parentCategories = await getParentCategories();
        const isParent = parentCategories.some(
          (cat: any) => cat.id === numericCategoryId
        );

        const canonicalSlug = getCategorySlug(
          numericCategoryId,
          parentCategories
        );
        if (canonicalSlug && canonicalSlug !== categoryId) {
          router.replace(`/categories/${canonicalSlug}`, { scroll: false });
        }
        
        if (isParent) {
          // This is a parent category - show all products from all subcategories
          setIsParentCategory(true);
          const parentCategoryName =
            parentCategories.find((cat: any) => cat.id === numericCategoryId)
              ?.name || "";
          setDisplayCategoryName(parentCategoryName);
          
          const result = await getProductsByParentCategoryWithPagination(
            numericCategoryId,
            18, // Initial load: 18 products
            null // No cursor for first load
          );
          
          setProducts(result.products);
          setNextCursor(result.pagination.nextCursor);
          setHasMore(result.pagination.hasMore);
          setTotalProducts(result.pagination.totalCount);
          
        } else {
          // This is a subcategory - use existing logic
          setIsParentCategory(false);
          
          // Check if we have subcategory data stored in sessionStorage
          const storedProducts = sessionStorage.getItem(`subcategory_${categoryKey}_products`);
          const storedCategoryName = sessionStorage.getItem(`subcategory_${categoryKey}_name`);

          if (storedProducts) {
            try {
              const parsedProducts = JSON.parse(storedProducts);
              setProducts(parsedProducts);
              setDisplayCategoryName(storedCategoryName || "");
              
              // Clear the stored data after using it
              sessionStorage.removeItem(`subcategory_${categoryKey}_products`);
              sessionStorage.removeItem(`subcategory_${categoryKey}_name`);
              sessionStorage.removeItem(`subcategory_${categoryKey}_id`);
            } catch (error) {
              console.error("Error parsing stored products:", error);
            }
          }
          
          // Get parent category info and subcategories
          const parentCat = await getParentCategoryFromSubcategory(numericCategoryId);
          setParentCategory(parentCat);
          setParentCategoryName(parentCat.name);
          
          // Get all subcategories of the parent category
          const subcats = await getSubcategories(parentCat.id);
          setSubcategories(subcats);
          
          setSelectedSubcategoryId(numericCategoryId);
          
          const existingParentId = sessionStorage.getItem(`subcategory_${categoryKey}_parent_id`);
          if (!existingParentId) {
            sessionStorage.setItem(`subcategory_${categoryKey}_parent_id`, parentCat.id.toString());
          }
          
          if (!storedProducts) {
            try {
              const subcategoryProducts = await getProductsBySubcategoryWithPricing(numericCategoryId);
              setProducts(subcategoryProducts);
              const currentSubcategoryName =
                subcats.find((s: any) => s.id === numericCategoryId)?.name || "";
              setDisplayCategoryName(currentSubcategoryName);
              
              sessionStorage.setItem(`subcategory_${categoryKey}_products`, JSON.stringify(subcategoryProducts));
              sessionStorage.setItem(`subcategory_${categoryKey}_name`, currentSubcategoryName);
            } catch (error) {
              console.error("Error fetching current subcategory products:", error);
            }
          }
          
        }
      } catch (error) {
        console.error("Error fetching category data:", error);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchCategoryData();
  }, [numericCategoryId, categoryId, router]);

  const handleSubcategorySelect = async (subcategoryId: number | null) => {
    if (!subcategoryId) return;
    
    // Set loading state for products
    setIsLoadingProducts(true);
    
    // Preserve parent category ID for the new subcategory
    const categoryKey = numericCategoryId?.toString() ?? categoryId;
    const parentCategoryId = sessionStorage.getItem(`subcategory_${categoryKey}_parent_id`);
    if (parentCategoryId) {
      sessionStorage.setItem(`subcategory_${subcategoryId}_parent_id`, parentCategoryId);
    }

    const sub = subcategories.find((s) => s.id === subcategoryId);
    const slug = sub ? toCategorySlug(sub.name) : subcategoryId.toString();
    router.push(`/categories/${slug}`);
  };

  const handleGoBack = () => {
    // Check if user came from "All" page
    const categorySource = sessionStorage.getItem('category_source');
    
    if (categorySource === 'all') {
      // User came from "All" page - go back to "All"
      sessionStorage.removeItem('category_source');
      router.push('/');
    } else if (isParentCategory) {
      // User is on parent category page - go back to "All"
      router.push('/');
    } else {
      // Check if we have parent category ID stored (subcategory case)
      const categoryKey = numericCategoryId?.toString() ?? categoryId;
      const parentCategoryId = sessionStorage.getItem(`subcategory_${categoryKey}_parent_id`);
      
      if (parentCategoryId && parentCategory) {
        router.push(`/?category=${toCategorySlug(parentCategory.name)}`);
      } else if (parentCategoryId) {
        router.push(`/?category=${parentCategoryId}`);
      } else {
        // Fallback to browser back
        router.back();
      }
    }
  };

  if (
    isLoading ||
    numericCategoryId === null ||
    categoryId === "recent" ||
    categoryId === "popular-items"
  ) {
    return <Loader />;
  }

  const productCount = products?.length ?? 0;
  const selectedSubcategory = selectedSubcategoryId
    ? subcategories.find((s) => s.id === selectedSubcategoryId) ?? null
    : null;
  const selectedSubcategoryImageUrl =
    getSubcategoryImageUrl(selectedSubcategory);

  return (
    <div className="bg-gray-100 min-h-screen">
      <Container className="py-3 sm:py-4">
        {/* Header with Go Back Button */}
        <div className="flex items-center mb-3 sm:mb-4">
          <button
            onClick={handleGoBack}
            className="flex items-center text-black hover:text-black transition-colors mr-3 sm:mr-4"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
            <span className="font-medium text-sm sm:text-base truncate">
              {isParentCategory ? displayCategoryName : parentCategoryName}
            </span>
          </button>
        </div>

        {isParentCategory ? (
          /* Parent Category Layout - Full Width Grid */
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6">
            <div className="mb-3 sm:mb-4 md:mb-6">
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-black">
                {displayCategoryName} - All Products
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1">
                {totalProducts > 0 ? `${productCount} of ${totalProducts}` : productCount} {productCount === 1 ? 'product' : 'products'} found
              </p>
            </div>
            
            {/* Responsive Products Grid - Full Width */}
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="overflow-y-auto max-h-[60vh] sm:max-h-[65vh] md:max-h-[70vh] pr-1 sm:pr-2"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
                {isLoadingProducts ? (
                  // Show skeleton cards while loading
                  Array.from({ length: 12 }).map((_, index) => (
                    <div key={`skeleton-${index}`} className="w-full">
                      <ProductCardSkeleton />
                    </div>
                  ))
                ) : (
                  // Show actual products when loaded
                  products.map((product) => (
                    <div key={product.id} className="w-full">
                      <ProductCard product={product} />
                    </div>
                  ))
                )}
                
                {/* Loading More Skeleton */}
                {loadingMore && Array.from({ length: 6 }).map((_, index) => (
                  <div key={`loading-${index}`} className="w-full">
                    <ProductCardSkeleton />
                  </div>
                ))}
              </div>
              
              
              {!hasMore && products.length > 0 && (
                <div className="text-center py-4 sm:py-5 md:py-6 text-gray-500 text-xs sm:text-sm">
                  You've reached the end of the products.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Subcategory Layout - With Sidebar */
          <div className="flex bg-white rounded-lg shadow-md overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '500px', maxHeight: '650px' }}>
            {/* Left Sidebar - Subcategory Selector */}
            <SubcategorySelector
              subcategories={subcategories}
              selectedSubcategoryId={selectedSubcategoryId}
              onSelectSubcategory={handleSubcategorySelect}
              parentCategoryName={parentCategoryName}
              currentSubcategoryId={numericCategoryId}
            />

            {/* Right Side - Products Grid */}
            <div className="flex-1 p-3 sm:p-4 md:p-6 flex flex-col min-h-0 overflow-hidden">
              <div className="mb-3 sm:mb-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  {selectedSubcategoryImageUrl ? (
                    <div className="relative w-[44px] h-[44px] overflow-hidden rounded-full">
                      <Image
                        src={selectedSubcategoryImageUrl}
                        alt={selectedSubcategory?.name || "Subcategory"}
                        fill
                        sizes="44px"
                        className="rounded-full object-contain"
                        style={{ objectFit: "contain" }}
                        priority={false}
                      />
                    </div>
                  ) : (
                    <div
                      className="rounded-full flex items-center justify-center bg-gray-200 text-gray-700 font-medium"
                      style={{ width: 44, height: 44 }}
                      aria-label="Subcategory placeholder"
                    >
                      {(selectedSubcategory?.name?.charAt(0) || "").toUpperCase()}
                    </div>
                  )}
                  <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-black">
                    {selectedSubcategoryId
                      ? selectedSubcategory?.name || "Products"
                      : displayCategoryName || "All Products"}
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {productCount} {productCount === 1 ? 'product' : 'products'} found
                </p>
              </div>
              
              {/* Scrollable Products Container - 2 columns on mobile */}
              <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 min-h-0">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                  {isLoadingProducts ? (
                    // Show skeleton cards while loading
                    Array.from({ length: 10 }).map((_, index) => (
                      <div key={`skeleton-${index}`} className="w-full">
                        <ProductCardSkeleton />
                      </div>
                    ))
                  ) : (
                    // Show actual products when loaded
                    products.map((product) => (
                      <div key={product.id} className="w-full">
                        <ProductCard product={product} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
};

export default CategoriesPageClient;
