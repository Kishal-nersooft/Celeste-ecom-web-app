"use client";

import React from "react";
import Container from "@/components/Container";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const PROFILE_MENU_ITEMS = [
  { label: "Personal Info", key: "profile" },
  { label: "Security", key: "security" },
  { label: "Privacy & Data", key: "privacy" },
  { label: "Saved Locations", key: "saved-locations" },
] as const;

export type ProfileSectionKey = (typeof PROFILE_MENU_ITEMS)[number]["key"];

export function ProfileAccountLayout({
  activeSection,
  onNavigate,
  onBack,
  children,
  contentClassName,
}: {
  activeSection: ProfileSectionKey | null;
  onNavigate: (section: ProfileSectionKey) => void;
  onBack?: () => void;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  const activeLabel =
    PROFILE_MENU_ITEMS.find((item) => item.key === activeSection)?.label ?? "Account";

  return (
    <Container className="py-0">
      <div className="flex bg-white lg:min-h-screen lg:bg-gray-50">
        <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block lg:min-h-screen">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Account Settings</h2>
            <nav className="space-y-2">
              {PROFILE_MENU_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onNavigate(item.key)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors duration-200",
                    activeSection === item.key
                      ? "bg-black text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <span className="font-medium">{item.label}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ))}
            </nav>
          </div>
        </aside>
        <div className={cn("min-w-0 flex-1 bg-white py-4 lg:p-8", contentClassName)}>
          {onBack && (
            <div className="mb-5 flex items-center gap-3 lg:hidden">
              <button
                type="button"
                onClick={onBack}
                aria-label="Back to account"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900"
              >
                <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.25} />
              </button>
              <h2 className="min-w-0 truncate text-base font-semibold text-gray-900">{activeLabel}</h2>
            </div>
          )}
          {children}
        </div>
      </div>
    </Container>
  );
}

export function ProfilePageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 hidden text-2xl font-bold text-gray-900 lg:block">{title}</h1>
      {description && <p className="mb-6 text-sm text-gray-500 lg:mb-8">{description}</p>}
      {!description && <div className="mb-6 lg:mb-8" />}
    </div>
  );
}

export function SectionBlock({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-8 lg:mb-10", className)}>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {description && <p className="text-sm text-gray-500 mt-1 mb-2">{description}</p>}
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function SettingsRow({
  title,
  description,
  actionLabel,
  onClick,
  icon: Icon,
  badge,
  disabled,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  disabled?: boolean;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full text-left py-3.5 flex items-center justify-between gap-3 border-b border-gray-100 last:border-0 rounded-lg transition-colors lg:items-start lg:gap-4 lg:-mx-2 lg:px-2 lg:py-4",
        onClick && !disabled && "hover:bg-gray-50/80",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <div className="flex gap-3 min-w-0 flex-1">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 lg:mt-0.5">
            <Icon className="h-4 w-4 text-gray-700" />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-medium text-gray-900">
            <span className="inline-flex flex-wrap items-center gap-2">
              {title}
              {badge ? <span className="lg:hidden">{badge}</span> : null}
            </span>
          </p>
          {description && (
            <p className="text-sm text-gray-500 mt-1 leading-relaxed line-clamp-2">{description}</p>
          )}
          {actionLabel && (
            <p className="mt-1 break-words text-sm text-gray-600 sm:hidden">{actionLabel}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 lg:pt-0.5">
        {actionLabel && (
          <span className="text-sm text-gray-500 hidden sm:inline max-w-[140px] truncate">
            {actionLabel}
          </span>
        )}
        {onClick && <ChevronRight className="h-5 w-5 text-gray-400" />}
      </div>
    </Comp>
  );
}

export function ProfileSectionSeparator() {
  return <Separator className="mb-8 bg-gray-200 lg:mb-10" />;
}
