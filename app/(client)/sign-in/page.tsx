"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const returnUrl = searchParams.get("returnUrl");
    const url = returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : "/login";
    router.replace(url);
  }, [router, searchParams]);

  return null;
}
