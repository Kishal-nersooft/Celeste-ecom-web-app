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
import { ArrowLeft } from "lucide-react";
import Loader from "@/components/Loader";

interface Props {
  categoryId: string;
  fallbackProducts: Product[];
}

const CategoriesPageClient = ({ categoryId, fallbackProducts }: Props) => {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
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

  // Load more products for parent category
  const loadMoreProducts = useCallback(async () => {
    if (!isParentCategory || loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const result = await getProductsByParentCategoryWithPagination(
        parseInt(categoryId),
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
  }, [isParentCategory, loadingMore, hasMore, nextCursor, categoryId]);

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
    const fetchCategoryData = async () => {
      try {
        // First, try to determine if this is a parent category or subcategory
        // Get all parent categories to check if the ID matches
        const parentCategories = await getParentCategories();
        const isParent = parentCategories.some((cat: any) => cat.id === parseInt(categoryId));
        
        if (isParent) {
          // This is a parent category - show all products from all subcategories
          setIsParentCategory(true);
          const parentCategoryName = parentCategories.find((cat: any) => cat.id === parseInt(categoryId))?.name || "";
          setDisplayCategoryName(parentCategoryName);
          
          // Load initial products (18 products)
          const result = await getProductsByParentCategoryWithPagination(
            parseInt(categoryId),
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
          const storedProducts = sessionStorage.getItem(`subcategory_${categoryId}_products`);
          const storedCategoryName = sessionStorage.getItem(`subcategory_${categoryId}_name`);

          if (storedProducts) {
            try {
              const parsedProducts = JSON.parse(storedProducts);
              setProducts(parsedProducts);
              setDisplayCategoryName(storedCategoryName || "");
              
              // Clear the stored data after using it
              sessionStorage.removeItem(`subcategory_${categoryId}_products`);
              sessionStorage.removeItem(`subcategory_${categoryId}_name`);
              sessionStorage.removeItem(`subcategory_${categoryId}_id`);
            } catch (error) {
              console.error("Error parsing stored products:", error);
            }
          }
          
          // Get parent category info and subcategories
          const parentCat = await getParentCategoryFromSubcategory(parseInt(categoryId));
          setParentCategory(parentCat);
          setParentCategoryName(parentCat.name);
          
          // Get all subcategories of the parent category
          const subcats = await getSubcategories(parentCat.id);
          setSubcategories(subcats);
          
          // Pre-select the current subcategory
          setSelectedSubcategoryId(parseInt(categoryId));
          
          // Store parent category ID for back navigation if not already stored
          const existingParentId = sessionStorage.getItem(`subcategory_${categoryId}_parent_id`);
          if (!existingParentId) {
            sessionStorage.setItem(`subcategory_${categoryId}_parent_id`, parentCat.id.toString());
          }
          
          // Load products for the current subcategory
          if (!storedProducts) {
            try {
              const subcategoryProducts = await getProductsBySubcategoryWithPricing(parseInt(categoryId));
              setProducts(subcategoryProducts);
              const currentSubcategoryName = subcats.find((s: any) => s.id === parseInt(categoryId))?.name || "";
              setDisplayCategoryName(currentSubcategoryName);
              
              // Cache the current subcategory products
              sessionStorage.setItem(`subcategory_${categoryId}_products`, JSON.stringify(subcategoryProducts));
              sessionStorage.setItem(`subcategory_${categoryId}_name`, currentSubcategoryName);
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
  }, [categoryId]);

  const handleSubcategorySelect = async (subcategoryId: number | null) => {
    if (!subcategoryId) return;
    
    // Set loading state for products
    setIsLoadingProducts(true);
    
    // Preserve parent category ID for the new subcategory
    const parentCategoryId = sessionStorage.getItem(`subcategory_${categoryId}_parent_id`);
    if (parentCategoryId) {
      sessionStorage.setItem(`subcategory_${subcategoryId}_parent_id`, parentCategoryId);
    }
    
    // Navigate to the new subcategory URL
    router.push(`/categories/${subcategoryId}`);
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
      const parentCategoryId = sessionStorage.getItem(`subcategory_${categoryId}_parent_id`);
      
      if (parentCategoryId) {
        // Navigate to parent category page with category selected
        router.push(`/?category=${parentCategoryId}`);
      } else {
        // Fallback to browser back
        router.back();
      }
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <Container className="py-3 sm:py-4">
        {/* Header with Go Back Button */}
        <div className="flex items-center mb-3 sm:mb-4">
          <button
            onClick={handleGoBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mr-3 sm:mr-4"
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
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800">
                {displayCategoryName} - All Products
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1">
                {totalProducts > 0 ? `${products.length} of ${totalProducts}` : products.length} {products.length === 1 ? 'product' : 'products'} found
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
              currentSubcategoryId={parseInt(categoryId)}
            />

            {/* Right Side - Products Grid */}
            <div className="flex-1 p-3 sm:p-4 md:p-6 flex flex-col min-h-0 overflow-hidden">
              <div className="mb-3 sm:mb-4 flex-shrink-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800">
                  {selectedSubcategoryId 
                    ? subcategories.find(s => s.id === selectedSubcategoryId)?.name || "Products"
                    : displayCategoryName || "All Products"
                  }
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {products.length} {products.length === 1 ? 'product' : 'products'} found
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
