"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import { usePathname } from "next/navigation";
import { Category } from "@/components/Categories";
import { getParentCategories } from "@/lib/api";
import {
  findCategoryIdBySlug,
  getCategorySlug,
  toCategorySlug,
} from "@/lib/category-slug";

interface CategoryState {
  selectedCategoryId: number | null;
  isDealsSelected: boolean;
  lastVisitedCategory: number | null;
  lastVisitedIsDeals: boolean;
}

interface CategoryContextType {
  selectedCategoryId: number | null;
  isDealsSelected: boolean;
  lastVisitedCategory: number | null;
  lastVisitedIsDeals: boolean;
  /** Shared parent categories — fetched once for the whole app. */
  categories: Category[];
  categoriesLoading: boolean;
  categoriesError: string | null;
  /** Seed from SSR so the client can skip a redundant fetch. */
  seedParentCategories: (categories: Category[]) => void;
  setSelectedCategory: (
    categoryId: number | null,
    isDeals?: boolean,
    categoryName?: string
  ) => void;
  getCategoryUrlParam: (categoryId: number) => string | null;
  setLastVisitedCategory: (
    categoryId: number | null,
    isDeals?: boolean
  ) => void;
  clearCategoryState: () => void;
  restoreLastVisitedCategory: () => void;
}

const CategoryContext = createContext<CategoryContextType | undefined>(
  undefined
);

interface CategoryProviderProps {
  children: ReactNode;
}

