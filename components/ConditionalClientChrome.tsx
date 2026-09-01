"use client";

import React, { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import { MobileGoToCartBar } from "@/components/MobileGoToCartBar";
import AuthStatusBanner from "@/components/AuthStatusBanner";
import { LocationSelectorProvider } from "@/components/LocationSelector";
import { useLocation } from "@/contexts/LocationContext";
import { useCategory } from "@/contexts/CategoryContext";
import Link from "next/link";

function CheckoutBreadcrumb() {
  const { setSelectedCategory } = useCategory();

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        onClick={() => setSelectedCategory(null)}
      >
        <span aria-hidden className="text-base leading-none">
          ←
        </span>
        <span className="underline underline-offset-4">Back to Home</span>
      </Link>
    </div>
  );
}

function ChromeInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setSelectedLocation } = useLocation();

  const embeddedPayment =
    pathname === "/checkout/payment" && searchParams.get("embedded") === "1";

  if (embeddedPayment) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        {children}
      </div>
    );
  }

  const scrollToTop = <ScrollToTopButton />;

  const isCheckoutRoute = pathname === "/checkout" || pathname.startsWith("/checkout/");

  const chrome = isCheckoutRoute ? (
    <>
      <div className="main-content pt-6">
        <div className="py-2">
          <CheckoutBreadcrumb />
        </div>
        {children}
      </div>
      <Footer />
      {scrollToTop}
    </>
  ) : (
    <div>
      <Header />
      <div className="main-content lg:pt-20">{children}</div>
      <Footer />
      <MobileGoToCartBar />
      {scrollToTop}
    </div>
  );

  return (
    <LocationSelectorProvider onLocationSelect={setSelectedLocation}>
      {chrome}
    </LocationSelectorProvider>
  );
}

export function ConditionalClientChrome({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">{children}</div>
      }
    >
      <ChromeInner>{children}</ChromeInner>
      <AuthStatusBanner />
    </Suspense>
  );
}
