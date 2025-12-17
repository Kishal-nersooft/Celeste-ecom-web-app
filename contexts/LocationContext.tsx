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
import { getUserAddresses, addUserAddress } from "@/lib/api";
import { useAuth } from "@/components/FirebaseAuthProvider";

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
  isLocationLoading: boolean;
  isLocationReady: boolean; // True when we have valid location data
  hasLocationSelected: boolean; // True if user has ever selected a location
}

const LocationContext = createContext<LocationContextType | undefined>(
  undefined
);

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  
  // Initialize with default values to prevent hydration mismatch
  const [selectedLocation, setSelectedLocation] = useState("Location");
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery">("delivery");
  const [hasSelectedDeliveryType, setHasSelectedDeliveryType] = useState(false);
  const [defaultAddress, setDefaultAddress] = useState<any | null>(null);
  const [addressId, setAddressId] = useState<number | null>(null);
  
  // Add loading state for better UX
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  
  // Check if location is ready (has valid data)
  const isLocationReady = useMemo(() => {
    return !!(defaultAddress && defaultAddress.latitude && defaultAddress.longitude);
  }, [defaultAddress]);

  // Check if user has ever selected a location (for first visit detection)
  const hasLocationSelected = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const savedAddress = localStorage.getItem("defaultAddress");
    const savedLocation = localStorage.getItem("selectedLocation");
    return !!(savedAddress || (savedLocation && savedLocation !== "Location"));
  }, [defaultAddress, selectedLocation]);

  // Persistence functions
  const saveToLocalStorage = useCallback((key: string, value: any) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      } catch (error) {
        console.warn(`Failed to save ${key} to localStorage:`, error);
      }
    }
  }, []);

  const loadFromLocalStorage = useCallback((key: string) => {
    if (typeof window !== 'undefined') {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (error) {
        console.warn(`Failed to load ${key} from localStorage:`, error);
        return null;
      }
    }
    return null;
  }, []);

  // Memoized setters to prevent unnecessary re-renders
  const memoizedSetSelectedLocation = useCallback((location: string) => {
    setSelectedLocation((prev) => {
      if (prev !== location) {
        saveToLocalStorage("selectedLocation", location);
        return location;
      }
      return prev;
    });
  }, [saveToLocalStorage]);

  const memoizedSetSelectedStore = useCallback((store: Store | null) => {
    setSelectedStore((prev) => {
      if (prev !== store) {
        saveToLocalStorage("selectedStore", store);
        return store;
      }
      return prev;
    });
  }, [saveToLocalStorage]);

  const memoizedSetDeliveryType = useCallback((type: "pickup" | "delivery") => {
    setDeliveryType((prev) => {
      if (prev !== type) {
        saveToLocalStorage("deliveryType", type);
        return type;
      }
      return prev;
    });
  }, [saveToLocalStorage]);

  const memoizedSetHasSelectedDeliveryType = useCallback(
    (hasSelected: boolean) => {
      setHasSelectedDeliveryType((prev) => {
        if (prev !== hasSelected) {
          saveToLocalStorage("hasSelectedDeliveryType", hasSelected);
          return hasSelected;
        }
        return prev;
      });
    },
    [saveToLocalStorage]
  );

  const memoizedSetDefaultAddress = useCallback((address: any | null) => {
    setDefaultAddress((prev: any) => {
      if (prev !== address) {
        saveToLocalStorage("defaultAddress", address);
        return address;
      }
      return prev;
    });
  }, [saveToLocalStorage]);

  const memoizedSetAddressId = useCallback((id: number | null) => {
    setAddressId((prev) => {
      if (prev !== id) {
        saveToLocalStorage("selectedAddressId", id);
        return id;
      }
      return prev;
    });
  }, [saveToLocalStorage]);

  // Load from localStorage after hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLocation = localStorage.getItem("selectedLocation");
      const savedStore = localStorage.getItem("selectedStore");
      const savedDeliveryType = localStorage.getItem("deliveryType");
      const savedHasSelectedDeliveryType = localStorage.getItem("hasSelectedDeliveryType");
      const savedAddress = localStorage.getItem("defaultAddress");
      const savedAddressId = localStorage.getItem("selectedAddressId");

      if (savedLocation && savedLocation !== "Location") setSelectedLocation(savedLocation);
      if (savedStore) {
        try {
          setSelectedStore(JSON.parse(savedStore));
        } catch (e) {
          console.warn("Failed to parse saved store:", e);
        }
      }
      if (savedDeliveryType) setDeliveryType(savedDeliveryType as "pickup" | "delivery");
      if (savedHasSelectedDeliveryType) setHasSelectedDeliveryType(savedHasSelectedDeliveryType === "true");
      if (savedAddress) {
        try {
          setDefaultAddress(JSON.parse(savedAddress));
        } catch (e) {
          console.warn("Failed to parse saved address:", e);
        }
      }
      if (savedAddressId) setAddressId(parseInt(savedAddressId));
    }
  }, []);

  // Load default address from backend only if user is logged in
  useEffect(() => {
    const loadDefaultAddress = async () => {
      // Wait for auth to finish loading
      if (authLoading) return;
      
      // Only load from backend if user is logged in
      if (!user) {
        // If not logged in, check if we have cached location data
        if (defaultAddress && defaultAddress.latitude && defaultAddress.longitude) {
          setIsLocationLoading(false);
          return;
        }
        // No location data and not logged in - don't try to load from backend
        setIsLocationLoading(false);
        return;
      }

      setIsLocationLoading(true);
      
      try {
        // Check if we have a cached location without an addressId (not saved to backend)
        const cachedAddress = defaultAddress;
        const hasAddressId = addressId !== null;
        
        // Load from backend to get fresh data (only if logged in)
        console.log("🔄 Loading fresh address data from backend...");
        const addresses = await getUserAddresses();
        console.log("🔍 Backend addresses loaded:", addresses);

        // Ensure addresses is an array
        const addressesArray = Array.isArray(addresses) ? addresses : [];
        
        if (addressesArray.length > 0) {
          // Find the default address or use the first one
          const defaultAddr =
            addressesArray.find((addr: any) => addr.is_default) || addressesArray[0];
          console.log("📍 Default address found:", defaultAddr);

          // Update all location data
          setDefaultAddress(defaultAddr);
          setAddressId(defaultAddr.id);
          setSelectedLocation(defaultAddr.address);
          setHasSelectedDeliveryType(true);

          console.log("💾 Location data updated and ready for stock loading");
        } else {
          console.log("⚠️ No addresses found in backend");
          
          // If no backend address but we have cached location without ID, sync it to backend
          if (cachedAddress && cachedAddress.latitude && cachedAddress.longitude && !hasAddressId) {
            console.log("🔄 Syncing cached location to backend...");
            try {
              const newAddress = await addUserAddress({
                address: cachedAddress.address || selectedLocation,
                latitude: cachedAddress.latitude,
                longitude: cachedAddress.longitude,
                is_default: true
              });
              
              // Handle different response structures
              let newAddressId = null;
              let savedAddressData = null;
              
              if (newAddress && newAddress.id) {
                newAddressId = newAddress.id;
                savedAddressData = newAddress;
              } else if (newAddress && newAddress.data && newAddress.data.id) {
                newAddressId = newAddress.data.id;
                savedAddressData = newAddress.data;
              } else if (Array.isArray(newAddress) && newAddress[0] && newAddress[0].id) {
                newAddressId = newAddress[0].id;
                savedAddressData = newAddress[0];
              }
              
              if (newAddressId && savedAddressData) {
                setAddressId(newAddressId);
                setDefaultAddress(savedAddressData);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('selectedAddressId', newAddressId.toString());
                  localStorage.setItem('defaultAddress', JSON.stringify(savedAddressData));
                }
                console.log("✅ Cached location synced to backend:", newAddressId);
              }
            } catch (syncError) {
              console.warn("Failed to sync cached location to backend:", syncError);
              // Keep the cached location even if sync fails
              if (cachedAddress) {
                setDefaultAddress(cachedAddress);
              }
            }
          } else if (typeof window !== 'undefined') {
            // No cached location, check localStorage
            const savedAddress = localStorage.getItem("defaultAddress");
            if (savedAddress) {
              try {
                const parsed = JSON.parse(savedAddress);
                if (parsed && parsed.latitude && parsed.longitude) {
                  // If this location doesn't have an ID, sync it
                  const savedAddressId = localStorage.getItem("selectedAddressId");
                  if (!savedAddressId && parsed.latitude && parsed.longitude) {
                    console.log("🔄 Syncing localStorage location to backend...");
                    try {
                      const newAddress = await addUserAddress({
                        address: parsed.address || selectedLocation,
                        latitude: parsed.latitude,
                        longitude: parsed.longitude,
                        is_default: true
                      });
                      
                      let newAddressId = null;
                      let savedAddressData = null;
                      
                      if (newAddress && newAddress.id) {
                        newAddressId = newAddress.id;
                        savedAddressData = newAddress;
                      } else if (newAddress && newAddress.data && newAddress.data.id) {
                        newAddressId = newAddress.data.id;
                        savedAddressData = newAddress.data;
                      } else if (Array.isArray(newAddress) && newAddress[0] && newAddress[0].id) {
                        newAddressId = newAddress[0].id;
                        savedAddressData = newAddress[0];
                      }
                      
                      if (newAddressId && savedAddressData) {
                        setAddressId(newAddressId);
                        setDefaultAddress(savedAddressData);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('selectedAddressId', newAddressId.toString());
                          localStorage.setItem('defaultAddress', JSON.stringify(savedAddressData));
                        }
                        console.log("✅ localStorage location synced to backend:", newAddressId);
                      } else {
                        setDefaultAddress(parsed);
                      }
                    } catch (syncError) {
                      console.warn("Failed to sync localStorage location to backend:", syncError);
                      setDefaultAddress(parsed);
                    }
                  } else {
                    setDefaultAddress(parsed);
                  }
                }
              } catch (e) {
                console.warn("Failed to parse cached address:", e);
              }
            }
          }
        }
      } catch (error) {
        console.warn("Could not load default address:", error);
        // If backend fails but we have cached location, keep it
        if (typeof window !== 'undefined') {
          const savedAddress = localStorage.getItem("defaultAddress");
          if (savedAddress) {
            try {
              const parsed = JSON.parse(savedAddress);
              if (parsed && parsed.latitude && parsed.longitude) {
                setDefaultAddress(parsed);
              }
            } catch (e) {
              console.warn("Failed to parse cached address:", e);
            }
          }
        }
      } finally {
        setIsLocationLoading(false);
      }
    };

    loadDefaultAddress();
  }, [user, authLoading]);

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
      isLocationLoading,
      isLocationReady,
      hasLocationSelected,
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
      isLocationLoading,
      isLocationReady,
      hasLocationSelected,
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
