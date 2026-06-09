"use client";

import React from "react";
import Container from "@/components/Container";
import { ChevronRight } from "lucide-react";
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
  children,
  contentClassName,
}: {
  activeSection: ProfileSectionKey | null;
  onNavigate: (section: ProfileSectionKey) => void;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <Container className="py-0">
      <div className="flex min-h-screen bg-gray-50">
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen shrink-0">
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
        <div className={cn("flex-1 bg-white p-8", contentClassName)}>{children}</div>
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
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      {description && <p className="text-sm text-gray-500 mb-8">{description}</p>}
      {!description && <div className="mb-8" />}
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
    <section className={cn("mb-10", className)}>
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
  disabled,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full text-left py-4 flex items-start justify-between gap-4 border-b border-gray-100 last:border-0 -mx-2 px-2 rounded-lg transition-colors",
        onClick && !disabled && "hover:bg-gray-50/80",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <div className="flex gap-3 min-w-0 flex-1">
        {Icon && (
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
            <Icon className="h-4 w-4 text-gray-700" />
          </div>
        )}
        <div className="min-w-0">
          <p className="font-medium text-gray-900">{title}</p>
          {description && (
            <p className="text-sm text-gray-500 mt-1 leading-relaxed line-clamp-2">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 pt-0.5">
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
  return <Separator className="mb-10 bg-gray-200" />;
}
