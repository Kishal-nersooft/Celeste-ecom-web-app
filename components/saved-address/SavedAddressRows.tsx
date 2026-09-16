"use client";

import { BriefcaseBusiness, HeartIcon, HomeIcon, MoreVertical, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { findSlotAddress, getOtherNamedAddresses } from "@/lib/named-addresses";
import type { SavedAddress } from "./types";

const FACE_ICON = "h-4 w-4 sm:h-5 sm:w-5 text-gray-600 shrink-0";

function SlotIcon({ slot }: { slot: "home" | "work" | "other" }) {
  if (slot === "home") return <HomeIcon className={FACE_ICON} />;
  if (slot === "work") return <BriefcaseBusiness className={FACE_ICON} />;
  return <HeartIcon className={FACE_ICON} />;
}

function Divider({ widthClass }: { widthClass: string }) {
  return (
    <div className="flex justify-center">
      <div className={`h-px ${widthClass} bg-gray-200`} />
    </div>
  );
}

function SavedAddressRow({
  slot,
  label,
  address,
  emptyHint,
  onEmptyClick,
  onSelect,
  onDelete,
  deletingId,
}: {
  slot: "home" | "work" | "other";
  label: string;
  address?: SavedAddress;
  emptyHint?: string;
  onEmptyClick?: () => void;
  onSelect?: (address: SavedAddress) => void;
  onDelete: (address: SavedAddress) => void;
  deletingId?: number | null;
}) {
  return (
    <div className="flex items-center min-w-0 overflow-hidden">
      <button
        type="button"
        className="flex items-center gap-1 min-w-0 flex-1 text-left overflow-hidden py-2.5"
        onClick={() => {
          if (address) {
            onSelect?.(address);
            return;
          }
          onEmptyClick?.();
        }}
      >
        <span className="h-9 w-9 shrink-0 flex items-center justify-center">
          <SlotIcon slot={slot} />
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <span className="block text-sm sm:text-base font-medium truncate">{label}</span>
          <p className="text-xs sm:text-sm text-gray-500 truncate mt-0.5">
            {address?.address || emptyHint}
          </p>
        </div>
      </button>
      {address ? (
        <Popover modal={false}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="h-9 w-9 shrink-0 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
              aria-label={`Delete ${label}`}
              disabled={deletingId === address.id}
            >
              <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="z-[80] w-36 p-1">
            <button
              type="button"
              className="w-full rounded-sm px-2 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
              onClick={() => onDelete(address)}
              disabled={deletingId === address.id}
            >
              {deletingId === address.id ? "Deleting…" : "Delete"}
            </button>
          </PopoverContent>
        </Popover>
      ) : (
        <button
          type="button"
          className="h-9 w-9 shrink-0 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
          aria-label={`Add ${label}`}
          onClick={onEmptyClick}
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      )}
    </div>
  );
}

interface SavedAddressRowsProps {
  addresses: SavedAddress[];
  onSelect?: (address: SavedAddress) => void;
  onAddSlot: (presetName: "Home" | "Work") => void;
  onDelete: (address: SavedAddress) => void;
  deletingId?: number | null;
}

export default function SavedAddressRows({
  addresses,
  onSelect,
  onAddSlot,
  onDelete,
  deletingId = null,
}: SavedAddressRowsProps) {
  const homeAddress = findSlotAddress(addresses, "home");
  const workAddress = findSlotAddress(addresses, "work");
  const otherAddresses = getOtherNamedAddresses(addresses, homeAddress, workAddress);

  return (
    <div>
      <SavedAddressRow
        key="home"
        slot="home"
        label="Home"
        address={homeAddress}
        emptyHint="Add home address"
        onEmptyClick={() => onAddSlot("Home")}
        onSelect={onSelect}
        onDelete={onDelete}
        deletingId={deletingId}
      />
      <SavedAddressRow
        key="work"
        slot="work"
        label="Work"
        address={workAddress}
        emptyHint="Add work address"
        onEmptyClick={() => onAddSlot("Work")}
        onSelect={onSelect}
        onDelete={onDelete}
        deletingId={deletingId}
      />
      {otherAddresses.length > 0 && (
        <>
          <Divider widthClass="w-4/5" />
          {otherAddresses.map((address) => (
            <SavedAddressRow
              key={address.id}
              slot="other"
              label={address.name || "Saved address"}
              address={address}
              onSelect={onSelect}
              onDelete={onDelete}
              deletingId={deletingId}
            />
          ))}
        </>
      )}
    </div>
  );
}
