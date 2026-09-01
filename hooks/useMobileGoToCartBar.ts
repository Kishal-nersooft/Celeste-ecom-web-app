"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/FirebaseAuthProvider";
import useCartStore from "@/store";
import { isShoppingPath } from "@/lib/shopping-routes";

export function useMobileGoToCartBarVisible() {
  const pathname = usePathname();
  const { user } = useAuth();
  const itemCount = useCartStore((state) => state.items.length);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted && Boolean(user) && itemCount > 0 && isShoppingPath(pathname);
}
