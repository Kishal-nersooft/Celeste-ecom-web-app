"use client";

import Link from "next/link";
import React, { Suspense, useEffect, useRef, useState } from "react";
import Container from "./Container";
import Image from "next/image";
import celesteLogoMobile from "@/images/Celeste-Logo-white2.png";
import celesteLogoDesktop from "@/images/logo.png";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { SidePanel } from "./SidePanel";
import { ChevronDown } from "lucide-react";
import { LocationSelectorTrigger, useLocationPicker } from "./LocationSelector";
import CartPreviewPanel from "./CartPreviewPanel";
import useCartStore from "@/store";
import { useLocation } from "@/contexts/LocationContext";
import { useCategory } from "@/contexts/CategoryContext";
import deliveryIcon from "@/images/delivery-icon.png";
import pickupIcon from "@/images/pickup-icon.png";
import SearchBar from "./SearchBar";

function HeaderHomeLogo({
  src,
  width,
  height,
  className,
}: {
  src: typeof celesteLogoMobile | typeof celesteLogoDesktop;
  width: number;
  height: number;
  className: string;
}) {
  const { setSelectedCategory } = useCategory();

  return (
    <Link
      href="/"
      className="inline-flex shrink-0"
      onClick={() => setSelectedCategory(null)}
    >
      <Image
        src={src}
        alt="Celeste"
        width={width}
        height={height}
        priority
        className={className}
      />
    </Link>
  );
}

function MobileHeaderLogo() {
  return (
    <HeaderHomeLogo
      src={celesteLogoMobile}
      width={135}
      height={24}
      className="object-contain h-6 w-auto"
    />
  );
}

function DesktopHeaderLogo() {
  return (
    <HeaderHomeLogo
      src={celesteLogoDesktop}
      width={134}
      height={32}
      className="object-contain h-8 w-auto"
    />
  );
}

function DeliveryTypeBadge() {
  const { deliveryType, hasSelectedDeliveryType } = useLocation();
  const picker = useLocationPicker();

  if (!hasSelectedDeliveryType) return null;

  const label = deliveryType === "delivery" ? "Delivery" : "Pickup";

  return (
    <button
      type="button"
      onClick={() => picker?.openPicker("mode")}
      aria-label={`${label} options`}
      aria-haspopup="dialog"
      className="h-6 lg:h-8 bg-white rounded-md flex items-center justify-center gap-0.5 pl-1 pr-0.5 lg:pl-1.5 lg:pr-1 shadow-sm flex-shrink-0"
    >
      <Image
        src={deliveryType === "delivery" ? deliveryIcon : pickupIcon}
        alt=""
        width={14}
        height={14}
        className="lg:hidden"
        style={{ width: "14px", height: "14px" }}
      />
      <Image
        src={deliveryType === "delivery" ? deliveryIcon : pickupIcon}
        alt=""
        width={20}
        height={20}
        className="hidden lg:block"
        style={{ width: "20px", height: "20px" }}
      />
      <ChevronDown className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-black shrink-0" aria-hidden />
    </button>
  );
}

