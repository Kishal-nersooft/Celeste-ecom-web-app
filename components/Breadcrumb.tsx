"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = "" }) => {
  return (
    <nav
      className={`flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm ${className}`}
      aria-label="Breadcrumb"
    >
      {/* Home Link */}
      <Link
        href="/"
        className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Home className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="sr-only sm:not-sr-only sm:ml-1">Home</span>
      </Link>

      {/* Breadcrumb Items */}
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={index}>
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
            {isLast ? (
              <span className="text-gray-900 font-medium truncate max-w-[150px] sm:max-w-none">
                {item.label}
              </span>
            ) : item.href ? (
              <Link
                href={item.href}
                className="text-gray-500 hover:text-gray-700 transition-colors truncate max-w-[150px] sm:max-w-none"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-500 truncate max-w-[150px] sm:max-w-none">
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;