export const CategoryProvider: React.FC<CategoryProviderProps> = ({
  children,
}) => {
  const pathname = usePathname();

  const [categoryState, setCategoryState] = useState<CategoryState>({
    selectedCategoryId: null,
    isDealsSelected: false,
    lastVisitedCategory: null,
    lastVisitedIsDeals: false,
  });
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const hasCategoriesRef = useRef(false);

  const seedParentCategories = useCallback((categories: Category[]) => {
    if (!Array.isArray(categories) || categories.length === 0) return;
    hasCategoriesRef.current = true;
    setParentCategories(categories);
    setCategoriesLoading(false);
    setCategoriesError(null);
  }, []);

  useEffect(() => {
    if (hasCategoriesRef.current) {
      setCategoriesLoading(false);
      return;
    }

    let cancelled = false;

    getParentCategories()
      .then((cats) => {
        if (cancelled || hasCategoriesRef.current) return;
        const list = Array.isArray(cats) ? cats : [];
        hasCategoriesRef.current = list.length > 0;
        setParentCategories(list);
        setCategoriesError(null);
      })
      .catch((error) => {
        if (cancelled || hasCategoriesRef.current) return;
        const message =
          error instanceof Error ? error.message : "Failed to load categories";
        setCategoriesError(message);
        console.warn("Failed to load categories:", error);
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load last-visited category from localStorage after hydration.
  // A clean `/` URL is always All — do not revive selectedCategoryId from storage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("category-state");
      if (!stored) return;
      const parsed = JSON.parse(stored);
      const params = new URLSearchParams(window.location.search);
      const onCleanHome =
        window.location.pathname === "/" &&
        !params.get("category") &&
        params.get("deals") !== "true";

      setCategoryState((prev) => ({
        ...prev,
        lastVisitedCategory:
          parsed.lastVisitedCategory ?? prev.lastVisitedCategory,
        lastVisitedIsDeals:
          parsed.lastVisitedIsDeals ?? prev.lastVisitedIsDeals,
        selectedCategoryId: onCleanHome
          ? null
          : (parsed.selectedCategoryId ?? prev.selectedCategoryId),
        isDealsSelected: onCleanHome
          ? false
          : (parsed.isDealsSelected ?? prev.isDealsSelected),
      }));
    } catch (error) {
      console.warn("Failed to load category state from localStorage:", error);
    }
  }, []);

  // Save category state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("category-state", JSON.stringify(categoryState));
    } catch (error) {
      console.warn("Failed to save category state to localStorage:", error);
    }
  }, [categoryState]);

  const getCategoryUrlParam = useCallback(
    (categoryId: number, categoryName?: string) => {
      if (categoryName) return toCategorySlug(categoryName);
      return getCategorySlug(categoryId, parentCategories);
    },
    [parentCategories]
  );

  // Handle URL-based category restoration
  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get("category");
    const dealsParam = urlParams.get("deals");

    if (categoryParam === "deals" || dealsParam === "true") {
      setCategoryState((prev) => ({
        ...prev,
        selectedCategoryId: null,
        isDealsSelected: true,
      }));
      return;
    }

    if (categoryParam) {
      const resolvedId = findCategoryIdBySlug(categoryParam, parentCategories);
      if (resolvedId !== null) {
        setCategoryState((prev) => ({
          ...prev,
          selectedCategoryId: resolvedId,
          isDealsSelected: false,
        }));

        const slug = getCategorySlug(resolvedId, parentCategories);
        if (slug && slug !== categoryParam) {
          const url = new URL(window.location.href);
          url.searchParams.set("category", slug);
          window.history.replaceState({}, "", url.toString());
        }
        return;
      }
      // Categories may not be loaded yet; keep current selection until they are.
      if (parentCategories.length === 0) return;
    }

    // Clean homepage URL means All. lastVisited is only for explicit back links.
    if (pathname === "/") {
      setCategoryState((prev) => {
        if (prev.selectedCategoryId === null && !prev.isDealsSelected) {
          return prev;
        }
        return {
          ...prev,
          selectedCategoryId: null,
          isDealsSelected: false,
        };
      });
    }
  }, [pathname, parentCategories]);

  const setSelectedCategory = useCallback(
    (
      categoryId: number | null,
      isDeals: boolean = false,
      categoryName?: string
    ) => {
      
      setCategoryState((prev) => {
        // Only update if the values actually changed
        if (
          prev.selectedCategoryId === categoryId &&
          prev.isDealsSelected === isDeals
        ) {
          return prev;
        }


        return {
          ...prev,
          selectedCategoryId: categoryId,
          isDealsSelected: isDeals,
        };
      });

      // Update URL parameters
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (isDeals) {
          url.searchParams.set("deals", "true");
          url.searchParams.delete("category");
        } else if (categoryId) {
          const slug = getCategoryUrlParam(categoryId, categoryName);
          if (slug) {
            url.searchParams.set("category", slug);
          } else {
            url.searchParams.set("category", categoryId.toString());
          }
          url.searchParams.delete("deals");
        } else {
          url.searchParams.delete("category");
          url.searchParams.delete("deals");
        }

        // Update URL without causing a page reload
        window.history.replaceState({}, "", url.toString());
      }
    },
    [getCategoryUrlParam]
  );

  const setLastVisitedCategory = useCallback(
    (categoryId: number | null, isDeals: boolean = false) => {
      setCategoryState((prev) => {
        // Only update if the values actually changed
        if (
          prev.lastVisitedCategory === categoryId &&
          prev.lastVisitedIsDeals === isDeals
        ) {
          return prev;
        }

        return {
          ...prev,
          lastVisitedCategory: categoryId,
          lastVisitedIsDeals: isDeals,
        };
      });
    },
    []
  );

  const clearCategoryState = useCallback(() => {
    setCategoryState({
      selectedCategoryId: null,
      isDealsSelected: false,
      lastVisitedCategory: null,
      lastVisitedIsDeals: false,
    });

    // Clear URL parameters
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete("category");
      url.searchParams.delete("deals");
      window.history.replaceState({}, "", url.toString());

      // Clear localStorage
      localStorage.removeItem("category-state");
    }
  }, []);

  const restoreLastVisitedCategory = useCallback(() => {
    if (categoryState.lastVisitedCategory !== null) {
      setCategoryState((prev) => ({
        ...prev,
        selectedCategoryId: prev.lastVisitedCategory,
        isDealsSelected: prev.lastVisitedIsDeals,
      }));
    }
  }, [categoryState.lastVisitedCategory, categoryState.lastVisitedIsDeals]);

  const contextValue: CategoryContextType = useMemo(
    () => ({
      selectedCategoryId: categoryState.selectedCategoryId,
      isDealsSelected: categoryState.isDealsSelected,
      lastVisitedCategory: categoryState.lastVisitedCategory,
      lastVisitedIsDeals: categoryState.lastVisitedIsDeals,
      categories: parentCategories,
      categoriesLoading,
      categoriesError,
      seedParentCategories,
      setSelectedCategory,
      getCategoryUrlParam,
      setLastVisitedCategory,
      clearCategoryState,
      restoreLastVisitedCategory,
    }),
    [
      categoryState.selectedCategoryId,
      categoryState.isDealsSelected,
      categoryState.lastVisitedCategory,
      categoryState.lastVisitedIsDeals,
      parentCategories,
      categoriesLoading,
      categoriesError,
      seedParentCategories,
      setSelectedCategory,
      getCategoryUrlParam,
      setLastVisitedCategory,
      clearCategoryState,
      restoreLastVisitedCategory,
    ]
  );

  return (
    <CategoryContext.Provider value={contextValue}>
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategory = (): CategoryContextType => {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error("useCategory must be used within a CategoryProvider");
  }
  return context;
};

export default CategoryContext;
