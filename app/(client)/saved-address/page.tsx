"use client";

import React, { useEffect, useRef, useState } from "react";
import Container from "@/components/Container";
import Title from "@/components/Title";
import { useAuth } from "@/components/FirebaseAuthProvider";
import AuthRetryScreen from "@/components/AuthRetryScreen";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";
import { BriefcaseBusiness, Heart, Home, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import AddressSelector from "@/components/AddressSelector";
import DeliveryWarningDialog from "@/components/DeliveryWarningDialog";
import toast from "react-hot-toast";
import {
  getUserAddresses,
  peekUserAddressesCache,
  updateUserAddress,
  deleteUserAddress,
  setDefaultAddress,
} from "@/lib/api";
import {
  findSlotAddress,
  forgetAddressName,
  getNamedSavedAddresses,
  getOtherNamedAddresses,
  rememberAddressName,
} from "@/lib/named-addresses";
import { useLocation } from "@/contexts/LocationContext";
import { GoogleMapsProvider } from "@/components/GoogleMapsProvider";
import SavedAddressAddFlow from "@/components/saved-address/SavedAddressAddFlow";
import type { SavedAddress } from "@/components/saved-address/types";

const MAX_ADDRESSES = 10;

function AddressIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-800">
      {children}
    </span>
  );
}

