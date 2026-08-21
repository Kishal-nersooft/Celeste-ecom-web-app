"use client";

import React, { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import AuthStatusBanner from "@/components/AuthStatusBanner";
import Link from "next/link";

function CheckoutBreadcrumb() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
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

  if (isCheckoutRoute) {
    return (
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
    );
  }

  return (
    <>
      <Header />
      <div className="main-content pt-36 lg:pt-20">{children}</div>
      <Footer />
      {scrollToTop}
    </>
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
