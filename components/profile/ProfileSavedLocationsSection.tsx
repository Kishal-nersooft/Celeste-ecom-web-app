"use client";

import React, { useState } from "react";
import { MapPin, Plus, HomeIcon, BriefcaseBusiness } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ProfilePageHeader,
  SectionBlock,
  SettingsRow,
} from "@/components/profile/profile-ui";
import { classifyAddressName } from "@/lib/named-addresses";

export interface SavedLocationItem {
  id: number;
  address: string;
  is_default: boolean;
  name?: string;
}

interface ProfileSavedLocationsSectionProps {
  locations: SavedLocationItem[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (location: SavedLocationItem) => void;
  onDelete: (id: number) => void;
  onSetDefault: (id: number) => void;
}

function getAddressIcon(name?: string) {
  const slot = classifyAddressName(name);
  if (slot === "home") return HomeIcon;
  if (slot === "work") return BriefcaseBusiness;
  return MapPin;
}

function getDisplayLabel(addr: SavedLocationItem, index: number) {
  return addr.name || `Address #${index + 1}`;
}

export default function ProfileSavedLocationsSection({
  locations,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onSetDefault,
}: ProfileSavedLocationsSectionProps) {
  const [manageLocation, setManageLocation] = useState<SavedLocationItem | null>(null);

  return (
    <div className="max-w-2xl">
      <ProfilePageHeader
        title="Saved locations"
        description="Manage addresses for faster checkout and delivery."
      />

      <SectionBlock
        title="Your addresses"
        description="Tap an address to edit it, or choose the one used for delivery."
      >
        <SettingsRow
          icon={Plus}
          title="Add a new location"
          description="Save home, work, or another delivery address."
          onClick={onAdd}
        />

        {loading ? (
          <>
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="py-4 flex items-start gap-3 border-b border-gray-100 last:border-0"
              >
                <div className="h-9 w-9 rounded-full bg-gray-200 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-5 w-5 bg-gray-200 rounded animate-pulse shrink-0" />
              </div>
            ))}
          </>
        ) : locations.length === 0 ? (
          <div className="text-center py-10 px-4">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500 mb-4">No saved locations yet.</p>
            <Button onClick={onAdd} className="bg-black hover:bg-gray-800">
              <Plus className="w-4 h-4 mr-2" />
              Add location
            </Button>
          </div>
        ) : (
          locations.map((location, index) => {
            const Icon = getAddressIcon(location.name);
            return (
              <div key={location.id} className="relative">
                <SettingsRow
                  icon={Icon}
                  title={getDisplayLabel(location, index)}
                  description={location.address}
                  badge={
                    location.is_default ? (
                      <Badge variant="secondary" className="text-xs">
                        Delivery
                      </Badge>
                    ) : undefined
                  }
                  onClick={() => setManageLocation(location)}
                />
                {location.is_default && (
                  <div className="absolute right-10 top-5 hidden lg:block">
                    <Badge variant="secondary" className="text-xs">
                      Delivery
                    </Badge>
                  </div>
                )}
              </div>
            );
          })
        )}
      </SectionBlock>

      <Dialog open={!!manageLocation} onOpenChange={() => setManageLocation(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {manageLocation
                ? getDisplayLabel(
                    manageLocation,
                    locations.findIndex((l) => l.id === manageLocation.id)
                  )
                : "Address"}
            </DialogTitle>
            <DialogDescription className="line-clamp-3">
              {manageLocation?.address}
            </DialogDescription>
          </DialogHeader>
          {manageLocation?.is_default ? (
            <div className="flex w-full items-start gap-3 rounded-xl border border-gray-900 bg-gray-50 px-3 py-3 text-left">
              <span
                aria-hidden
                className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 border-gray-900"
              >
                <span className="h-2 w-2 rounded-full bg-gray-900" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900">Delivery address</span>
                <span className="mt-0.5 block text-sm text-gray-500">
                  We use this address when you order.
                </span>
              </span>
            </div>
          ) : manageLocation ? (
            <button
              type="button"
              onClick={() => {
                onSetDefault(manageLocation.id);
                setManageLocation(null);
              }}
              className="flex w-full items-start gap-3 rounded-xl border border-gray-200 px-3 py-3 text-left hover:bg-gray-50"
            >
              <span
                aria-hidden
                className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 border-gray-300"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900">Use for delivery</span>
                <span className="mt-0.5 block text-sm text-gray-500">
                  Switch the address we use when you order.
                </span>
              </span>
            </button>
          ) : null}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                if (manageLocation) onEdit(manageLocation);
                setManageLocation(null);
              }}
            >
              Edit address
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={() => {
                if (manageLocation) onDelete(manageLocation.id);
                setManageLocation(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