function MobileBrandRows() {
  const { isGuest } = useAuth();
  const widthRef = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState<number>();

  useEffect(() => {
    const wrap = widthRef.current;
    if (!wrap) return;

    const update = () => {
      const width = Math.round(wrap.getBoundingClientRect().width);
      if (width > 0) setBoxWidth(width);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  const locationBoxClass =
    "w-full min-w-0 overflow-hidden [&_button]:!w-full [&_button]:!min-w-0 [&_button]:!max-w-none [&_button]:!text-[10px] [&_button]:!h-8 [&_button]:!px-2 [&_button]:!gap-1 [&_svg]:!w-3 [&_svg]:!h-3";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div ref={widthRef} className="flex items-center gap-2">
          <SidePanel />
          <MobileHeaderLogo />
        </div>
        {isGuest && (
          <Link
            href="/login"
            className="px-2 py-1 bg-gray-200 text-black font-bold rounded-md text-[10px] hover:bg-gray-300 transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            Login
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className={`${locationBoxClass} shrink-0`} style={boxWidth ? { width: boxWidth } : undefined}>
          <LocationSelectorTrigger className="rounded-md w-full min-w-0 max-w-none flex items-center gap-1.5 overflow-hidden" />
        </div>
        <div className="ml-auto">
          <DeliveryTypeBadge />
        </div>
      </div>
    </div>
  );
}

function DesktopBrandLeft() {
  return (
    <div className="hidden lg:flex items-center gap-3 shrink-0">
      <SidePanel />
      <DesktopHeaderLogo />
      <div className="w-[200px] min-w-0 overflow-hidden [&_button]:!w-full [&_button]:!min-w-0 [&_button]:!max-w-none [&_button]:!h-8 [&_button]:!px-3 [&_button]:!text-sm">
        <LocationSelectorTrigger className="rounded-md w-full min-w-0 max-w-none flex items-center gap-2 overflow-hidden" />
      </div>
      <DeliveryTypeBadge />
    </div>
  );
}

export const Header = () => {
  const { user, isGuest } = useAuth();
  const cartStore = useCartStore();
  const itemCount = cartStore.items.length;
  const brandRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [searchHeight, setSearchHeight] = useState(0);

  useEffect(() => {
    const brand = brandRef.current;
    const search = searchRef.current;
    if (!brand || !search) return;

    const update = () => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      setSearchHeight(search.offsetHeight);
      if (isDesktop) {
        setPinned(false);
        return;
      }
      setPinned(brand.getBoundingClientRect().bottom <= 0);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <>
      {/* Mobile brand — scrolls away with the page */}
      <div ref={brandRef} className="bg-black lg:hidden">
        <Container className="pt-2 pb-0">
          <MobileBrandRows />
        </Container>
      </div>

      {pinned && <div className="lg:hidden" style={{ height: searchHeight }} aria-hidden="true" />}

      {/* Search stays on screen on mobile; full fixed header on desktop */}
      <header
        ref={searchRef}
        className={`z-50 bg-black border-b border-b-gray-200 lg:fixed lg:inset-x-0 lg:top-0 lg:grid lg:grid-cols-2 lg:items-center lg:h-20 lg:px-8 ${
          pinned ? "fixed top-0 left-0 right-0" : "relative"
        }`}
      >
        <DesktopBrandLeft />

        <Container className="py-2 lg:p-0 lg:max-w-none lg:w-full lg:min-w-0">
          <div className="flex items-center gap-2 lg:gap-3">
            <Suspense
              fallback={
                <div className="w-full lg:flex-1 h-10 rounded-md bg-gray-200 animate-pulse" />
              }
            >
              <SearchBar
                className="w-full lg:flex-1 lg:min-w-0"
                placeholder="Search..."
                maxResults={10}
              />
            </Suspense>

            <div className="hidden lg:flex items-center gap-3 shrink-0">
              {user && (
                <CartPreviewPanel>
                  <button className="relative flex items-center justify-center w-12 h-12 border border-gray-200 rounded-md shadow-md hover:shadow-none hoverEffect bg-white cursor-pointer">
                    <svg className="w-6 h-6 text-darkBlue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h8M17 18a2 2 0 100 4 2 2 0 000-4zM9 18a2 2 0 100 4 2 2 0 000-4z" />
                    </svg>
                    {itemCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg">
                        {itemCount > 99 ? "99+" : itemCount}
                      </span>
                    )}
                  </button>
                </CartPreviewPanel>
              )}

              {isGuest && (
                <Link
                  href="/login"
                  className="px-4 py-2 bg-gray-200 text-black font-bold rounded-md text-sm hover:bg-gray-300 transition-colors duration-200 shadow-sm hover:shadow-md"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </Container>
      </header>
    </>
  );
};
