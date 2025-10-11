"use client";

import { useState } from "react";
import { revalidateAllProducts } from "@/lib/api";
import { invalidateAll } from "@/lib/cache-invalidation";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function CacheRefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Clear local cache first
      invalidateAll();
      
      // Then refresh server-side cache
      await revalidateAllProducts();
      
      // Show success message
      toast.success("Cache refreshed successfully!");
      
      // Force a hard refresh of the current page
      router.refresh();
      
      // Also reload the page to ensure all data is fresh
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Failed to refresh cache:", error);
      toast.error("Failed to refresh data. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
      title="Clear cache and refresh all data"
    >
      {isRefreshing ? "Refreshing..." : "🔄 Refresh Data"}
    </button>
  );
}
