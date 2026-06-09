import React from "react";
import Container from "@/components/Container";
import { cn } from "@/lib/utils";

function Pulse({ className }: { className?: string }) {
  return <div className={cn("bg-gray-200 rounded animate-pulse", className)} />;
}

/** Shared account settings sidebar */
export function ProfileSidebarSkeleton() {
  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen shrink-0">
      <div className="p-6">
        <Pulse className="h-5 w-40 mb-6" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="w-full px-4 py-3 rounded-lg bg-gray-100 flex items-center justify-between"
            >
              <Pulse className="h-4 w-28" />
              <Pulse className="h-4 w-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileSectionLayoutSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <ProfileSidebarSkeleton />
      <div className="flex-1 bg-white p-8">{children}</div>
    </div>
  );
}

function SecurityRowSkeleton({
  withDescription = true,
  withActionLabel = false,
}: {
  withDescription?: boolean;
  withActionLabel?: boolean;
}) {
  return (
    <div className="py-4 flex items-start justify-between gap-4 border-b border-gray-100 last:border-0">
      <div className="flex gap-3 min-w-0 flex-1">
        <Pulse className="h-9 w-9 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2 min-w-0">
          <Pulse className="h-4 w-36" />
          {withDescription && (
            <>
              <Pulse className="h-3 w-full max-w-md" />
              <Pulse className="h-3 w-4/5 max-w-sm" />
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 pt-1">
        {withActionLabel && <Pulse className="h-4 w-24 hidden sm:block" />}
        <Pulse className="h-5 w-5 rounded-sm" />
      </div>
    </div>
  );
}

function SocialProviderRowSkeleton() {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <Pulse className="h-9 w-9 rounded-full shrink-0" />
        <div className="space-y-2">
          <Pulse className="h-4 w-14" />
          <Pulse className="h-3 w-24" />
        </div>
      </div>
      <Pulse className="h-9 w-24 rounded-md" />
    </div>
  );
}

function LoginActivityRowSkeleton({ withBadge = false }: { withBadge?: boolean }) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-100 last:border-0">
      <Pulse className="h-9 w-9 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Pulse className="h-4 w-44" />
        {withBadge && <Pulse className="h-5 w-32 rounded-full" />}
        <Pulse className="h-3 w-36" />
        <Pulse className="h-3 w-24" />
      </div>
    </div>
  );
}

function SectionHeadingSkeleton({ withDescription = true }: { withDescription?: boolean }) {
  return (
    <div className="mb-4">
      <Pulse className="h-5 w-48 mb-2" />
      {withDescription && (
        <>
          <Pulse className="h-3 w-full max-w-lg mb-1" />
          <Pulse className="h-3 w-3/4 max-w-md" />
        </>
      )}
    </div>
  );
}

/** Inner content only — use inside security tab while session/location loads */
export function ProfileSecurityContentSkeleton() {
  return (
    <div className="max-w-2xl">
      <Pulse className="h-8 w-32 mb-2" />
      <Pulse className="h-4 w-full max-w-md mb-8" />

      <section className="mb-10">
        <SectionHeadingSkeleton />
        <SecurityRowSkeleton withDescription />
        <SecurityRowSkeleton withDescription={false} withActionLabel />
      </section>

      <Pulse className="h-px w-full mb-10 bg-gray-200" />

      <section className="mb-10">
        <SectionHeadingSkeleton withDescription={false} />
        <SecurityRowSkeleton />
        <SecurityRowSkeleton withActionLabel />
        <SecurityRowSkeleton withDescription={false} withActionLabel />
      </section>

      <Pulse className="h-px w-full mb-10 bg-gray-200" />

      <section className="mb-10">
        <SectionHeadingSkeleton />
        <SocialProviderRowSkeleton />
        <SocialProviderRowSkeleton />
        <SocialProviderRowSkeleton />
      </section>

      <Pulse className="h-px w-full mb-10 bg-gray-200" />

      <section>
        <SectionHeadingSkeleton />
        <LoginActivityRowSkeleton withBadge />
        <LoginActivityRowSkeleton />
        <div className="mt-4 rounded-lg border border-gray-200 px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Pulse className="h-5 w-5 shrink-0" />
            <div className="space-y-2 flex-1">
              <Pulse className="h-4 w-40" />
              <Pulse className="h-3 w-56" />
            </div>
          </div>
          <Pulse className="h-5 w-5 shrink-0 rounded-sm" />
        </div>
      </section>
    </div>
  );
}

/** Matches ProfileSecuritySection layout (sidebar + content) */
export function ProfileSecuritySkeleton() {
  return (
    <ProfileSectionLayoutSkeleton>
      <ProfileSecurityContentSkeleton />
    </ProfileSectionLayoutSkeleton>
  );
}

