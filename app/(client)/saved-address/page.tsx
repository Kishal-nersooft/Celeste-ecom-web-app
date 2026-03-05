"use client";

import React, { useState, useEffect } from "react";
import Container from "@/components/Container";
import Title from "@/components/Title";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPinIcon, HomeIcon, BriefcaseBusiness, PlusIcon, EditIcon, TrashIcon } from "lucide-react";
import AddressSelector from "@/components/AddressSelector";
import DeliveryWarningDialog from "@/components/DeliveryWarningDialog";
import toast from "react-hot-toast";
import { getUserAddresses, addUserAddress, updateUserAddress, deleteUserAddress, setDefaultAddress } from "@/lib/api";
import { useLocation } from "@/contexts/LocationContext";

interface SavedAddress {
  id: number;
  address: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
  active?: boolean;
  name?: string;
  ondemand_delivery_available?: boolean;
  created_at: string;
  updated_at: string;
}

const SavedAddressPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { setDefaultAddress: setDefaultAddressContext, setAddressId, setSelectedLocation } = useLocation();
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [isAddressSelectorOpen, setIsAddressSelectorOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showDeliveryWarning, setShowDeliveryWarning] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?returnUrl=" + encodeURIComponent("/saved-address"));
    }
  }, [user, loading, router]);

  // Load saved addresses from backend – show all addresses (no filtering)
  useEffect(() => {
    const loadAddresses = async () => {
      if (user) {
        setLoadingAddresses(true);
        try {
          const addresses = await getUserAddresses();
          if (Array.isArray(addresses)) {
            const storedNames =
              typeof window !== "undefined"
                ? JSON.parse(localStorage.getItem("addressNames") || "{}")
                : {};
            const addressesWithNames = addresses.map((addr: SavedAddress) => ({
              ...addr,
              name: addr.name ?? storedNames[addr.id],
            }));
            setSavedAddresses(addressesWithNames);
          } else {
            setSavedAddresses([]);
            toast.error("Failed to load addresses: Invalid response format");
          }
        } catch (error) {
          console.error("Error loading addresses:", error);
          setSavedAddresses([]);
          toast.error("Failed to load addresses");
        } finally {
          setLoadingAddresses(false);
        }
      }
    };

    loadAddresses();
  }, [user]);

  const MAX_ADDRESSES = 10;

  const handleAddAddress = async (addressData: {
    name: string;
    fullAddress: string;
    coordinates: { lat: number; lng: number };
    city?: string;
  }) => {
    if (savedAddresses.length >= MAX_ADDRESSES) {
      toast.error(`You can save up to ${MAX_ADDRESSES} addresses. Delete one to add another.`);
      return;
    }

    const isFirstAddress = savedAddresses.length === 0;
    try {
      const newAddress = await addUserAddress({
        address: addressData.fullAddress,
        latitude: addressData.coordinates.lat,
        longitude: addressData.coordinates.lng,
        is_default: isFirstAddress,
        name: addressData.name,
      });

      if (newAddress?.ondemand_delivery_available === false) {
        setShowDeliveryWarning(true);
      }

      if (newAddress?.id && addressData.name && typeof window !== "undefined") {
        const storedNames = JSON.parse(localStorage.getItem("addressNames") || "{}");
        storedNames[newAddress.id] = addressData.name;
        localStorage.setItem("addressNames", JSON.stringify(storedNames));
      }

      if (newAddress && isFirstAddress) {
        setDefaultAddressContext(newAddress);
        setAddressId(newAddress.id);
        setSelectedLocation(newAddress.address);
        if (typeof window !== "undefined") {
          localStorage.setItem("selectedAddressId", newAddress.id.toString());
          localStorage.setItem("defaultAddress", JSON.stringify(newAddress));
          localStorage.setItem("selectedLocation", newAddress.address);
        }
      }

      const addresses = await getUserAddresses();
      if (Array.isArray(addresses)) {
        const storedNames =
          typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("addressNames") || "{}")
            : {};
        setSavedAddresses(
          addresses.map((addr: SavedAddress) => ({
            ...addr,
            name: addr.name ?? storedNames[addr.id],
          }))
        );
      } else {
        setSavedAddresses([]);
      }
      toast.success("Address saved successfully!");
    } catch (error) {
      console.error("Error adding address:", error);
      toast.error("Failed to save address");
    }
  };

  const handleEditAddress = (address: SavedAddress) => {
    setEditingAddress(address);
    setIsAddressSelectorOpen(true);
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

      if (addressData.name && typeof window !== "undefined") {
        const storedNames = JSON.parse(localStorage.getItem("addressNames") || "{}");
        storedNames[editingAddress.id] = addressData.name;
        localStorage.setItem("addressNames", JSON.stringify(storedNames));
      }

      const addresses = await getUserAddresses();
      if (Array.isArray(addresses)) {
        const storedNames =
          typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("addressNames") || "{}")
            : {};
        setSavedAddresses(
          addresses.map((addr: SavedAddress) => ({
            ...addr,
            name: addr.name ?? storedNames[addr.id],
          }))
        );
      } else {
        setSavedAddresses([]);
      }
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

      if (typeof window !== "undefined") {
        const storedNames = JSON.parse(localStorage.getItem("addressNames") || "{}");
        delete storedNames[addressId];
        localStorage.setItem("addressNames", JSON.stringify(storedNames));
      }

      const addresses = await getUserAddresses();
      if (Array.isArray(addresses)) {
        const storedNames =
          typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("addressNames") || "{}")
            : {};
        setSavedAddresses(
          addresses.map((addr: SavedAddress) => ({
            ...addr,
            name: addr.name ?? storedNames[addr.id],
          }))
        );
      } else {
        setSavedAddresses([]);
      }
      toast.success("Address deleted successfully!");
    } catch (error) {
      console.error("Error deleting address:", error);
      toast.error("Failed to delete address");
    }
  };

  const handleSetDefault = async (addressId: number) => {
    try {
      await setDefaultAddress(addressId);

      setSavedAddresses((prev) =>
        prev.map((addr) => ({ ...addr, is_default: addr.id === addressId }))
      );

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
        const storedNames =
          typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("addressNames") || "{}")
            : {};
        setSavedAddresses(
          addresses.map((addr: SavedAddress) => ({
            ...addr,
            name: addr.name ?? storedNames[addr.id],
            is_default: addr.id === addressId,
          }))
        );
      } else {
        setSavedAddresses([]);
      }
      toast.success("Default address updated!");
    } catch (error) {
      console.error("Error setting default address:", error);
      toast.error("Failed to set default address");
    }
  };

  const handleAddressSelect = (addressData: {
    name: string;
    fullAddress: string;
    coordinates: { lat: number; lng: number };
    city?: string;
  }) => {
    if (editingAddress) {
      handleUpdateAddress(addressData);
    } else {
      handleAddAddress(addressData);
    }
    setIsAddressSelectorOpen(false);
  };

  const getDisplayLabel = (addr: SavedAddress, index: number) =>
    addr.name || (addr.is_default ? "Default address" : `Address #${index + 1}`);

  const getAddressIcon = (address: string) => {
    const lowerAddress = address.toLowerCase();
    if (lowerAddress.includes('home') || lowerAddress.includes('house')) {
      return <HomeIcon className="h-5 w-5 text-blue-600" />;
    } else if (lowerAddress.includes('office') || lowerAddress.includes('work')) {
      return <BriefcaseBusiness className="h-5 w-5 text-green-600" />;
    }
    return <MapPinIcon className="h-5 w-5 text-gray-600" />;
  };

  if (loading || loadingAddresses) {
    return (
      <Container className="py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
      </Container>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Container className="py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Title className="!text-3xl">Saved Addresses</Title>
          {savedAddresses.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {savedAddresses.length} of {MAX_ADDRESSES} addresses
            </p>
          )}
        </div>
        <Button
          onClick={() => {
            if (savedAddresses.length >= MAX_ADDRESSES) {
              toast.error(`You can save up to ${MAX_ADDRESSES} addresses. Delete one to add another.`);
              return;
            }
            setEditingAddress(null);
            setIsAddressSelectorOpen(true);
          }}
          className="flex items-center gap-2"
          disabled={savedAddresses.length >= MAX_ADDRESSES}
        >
          <PlusIcon className="h-4 w-4" />
          Add New Address
        </Button>
      </div>

      {!Array.isArray(savedAddresses) || savedAddresses.length === 0 ? (
        <div className="text-center py-12">
          <MapPinIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No saved addresses</h3>
          <p className="text-gray-500 mb-6">Add your first address to get started</p>
          <Button 
            onClick={() => {
              setEditingAddress(null);
              setIsAddressSelectorOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Add Address
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {savedAddresses.map((address, index) => (
            <Card key={address.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getAddressIcon(address.address)}
                    <CardTitle className="text-lg">
                      {getDisplayLabel(address, index)}
                    </CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditAddress(address)}
                      className="h-8 w-8 p-0"
                    >
                      <EditIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAddress(address.id)}
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
                <p className="text-sm text-gray-600 mb-3">{address.address}</p>
                {!address.is_default && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(address.id)}
                    className="w-full"
                  >
                    Set as Default
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddressSelector
        isOpen={isAddressSelectorOpen}
        onClose={() => {
          setIsAddressSelectorOpen(false);
          setEditingAddress(null);
        }}
        onAddressSelect={handleAddressSelect}
        title={editingAddress ? "Edit Address" : "Add New Address"}
        description={editingAddress ? "Update your address details" : "Choose your address by searching or clicking on the map"}
        editingAddress={editingAddress}
      />

      {/* Delivery Warning Dialog */}
      <DeliveryWarningDialog 
        isOpen={showDeliveryWarning} 
        onClose={() => setShowDeliveryWarning(false)} 
      />
    </Container>
  );
};

export default SavedAddressPage;
