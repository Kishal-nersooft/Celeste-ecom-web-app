"use client";

import React, { useState } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { useFavorites } from "@/contexts/FavoritesContext";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface FavoriteButtonProps {
  productId: number;
  className?: string;
}

export default function FavoriteButton({ productId, className = "" }: FavoriteButtonProps) {
  const { user, loading: authLoading } = useAuth();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const router = useRouter();
  const [isToggling, setIsToggling] = useState(false);

  const favorited = isFavorite(productId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isToggling || authLoading) return;

    if (!user) {
      toast.error("Please sign in to add favorites");
      router.push("/login?returnUrl=" + encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/"));
      return;
    }

    setIsToggling(true);
    try {
      if (favorited) {
        await removeFavorite(productId);
        toast.success("Removed from favorites");
      } else {
        await addFavorite(productId);
        toast.success("Added to favorites");
      }
    } catch (err) {
      toast.error(favorited ? "Failed to remove from favorites" : "Failed to add to favorites");
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isToggling || authLoading}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      className={`
        absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-20
        p-1.5 rounded-full shadow-md
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${favorited
          ? "bg-white/90 text-red-500 hover:bg-white hover:text-red-600"
          : "bg-white/90 text-gray-500 hover:bg-white hover:text-gray-700"
        }
        ${className}
      `}
    >
      <Heart
        className="h-4 w-4 sm:h-5 sm:w-5"
        fill={favorited ? "currentColor" : "none"}
        strokeWidth={2}
      />
    </button>
  );
}
