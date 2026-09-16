"use client";

import React, { useEffect, useState } from "react";
import Container from "@/components/Container";
import Title from "@/components/Title";
import { useAuth } from "@/components/FirebaseAuthProvider";
import AuthRetryScreen from "@/components/AuthRetryScreen";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";
import { BriefcaseBusiness, HeartIcon, HomeIcon, PlusIcon, EditIcon, TrashIcon } from "lucide-react";
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
const CARD_ICON = "h-4 w-4 sm:h-5 sm:w-5 text-gray-600 shrink-0";
const CARD_GRID = "grid gap-4 md:grid-cols-2 lg:grid-cols-3";

function SavedAddressSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Container className="py-10">
      <div className="flex justify-between items-center mb-8">
        <div className="space-y-2">
          <div className="h-9 w-56 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-6 w-10 bg-gray-200 rounded animate-pulse" />
      </div>

      <div className={CARD_GRID}>
        {Array.from({ length: count }).map((_, idx) => (
          <Card key={idx} className="relative h-full">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="h-5 w-5 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="flex gap-1">
                  <div className="h-8 w-8 rounded bg-gray-200 animate-pulse" />
                  <div className="h-8 w-8 rounded bg-gray-200 animate-pulse" />
                </div>
              </div>
              <div className="mt-2 h-5 w-20 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-3">
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-4/5 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-9 w-full bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </Container>
  );
}

function SavedAddressCard({
  address,
  label,
  icon,
  emptyHint,
  onEmptyAdd,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address?: SavedAddress;
  label: string;
  icon: React.ReactNode;
  emptyHint?: string;
  onEmptyAdd?: () => void;
  onEdit: (address: SavedAddress) => void;
  onDelete: (addressId: number) => void;
  onSetDefault: (addressId: number) => void;
}) {
  if (!address) {
    return (
      <Card className="relative h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 min-w-0">
            {icon}
            <CardTitle className="text-lg truncate">{label}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-3">{emptyHint}</p>
          <Button variant="outline" size="sm" className="w-full" onClick={onEmptyAdd}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add address
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative h-full min-w-0">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {icon}
            <CardTitle className="text-lg truncate">{label}</CardTitle>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(address)}
              className="h-8 w-8 p-0"
            >
              <EditIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(address.id)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {address.is_default && (
          <Badge variant="default" className="w-fit">
            Default
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-3 break-words">{address.address}</p>
        {!address.is_default && (
          <Button variant="outline" size="sm" onClick={() => onSetDefault(address.id)} className="w-full">
            Set as Default
          </Button>
        )}
      </CardContent>
    </Card>
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

  useEffect(() => {
    if (isGuest) {
      router.push("/login?returnUrl=" + encodeURIComponent("/saved-address"));
    }
  }, [isGuest, router]);

  useEffect(() => {
    if (!user) return;

    const cached = peekUserAddressesCache({ allowStale: true });
    if (cached) {
      setSavedAddresses(getNamedSavedAddresses(cached));
      setLoadingAddresses(false);
    } else {
      setLoadingAddresses(true);
    }

    let cancelled = false;
    getUserAddresses()
      .then((addresses) => {
        if (cancelled) return;
        if (Array.isArray(addresses)) {
          setSavedAddresses(getNamedSavedAddresses(addresses));
        } else {
          setSavedAddresses([]);
        }
      })
      .catch((error) => {
        console.error("Error loading addresses:", error);
        if (!cancelled) {
          setSavedAddresses([]);
          toast.error("Failed to load addresses");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAddresses(false);
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
      setSavedAddresses(Array.isArray(addresses) ? getNamedSavedAddresses(addresses) : []);
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
      setSavedAddresses(Array.isArray(addresses) ? getNamedSavedAddresses(addresses) : []);
      toast.success("Address deleted successfully!");
    } catch (error) {
      console.error("Error deleting address:", error);
      toast.error("Failed to delete address");
    }
  };

  const handleSetDefault = async (addressId: number) => {
    try {
      await setDefaultAddress(addressId);

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
        setSavedAddresses(getNamedSavedAddresses(addresses));
      } else {
        setSavedAddresses([]);
      }
      toast.success("Default address updated!");
    } catch (error) {
      console.error("Error setting default address:", error);
      toast.error("Failed to set default address");
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
    <Container className="py-10">
      <div className="flex justify-between items-center mb-8 min-w-0 gap-3">
        <div>
          <Title className="!text-3xl">Saved Addresses</Title>
          {savedAddresses.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {savedAddresses.length} of {MAX_ADDRESSES} addresses
            </p>
          )}
        </div>
        <button
          type="button"
          className="text-blue-600 text-sm sm:text-base font-medium shrink-0"
          onClick={() => startAdd("")}
        >
          Add
        </button>
      </div>

      <div className={CARD_GRID}>
        <SavedAddressCard
          address={homeAddress}
          label="Home"
          icon={<HomeIcon className={CARD_ICON} />}
          emptyHint="Add home address"
          onEmptyAdd={() => startAdd("Home")}
          onEdit={handleEditAddress}
          onDelete={handleDeleteAddress}
          onSetDefault={handleSetDefault}
        />
        <SavedAddressCard
          address={workAddress}
          label="Work"
          icon={<BriefcaseBusiness className={CARD_ICON} />}
          emptyHint="Add work address"
          onEmptyAdd={() => startAdd("Work")}
          onEdit={handleEditAddress}
          onDelete={handleDeleteAddress}
          onSetDefault={handleSetDefault}
        />
      </div>

      {otherAddresses.length > 0 && (
        <div className={`${CARD_GRID} mt-6`}>
          {otherAddresses.map((address) => (
            <SavedAddressCard
              key={address.id}
              address={address}
              label={address.name || "Saved address"}
              icon={<HeartIcon className={CARD_ICON} />}
              onEdit={handleEditAddress}
              onDelete={handleDeleteAddress}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}

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
                setSavedAddresses(addresses);
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
