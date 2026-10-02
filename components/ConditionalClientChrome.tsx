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
import { ArrowLeft } from "lucide-react";

function CheckoutBreadcrumb() {
  const { setSelectedCategory } = useCategory();
  const pathname = usePathname();
  const showCheckoutTitle = pathname === "/checkout";

  return (
    <div className="relative flex h-11 items-center px-4 sm:px-6 lg:px-8">
      <Link
        href="/"
        aria-label="Back to home"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50"
        onClick={() => setSelectedCategory(null)}
      >
        <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.25} />
      </Link>
      {showCheckoutTitle && (
        <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold tracking-tight text-neutral-900 sm:text-lg">
          Checkout
        </h1>
      )}
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
