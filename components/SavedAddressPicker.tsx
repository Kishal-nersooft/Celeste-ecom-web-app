"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import { deleteUserAddress, getUserAddresses } from "@/lib/api";
import { forgetAddressName, getNamedSavedAddresses } from "@/lib/named-addresses";
import SavedAddressAddFlow from "@/components/saved-address/SavedAddressAddFlow";
import SavedAddressRows from "@/components/saved-address/SavedAddressRows";
import type { SavedAddStep, SavedAddress } from "@/components/saved-address/types";

interface SavedAddressPickerProps {
  onBack: () => void;
  user: unknown;
  savedAddresses: SavedAddress[];
  applySavedAddress: (address: SavedAddress) => void;
  onAddressesChange: (addresses: SavedAddress[]) => void;
  onSearchFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onStepChange?: (step: "list" | SavedAddStep) => void;
}

export default function SavedAddressPicker({
  onBack,
  user,
  savedAddresses,
  applySavedAddress,
  onAddressesChange,
  onSearchFocus,
  onStepChange,
}: SavedAddressPickerProps) {
  const [addPreset, setAddPreset] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    return () => onStepChange?.("list");
  }, [onStepChange]);

  const requireUser = () => {
    if (!user) {
      toast.error("Please log in to save addresses");
      return false;
    }
    return true;
  };

  const startAdd = (presetName = "") => {
    if (!requireUser()) return;
    setAddPreset(presetName);
    onStepChange?.("search");
  };

  const handleDelete = async (address: SavedAddress) => {
    setDeletingId(address.id);
    try {
      await deleteUserAddress(address.id);
      forgetAddressName(address.id);
      const addresses = await getUserAddresses();
      onAddressesChange(Array.isArray(addresses) ? getNamedSavedAddresses(addresses) : []);
      toast.success("Address deleted");
    } catch (error) {
      console.error("Error deleting address:", error);
      toast.error("Failed to delete address");
    } finally {
      setDeletingId(null);
    }
  };

  if (addPreset !== null) {
    return (
      <SavedAddressAddFlow
        onBack={() => {
          setAddPreset(null);
          onStepChange?.("list");
        }}
        onSaved={(addresses) => {
          onAddressesChange(addresses);
          setAddPreset(null);
          onStepChange?.("list");
        }}
        existingAddresses={savedAddresses}
        presetName={addPreset}
        onSearchFocus={onSearchFocus}
        onStepChange={onStepChange}
      />
    );
  }

  return (
    <div className="relative overflow-x-hidden">
      <div className="relative flex items-center justify-center mb-3 sm:mb-4 min-h-9">
        <Button variant="ghost" size="icon" onClick={onBack} className="absolute left-0 shrink-0">
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <DialogTitle className="text-lg sm:text-xl font-bold text-center">
          Saved Address
        </DialogTitle>
        <button
          type="button"
          className="absolute right-0 text-blue-600 text-sm sm:text-base font-medium shrink-0 px-1"
          onClick={() => startAdd("")}
        >
          Add
        </button>
      </div>

      <SavedAddressRows
        addresses={savedAddresses}
        onSelect={applySavedAddress}
        onAddSlot={(preset) => startAdd(preset)}
        onDelete={handleDelete}
        deletingId={deletingId}
      />
    </div>
  );
}