function SavedAddressSkeleton() {
  return (
    <Container className="py-8 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-8 w-52 rounded bg-gray-200 animate-pulse" />
          <div className="h-9 w-20 rounded-full bg-gray-200 animate-pulse" />
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-200">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-3 border-b border-gray-100 px-4 py-4 last:border-b-0">
              <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200 animate-pulse" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
                <div className="h-3 w-48 max-w-full rounded bg-gray-200 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}

function DeliveryChoice({
  selected,
  busy,
  label,
  onSelect,
}: {
  selected: boolean;
  busy: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={selected || busy}
      aria-pressed={selected}
      aria-label={selected ? `${label} is the delivery address` : `Use ${label} for delivery`}
      className={cn(
        "mt-2.5 inline-flex items-center gap-2 rounded-full py-1 pr-1 text-left text-sm disabled:cursor-default disabled:opacity-100",
        selected ? "font-medium text-gray-900" : "font-medium text-gray-600 hover:text-gray-900"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-gray-900" : "border-gray-300"
        )}
      >
        {selected ? <span className="h-2 w-2 rounded-full bg-gray-900" /> : null}
      </span>
      {selected ? "Delivery address" : "Use for delivery"}
    </button>
  );
}

function SavedAddressRow({
  address,
  label,
  icon,
  emptyHint,
  busy,
  onEmptyAdd,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address?: SavedAddress;
  label: string;
  icon: React.ReactNode;
  emptyHint?: string;
  busy?: boolean;
  onEmptyAdd?: () => void;
  onEdit: (address: SavedAddress) => void;
  onDelete: (addressId: number) => void;
  onSetDefault: (addressId: number) => void;
}) {
  if (!address) {
    return (
      <button
        type="button"
        onClick={onEmptyAdd}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50"
      >
        <AddressIcon>{icon}</AddressIcon>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-gray-900">{label}</span>
          <span className="mt-0.5 block text-sm text-gray-500">{emptyHint}</span>
        </span>
        <Plus className="h-4 w-4 shrink-0 text-gray-400" />
      </button>
    );
  }

  return (
    <div className="flex items-start gap-3 px-4 py-4">
      <AddressIcon>{icon}</AddressIcon>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="truncate font-medium text-gray-900">{label}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-gray-500 break-words">{address.address}</p>
        <DeliveryChoice
          selected={Boolean(address.is_default)}
          busy={Boolean(busy)}
          label={label}
          onSelect={() => onSetDefault(address.id)}
        />
      </div>
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          aria-label={`Edit ${label}`}
          onClick={() => onEdit(address)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={`Delete ${label}`}
          onClick={() => onDelete(address.id)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

const SavedAddressPageContent = () => {
  const { user, loading, unresolved, isGuest } = useAuth();
  const router = useRouter();
  const { setDefaultAddress: setDefaultAddressContext, setAddressId, setSelectedLocation } = useLocation();
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [addPreset, setAddPreset] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [showDeliveryWarning, setShowDeliveryWarning] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<number | null>(null);
  const savedAddressesEpochRef = useRef(0);

  const applySavedAddresses = (addresses: SavedAddress[]) => {
    savedAddressesEpochRef.current += 1;
    setSavedAddresses(addresses);
  };

  useEffect(() => {
    if (isGuest) {
      router.push("/login?returnUrl=" + encodeURIComponent("/saved-address"));
    }
  }, [isGuest, router]);

  useEffect(() => {
    if (!user) return;

    const epoch = savedAddressesEpochRef.current;
    const cached = peekUserAddressesCache({ allowStale: true });
    if (cached && epoch === savedAddressesEpochRef.current) {
      setSavedAddresses(getNamedSavedAddresses(cached));
      setLoadingAddresses(false);
    } else if (epoch === savedAddressesEpochRef.current) {
      setLoadingAddresses(true);
    }

    let cancelled = false;
    getUserAddresses()
      .then((addresses) => {
        if (cancelled || epoch !== savedAddressesEpochRef.current) return;
        if (Array.isArray(addresses)) {
          setSavedAddresses(getNamedSavedAddresses(addresses));
        } else {
          setSavedAddresses([]);
        }
      })
      .catch((error) => {
        console.error("Error loading addresses:", error);
        if (!cancelled && epoch === savedAddressesEpochRef.current) {
          setSavedAddresses([]);
          toast.error("Failed to load addresses");
        }
      })
      .finally(() => {
        if (!cancelled && epoch === savedAddressesEpochRef.current) setLoadingAddresses(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const startAdd = (presetName = "") => {
    if (savedAddresses.length >= MAX_ADDRESSES) {
      toast.error(`You can save up to ${MAX_ADDRESSES} addresses. Delete one to add another.`);
      return;
    }
    setEditingAddress(null);
    setAddPreset(presetName);
  };

  const handleEditAddress = (address: SavedAddress) => {
    setEditingAddress(address);
  };

  const handleUpdateAddress = async (addressData: {
    name: string;
    fullAddress: string;
    coordinates: { lat: number; lng: number };
    city?: string;
  }) => {
    if (!editingAddress) return;

    try {
      await updateUserAddress(editingAddress.id, {
        address: addressData.fullAddress,
        latitude: addressData.coordinates.lat,
        longitude: addressData.coordinates.lng,
        name: addressData.name,
      });

      rememberAddressName(editingAddress.id, addressData.name);

      const addresses = await getUserAddresses();
      applySavedAddresses(Array.isArray(addresses) ? getNamedSavedAddresses(addresses) : []);
      setEditingAddress(null);
      toast.success("Address updated successfully!");
    } catch (error) {
      console.error("Error updating address:", error);
      toast.error("Failed to update address");
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    try {
      await deleteUserAddress(addressId);
      forgetAddressName(addressId);
      const addresses = await getUserAddresses();
      applySavedAddresses(Array.isArray(addresses) ? getNamedSavedAddresses(addresses) : []);
    } catch (error) {
      console.error("Error deleting address:", error);
      toast.error("Failed to delete address");
    }
  };

  const handleSetDefault = async (addressId: number) => {
    const current = savedAddresses.find((address) => address.id === addressId);
    if (!current || current.is_default || settingDefaultId !== null) return;

    const previous = savedAddresses;
    setSettingDefaultId(addressId);
    applySavedAddresses(
      savedAddresses.map((address) => ({
        ...address,
        is_default: address.id === addressId,
      }))
    );

    try {
      await setDefaultAddress(addressId);
    } catch (error) {
      console.error("Error setting default address:", error);
      applySavedAddresses(previous);
      toast.error("Failed to set default address");
      setSettingDefaultId(null);
      return;
    }

    try {
      const addresses = await getUserAddresses();
      if (Array.isArray(addresses)) {
        const defaultAddr = addresses.find((a: SavedAddress) => a.id === addressId);
        if (defaultAddr) {
          setDefaultAddressContext(defaultAddr);
          setAddressId(defaultAddr.id);
          setSelectedLocation(defaultAddr.address);
          if (typeof window !== "undefined") {
            localStorage.setItem("selectedAddressId", defaultAddr.id.toString());
            localStorage.setItem("defaultAddress", JSON.stringify(defaultAddr));
            localStorage.setItem("selectedLocation", defaultAddr.address);
          }
          if (defaultAddr.ondemand_delivery_available === false) {
            setShowDeliveryWarning(true);
          }
        }
        applySavedAddresses(getNamedSavedAddresses(addresses));
      }
    } catch (error) {
      console.error("Error refreshing addresses:", error);
    } finally {
      setSettingDefaultId(null);
    }
  };

  const homeAddress = findSlotAddress(savedAddresses, "home");
  const workAddress = findSlotAddress(savedAddresses, "work");
  const otherAddresses = getOtherNamedAddresses(savedAddresses, homeAddress, workAddress);

  if (unresolved) {
    return <AuthRetryScreen />;
  }

  if (isGuest) {
    return null;
  }

  if ((loading && !user) || loadingAddresses) {
    return <SavedAddressSkeleton />;
  }

  if (!user) {
    return null;
  }

  return (
    <Container className="py-8 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Title className="!text-2xl">Saved Addresses</Title>
            <p className="mt-1 text-sm text-gray-500">
              One address is used for delivery when you order.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-full"
            onClick={() => startAdd("")}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
          <SavedAddressRow
            address={homeAddress}
            label="Home"
            icon={<Home className="h-4 w-4" />}
            emptyHint="Add home address"
            onEmptyAdd={() => startAdd("Home")}
            busy={settingDefaultId !== null}
            onEdit={handleEditAddress}
            onDelete={handleDeleteAddress}
            onSetDefault={handleSetDefault}
          />
          <SavedAddressRow
            address={workAddress}
            label="Work"
            icon={<BriefcaseBusiness className="h-4 w-4" />}
            emptyHint="Add work address"
            onEmptyAdd={() => startAdd("Work")}
            busy={settingDefaultId !== null}
            onEdit={handleEditAddress}
            onDelete={handleDeleteAddress}
            onSetDefault={handleSetDefault}
          />
          {otherAddresses.map((address) => (
            <SavedAddressRow
              key={address.id}
              address={address}
              label={address.name || "Saved address"}
              icon={<Heart className="h-4 w-4" />}
              busy={settingDefaultId !== null}
              onEdit={handleEditAddress}
              onDelete={handleDeleteAddress}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      </div>

      <Dialog
        open={addPreset !== null}
        onOpenChange={(open) => {
          if (!open) setAddPreset(null);
        }}
      >
        <DialogContent
          mobileAsSheet
          sheetAutoHeight
          sheetResizable
          onDismiss={() => setAddPreset(null)}
          className="max-w-[95vw] sm:max-w-[600px] p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogDescription className="sr-only">
            Search or choose an address to save.
          </DialogDescription>
          {addPreset !== null && (
            <SavedAddressAddFlow
              onBack={() => setAddPreset(null)}
              onSaved={(addresses) => {
                applySavedAddresses(addresses);
                setAddPreset(null);
              }}
              existingAddresses={savedAddresses}
              presetName={addPreset}
            />
          )}
        </DialogContent>
      </Dialog>

      <AddressSelector
        isOpen={!!editingAddress}
        onClose={() => setEditingAddress(null)}
        onAddressSelect={handleUpdateAddress}
        title="Edit Address"
        description="Update your address details"
        editingAddress={editingAddress}
      />

      <DeliveryWarningDialog
        isOpen={showDeliveryWarning}
        onClose={() => setShowDeliveryWarning(false)}
      />
    </Container>
  );
};

const SavedAddressPage = () => (
  <GoogleMapsProvider>
    <SavedAddressPageContent />
  </GoogleMapsProvider>
);

export default SavedAddressPage;