/** Matches personal info section rows */
export function ProfilePersonalInfoSkeleton() {
  return (
    <ProfileSectionLayoutSkeleton>
      <div className="max-w-2xl">
        <Pulse className="h-8 w-36 mb-2" />
        <Pulse className="h-4 w-full max-w-md mb-8" />
        <Pulse className="h-5 w-24 mb-4" />
        <div className="flex items-center gap-4 py-4 border-b border-gray-100 mb-2">
          <Pulse className="h-16 w-16 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Pulse className="h-4 w-32" />
            <Pulse className="h-3 w-48" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="py-4 flex items-start gap-3 border-b border-gray-100 last:border-0"
          >
            <Pulse className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Pulse className="h-4 w-28" />
              <Pulse className="h-3 w-40" />
            </div>
            <Pulse className="h-5 w-5 shrink-0 rounded-sm" />
          </div>
        ))}
      </div>
    </ProfileSectionLayoutSkeleton>
  );
}

/** Matches privacy section rows */
export function ProfilePrivacySkeleton() {
  return (
    <ProfileSectionLayoutSkeleton>
      <div className="max-w-2xl">
        <Pulse className="h-8 w-44 mb-2" />
        <Pulse className="h-4 w-full max-w-lg mb-8" />
        <Pulse className="h-5 w-28 mb-4" />
        {Array.from({ length: 7 }).map((_, idx) => (
          <div
            key={idx}
            className="py-4 flex items-start gap-3 border-b border-gray-100 last:border-0"
          >
            <Pulse className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Pulse className="h-4 w-36" />
              <Pulse className="h-3 w-full max-w-sm" />
            </div>
            <Pulse className="h-5 w-5 shrink-0 rounded-sm" />
          </div>
        ))}
      </div>
    </ProfileSectionLayoutSkeleton>
  );
}

function SavedLocationCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Pulse className="h-5 w-5 shrink-0 rounded-full" />
          <Pulse className="h-5 w-32" />
        </div>
        <div className="flex gap-1">
          <Pulse className="h-8 w-8 rounded" />
          <Pulse className="h-8 w-8 rounded" />
        </div>
      </div>
      <Pulse className="h-5 w-20 rounded-full" />
      <div className="space-y-2">
        <Pulse className="h-4 w-full" />
        <Pulse className="h-4 w-4/5" />
      </div>
      <Pulse className="h-9 w-full rounded-md" />
    </div>
  );
}

/** Address card grid only — use while addresses load inside saved-locations tab */
export function ProfileSavedLocationsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, idx) => (
        <SavedLocationCardSkeleton key={idx} />
      ))}
    </div>
  );
}

/** Matches saved locations list rows */
export function ProfileSavedLocationsSkeleton() {
  return (
    <ProfileSectionLayoutSkeleton>
      <div className="max-w-2xl">
        <Pulse className="h-8 w-44 mb-2" />
        <Pulse className="h-4 w-full max-w-lg mb-8" />
        <Pulse className="h-5 w-32 mb-4" />
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="py-4 flex items-start gap-3 border-b border-gray-100 last:border-0"
          >
            <Pulse className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Pulse className="h-4 w-32" />
              <Pulse className="h-3 w-full max-w-md" />
            </div>
            <Pulse className="h-5 w-5 shrink-0 rounded-sm" />
          </div>
        ))}
      </div>
    </ProfileSectionLayoutSkeleton>
  );
}

export type ProfileSectionKey = "profile" | "security" | "privacy" | "saved-locations";

export function ProfileSectionSkeleton({ section }: { section: ProfileSectionKey | null }) {
  const withContainer = (node: React.ReactNode) => (
    <Container className="py-0">{node}</Container>
  );

  switch (section) {
    case "security":
      return withContainer(<ProfileSecuritySkeleton />);
    case "profile":
      return withContainer(<ProfilePersonalInfoSkeleton />);
    case "privacy":
      return withContainer(<ProfilePrivacySkeleton />);
    case "saved-locations":
      return withContainer(<ProfileSavedLocationsSkeleton />);
    default:
      return (
        <Container className="py-10">
          <div className="max-w-md mx-auto bg-white min-h-screen">
            <div className="flex flex-col items-center pt-8 pb-12">
              <Pulse className="h-24 w-24 rounded-full mb-4" />
              <Pulse className="h-6 w-40" />
            </div>
            <div className="space-y-3 px-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="w-full bg-gray-100 rounded-lg px-4 py-4 flex items-center justify-between"
                >
                  <Pulse className="h-4 w-28" />
                  <Pulse className="h-5 w-5" />
                </div>
              ))}
            </div>
          </div>
        </Container>
      );
  }
}
