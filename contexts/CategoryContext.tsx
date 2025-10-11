"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import { usePathname, useRouter } from "next/navigation";

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
  setSelectedCategory: (categoryId: number | null, isDeals?: boolean) => void;
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
  const router = useRouter();

  const [categoryState, setCategoryState] = useState<CategoryState>({
    selectedCategoryId: null,
    isDealsSelected: false,
    lastVisitedCategory: null,
    lastVisitedIsDeals: false,
  });

  // Load category state from localStorage on mount
  useEffect(() => {
    const loadCategoryState = () => {
      try {
        const stored = localStorage.getItem("category-state");
        if (stored) {
          const parsed = JSON.parse(stored);
          setCategoryState((prev) => ({ ...prev, ...parsed }));
        }
      } catch (error) {
        console.warn("Failed to load category state from localStorage:", error);
      }
    };

    loadCategoryState();
  }, []);

  // Save category state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("category-state", JSON.stringify(categoryState));
    } catch (error) {
      console.warn("Failed to save category state to localStorage:", error);
    }
  }, [categoryState]);

  // Handle URL-based category restoration
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get("category");
    const dealsParam = urlParams.get("deals");

    if (categoryParam === "deals" || dealsParam === "true") {
      setCategoryState((prev) => ({
        ...prev,
        selectedCategoryId: null,
        isDealsSelected: true,
      }));
    } else if (categoryParam && !isNaN(Number(categoryParam))) {
      setCategoryState((prev) => ({
        ...prev,
        selectedCategoryId: Number(categoryParam),
        isDealsSelected: false,
      }));
    } else if (pathname === "/" && categoryState.lastVisitedCategory !== null) {
      // Restore last visited category when returning to homepage
      setCategoryState((prev) => ({
        ...prev,
        selectedCategoryId: prev.lastVisitedCategory,
        isDealsSelected: prev.lastVisitedIsDeals,
      }));
    }
  }, [
    pathname,
    categoryState.lastVisitedCategory,
    categoryState.lastVisitedIsDeals,
  ]);

  const setSelectedCategory = useCallback(
    (categoryId: number | null, isDeals: boolean = false) => {
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
      const url = new URL(window.location.href);
      if (isDeals) {
        url.searchParams.set("deals", "true");
        url.searchParams.delete("category");
      } else if (categoryId) {
        url.searchParams.set("category", categoryId.toString());
        url.searchParams.delete("deals");
      } else {
        url.searchParams.delete("category");
        url.searchParams.delete("deals");
      }

      // Update URL without causing a page reload
      window.history.replaceState({}, "", url.toString());
    },
    []
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
    const url = new URL(window.location.href);
    url.searchParams.delete("category");
    url.searchParams.delete("deals");
    window.history.replaceState({}, "", url.toString());

    // Clear localStorage
    localStorage.removeItem("category-state");
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
      setSelectedCategory,
      setLastVisitedCategory,
      clearCategoryState,
      restoreLastVisitedCategory,
    }),
    [
      categoryState.selectedCategoryId,
      categoryState.isDealsSelected,
      categoryState.lastVisitedCategory,
      categoryState.lastVisitedIsDeals,
      setSelectedCategory,
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
