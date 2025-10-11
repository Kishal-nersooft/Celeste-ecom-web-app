"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import { Store } from "@/types/store";
import { getUserAddresses } from "@/lib/api";

interface LocationContextType {
  selectedLocation: string;
  setSelectedLocation: (location: string) => void;
  selectedStore: Store | null;
  setSelectedStore: (store: Store | null) => void;
  deliveryType: "pickup" | "delivery";
  setDeliveryType: (type: "pickup" | "delivery") => void;
  hasSelectedDeliveryType: boolean;
  setHasSelectedDeliveryType: (hasSelected: boolean) => void;
  defaultAddress: any | null;
  setDefaultAddress: (address: any | null) => void;
  addressId: number | null;
  setAddressId: (id: number | null) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(
  undefined
);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [selectedLocation, setSelectedLocation] = useState("Location");
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">(
    "delivery"
  );
  const [hasSelectedDeliveryType, setHasSelectedDeliveryType] = useState(false);
  const [defaultAddress, setDefaultAddress] = useState<any | null>(null);
  const [addressId, setAddressId] = useState<number | null>(null);

  // Memoized setters to prevent unnecessary re-renders
  const memoizedSetSelectedLocation = useCallback((location: string) => {
    setSelectedLocation((prev) => (prev === location ? prev : location));
  }, []);

  const memoizedSetSelectedStore = useCallback((store: Store | null) => {
    setSelectedStore((prev) => (prev === store ? prev : store));
  }, []);

  const memoizedSetDeliveryType = useCallback((type: "pickup" | "delivery") => {
    setDeliveryType((prev) => (prev === type ? prev : type));
  }, []);

  const memoizedSetHasSelectedDeliveryType = useCallback(
    (hasSelected: boolean) => {
      setHasSelectedDeliveryType((prev) =>
        prev === hasSelected ? prev : hasSelected
      );
    },
    []
  );

  const memoizedSetDefaultAddress = useCallback((address: any | null) => {
    setDefaultAddress((prev) => (prev === address ? prev : address));
  }, []);

  const memoizedSetAddressId = useCallback((id: number | null) => {
    setAddressId((prev) => (prev === id ? prev : id));
  }, []);

  // Load default address on mount
  useEffect(() => {
    const loadDefaultAddress = async () => {
      try {
        // First try to load from localStorage
        const savedAddressId = localStorage.getItem("selectedAddressId");
        const savedAddress = localStorage.getItem("selectedAddress");

        if (savedAddressId && savedAddress) {
          console.log("🔄 Loading address from localStorage:", {
            savedAddressId,
            savedAddress,
          });
          setAddressId(parseInt(savedAddressId));
          setSelectedLocation(savedAddress);
          console.log(
            "✅ Address loaded from localStorage - Address ID:",
            parseInt(savedAddressId)
          );
        }

        // Then load from backend to get full address data
        const addresses = await getUserAddresses();
        console.log("🔍 Backend addresses loaded:", addresses);

        if (addresses && addresses.length > 0) {
          // Find the default address or use the first one
          const defaultAddr =
            addresses.find((addr) => addr.is_default) || addresses[0];
          console.log("📍 Default address found:", defaultAddr);

          setDefaultAddress(defaultAddr);
          setAddressId(defaultAddr.id);
          setSelectedLocation(defaultAddr.address);

          // Save to localStorage for persistence
          localStorage.setItem("selectedAddressId", defaultAddr.id.toString());
          localStorage.setItem("selectedAddress", defaultAddr.address);
          console.log("💾 Address saved to localStorage:", {
            id: defaultAddr.id,
            address: defaultAddr.address,
          });
        } else {
          console.log("⚠️ No addresses found in backend");
        }
      } catch (error) {
        console.warn("Could not load default address:", error);
      }
    };

    loadDefaultAddress();
  }, []);

  const contextValue = useMemo(
    () => ({
      selectedLocation,
      setSelectedLocation: memoizedSetSelectedLocation,
      selectedStore,
      setSelectedStore: memoizedSetSelectedStore,
      deliveryType,
      setDeliveryType: memoizedSetDeliveryType,
      hasSelectedDeliveryType,
      setHasSelectedDeliveryType: memoizedSetHasSelectedDeliveryType,
      defaultAddress,
      setDefaultAddress: memoizedSetDefaultAddress,
      addressId,
      setAddressId: memoizedSetAddressId,
    }),
    [
      selectedLocation,
      memoizedSetSelectedLocation,
      selectedStore,
      memoizedSetSelectedStore,
      deliveryType,
      memoizedSetDeliveryType,
      hasSelectedDeliveryType,
      memoizedSetHasSelectedDeliveryType,
      defaultAddress,
      memoizedSetDefaultAddress,
      addressId,
      memoizedSetAddressId,
    ]
  );

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
};
