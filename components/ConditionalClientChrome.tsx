"use client";

import React, { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

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

  return (
    <>
      <Header />
      <div className="main-content pt-36 lg:pt-20">{children}</div>
      <Footer />
    </>
  );
}

export function ConditionalClientChrome({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <>
          <Header />
          <div className="main-content pt-36 lg:pt-20">{children}</div>
          <Footer />
        </>
      }
    >
      <ChromeInner>{children}</ChromeInner>
    </Suspense>
  );
}
