"use client";

import React, { createContext, useCallback, useContext, useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DeliveryWarningDialog from "@/components/DeliveryWarningDialog";
import { GlobeIcon } from "lucide-react";
import deliveryIcon from "@/images/delivery-icon.png";
import pickupIcon from "@/images/pickup-icon.png";
import { GoogleMap, Marker } from "@react-google-maps/api";
import toast from "react-hot-toast";
import { ArrowLeft, LocateIcon, ChevronRight, MapPinIcon, ClockIcon, HeartIcon, Check } from "lucide-react";
import { useLocation } from "@/contexts/LocationContext";
import {
  getStores,
  getNearbyStores,
  getUserAddresses,
  addUserAddress,
  setDefaultAddress,
  peekUserAddressesCache,
} from "@/lib/api";
import SavedAddressPicker from "@/components/SavedAddressPicker";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { GoogleMapsProvider, useGoogleMaps } from "@/components/GoogleMapsProvider";
import { formatLocationLabel } from "@/lib/format-location-label";
import { addRecentLocation, loadRecentLocations, VISIBLE_RECENT_LOCATIONS } from "@/lib/recent-locations";
import { SRI_LANKA_MAP_CENTER, SRI_LANKA_MAP_ZOOM, fitMapToSriLanka } from "@/lib/google-maps-config";
import { getNamedSavedAddresses } from "@/lib/named-addresses";

// Store interface based on the backend schema
interface Store {
  id: string;
  name: string;
  description?: string;
  address: string;
  phone?: string;
  email?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Additional fields that might be returned by the API
  tags?: Array<{
    id: number;
    name: string;
    type: string;
  }>;
  distance?: number; // Distance in km when using nearby stores
}

export type LocationPickerStart = "mode" | "location";

function LocationRowSkeleton() {
  return (
    <div className="flex items-center gap-2 sm:gap-3 p-3 border rounded-lg overflow-hidden animate-pulse">
      <div className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-md bg-gray-200" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="h-3 w-1/3 rounded bg-gray-200" />
        <div className="h-2.5 w-2/3 rounded bg-gray-200" />
      </div>
    </div>
  );
}

interface LocationSelectorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationSelect: (location: string) => void;
  required?: boolean;
  startView?: LocationPickerStart;
}

const LocationSelectorDialog: React.FC<LocationSelectorDialogProps> = ({
  isOpen,
  onOpenChange,
  onLocationSelect,
  required = false,
  startView = "location",
}) => {
  const { user } = useAuth();
  const {
    selectedLocation,
    setSelectedLocation,
    selectedStore,
    setSelectedStore,
    deliveryType,
    setDeliveryType,
    setHasSelectedDeliveryType,
    hasSelectedDeliveryType,
    defaultAddress,
    setDefaultAddress: setDefaultAddressContext,
    addressId,
    setAddressId,
  } = useLocation();
  // Dialog toggle is local until the user confirms a store or delivery location.
  const [pickerMode, setPickerMode] = useState<"pickup" | "delivery">(deliveryType);
  const [pendingMode, setPendingMode] = useState<"pickup" | "delivery">("delivery");
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState(SRI_LANKA_MAP_CENTER);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [autocompleteService, setAutocompleteService] = useState<any>(null);
  const [geocoderService, setGeocoderService] = useState<google.maps.Geocoder | null>(null);
  const [recentLocations, setRecentLocations] = useState<string[]>(loadRecentLocations);
  const [currentView, setCurrentView] = useState<'mode' | 'main' | 'map' | 'savedAddresses' | 'outletMap'>(
    startView === "mode" ? "mode" : "main"
  );
  const [outletSearchQuery, setOutletSearchQuery] = useState("");
  const [selectedOutlet, setSelectedOutlet] = useState<Store | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [savedStep, setSavedStep] = useState<"list" | "search" | "map" | "confirm">("list");
  const [showDeliveryWarning, setShowDeliveryWarning] = useState(false);

  const { isLoaded, loadError } = useGoogleMaps();

  const handleSearchFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    requestAnimationFrame(() => {
      input.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };

  // Debug Google Maps loading
  React.useEffect(() => {
    if (loadError) {
      console.error('Google Maps load error:', loadError);
    }
  }, [isLoaded, loadError]);

  React.useEffect(() => {
    if (isLoaded && typeof window !== 'undefined' && window.google && window.google.maps) {
      
      const initServices = () => {
        try {
          // Initialize AutocompleteService (standard Places API)
          if (window.google.maps.places && window.google.maps.places.AutocompleteService) {
            try {
              const autocomplete = new window.google.maps.places.AutocompleteService();
              setAutocompleteService(autocomplete);
            } catch (error) {
              console.error('❌ Error creating AutocompleteService:', error);
            }
          } else {
            console.error('❌ AutocompleteService not available');
          }
          
          // Initialize Geocoder
          if (window.google.maps.Geocoder) {
            try {
              const geocoder = new window.google.maps.Geocoder();
              setGeocoderService(geocoder);
            } catch (error) {
              console.error('❌ Error creating Geocoder:', error);
            }
          } else {
            console.error('❌ Geocoder not available');
          }
        } catch (error) {
          console.error('❌ Error initializing Google Maps services:', error);
        }
      };
      
      // Initialize services with a small delay to ensure everything is ready
      setTimeout(() => {
        initServices();
      }, 100);
    }
  }, [isLoaded]);

  React.useEffect(() => {
    setRecentLocations(loadRecentLocations());
  }, [isOpen]);

  const wasOpenRef = useRef(false);
  const startViewOnOpenRef = useRef(startView);

  React.useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    const entryChangedWhileOpen =
      isOpen && wasOpenRef.current && startViewOnOpenRef.current !== startView;

    if (justOpened || entryChangedWhileOpen) {
      setPickerMode(deliveryType);
      setPendingMode(hasSelectedDeliveryType ? deliveryType : "delivery");
      setCurrentView(startView === "mode" ? "mode" : "main");
      startViewOnOpenRef.current = startView;
    }

    wasOpenRef.current = isOpen;
  }, [isOpen, startView, deliveryType, hasSelectedDeliveryType]);

  React.useEffect(() => {
    if (!isOpen || currentView !== "savedAddresses") {
      setSavedStep("list");
    }
  }, [isOpen, currentView]);

  // Prefetch saved addresses as soon as the picker opens so the list is ready
  React.useEffect(() => {
    if (!isOpen || !user) {
      if (!user) setSavedAddresses([]);
      return;
    }

    const cached = peekUserAddressesCache({ allowStale: true });
    if (cached) {
      setSavedAddresses(getNamedSavedAddresses(cached));
    }

    let cancelled = false;
    getUserAddresses()
      .then((addresses) => {
        if (cancelled) return;
        setSavedAddresses(Array.isArray(addresses) ? getNamedSavedAddresses(addresses) : []);
      })
      .catch((error) => {
        console.error("Error loading addresses:", error);
        if (!cancelled) setSavedAddresses([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, user]);

  // Fetch stores when pickup is selected and the dialog is open
  React.useEffect(() => {
    if (!isOpen || pickerMode !== "pickup" || stores.length > 0) {
      return;
    }

    let cancelled = false;
    const fetchStores = async () => {
      setLoadingStores(true);
      try {
        const allStores = await getStores();
        if (!cancelled && Array.isArray(allStores)) {
          setStores(allStores);
        }
      } catch (error) {
        console.error("Error fetching stores:", error);
        if (!cancelled) toast.error("Failed to load stores. Please try again.");
      } finally {
        if (!cancelled) setLoadingStores(false);
      }

      if (cancelled || typeof navigator === "undefined" || !navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const nearbyStores = await getNearbyStores(
              position.coords.latitude,
              position.coords.longitude,
              50
            );
            if (!cancelled && nearbyStores?.length) {
              setStores(nearbyStores);
            }
          } catch (error) {
            console.error("Error fetching nearby stores:", error);
          }
        },
        () => {},
        { timeout: 5000, enableHighAccuracy: false }
      );
    };

    fetchStores();
    return () => {
      cancelled = true;
    };
  }, [pickerMode, isOpen, stores.length]);

  const handleSelectLocation = async (location: string, description?: string) => {
    setDeliveryType('delivery');
    setHasSelectedDeliveryType(true);
    setRecentLocations(addRecentLocation(location, description));
    setSelectedLocation(location);
    onLocationSelect(location);
    onOpenChange(false);
    setPredictions([]);
    setCurrentView('main');

    // Auto-save the selected location as default address
    // Handle both address strings and coordinate strings
    if (location) {
      // Check if it's a coordinate string (Lat: X, Lng: Y)
      const coordMatch = location.match(/Lat:\s*([\d.-]+),\s*Lng:\s*([\d.-]+)/);
      
      if (coordMatch) {
        // Handle coordinate-based location
        const latitude = parseFloat(coordMatch[1]);
        const longitude = parseFloat(coordMatch[2]);
        
        const addressData = {
          address: location,
          latitude: latitude,
          longitude: longitude,
          is_default: true
        };
        
        // If user is logged in, save to backend
        if (user) {
          try {
            const newAddress = await addUserAddress({
              address: location,
              latitude: latitude,
              longitude: longitude,
              is_default: true
            });
            
            let addressId = null;
            let savedAddressData = null;
            
            if (newAddress && newAddress.id) {
              addressId = newAddress.id;
              savedAddressData = newAddress;
            } else if (newAddress && newAddress.data && newAddress.data.id) {
              addressId = newAddress.data.id;
              savedAddressData = newAddress.data;
            } else if (Array.isArray(newAddress) && newAddress[0] && newAddress[0].id) {
              addressId = newAddress[0].id;
              savedAddressData = newAddress[0];
            }
            
            // Check if ondemand delivery is not available (check newAddress directly first)
            if (newAddress?.ondemand_delivery_available === false) {
              setShowDeliveryWarning(true);
            }
            
            if (addressId && savedAddressData) {
              setAddressId(addressId);
              setDefaultAddressContext(savedAddressData);
              
              // Also check savedAddressData in case it's in nested structure
              if (savedAddressData.ondemand_delivery_available === false) {
                setShowDeliveryWarning(true);
              }
              
              if (typeof window !== 'undefined') {
                localStorage.setItem('selectedAddressId', addressId.toString());
                localStorage.setItem('defaultAddress', JSON.stringify(savedAddressData));
              }
              toast.success("Location saved!");
            } else {
              setDefaultAddressContext(addressData);
              if (typeof window !== 'undefined') {
                localStorage.setItem('defaultAddress', JSON.stringify(addressData));
              }
            }
          } catch (error) {
            console.error('Error saving coordinate location to backend:', error);
            setDefaultAddressContext(addressData);
            if (typeof window !== 'undefined') {
              localStorage.setItem('defaultAddress', JSON.stringify(addressData));
            }
            toast.success("Location saved!");
          }
        } else {
          // User not logged in - save to localStorage only
          setDefaultAddressContext(addressData);
          if (typeof window !== 'undefined') {
            localStorage.setItem('defaultAddress', JSON.stringify(addressData));
          }
          toast.success("Location saved!");
        }
      } else if (!location.startsWith('Lat:') && !location.startsWith('Lng:')) {
      try {
        // Get coordinates for the address using geocoder
        if (geocoderService) {
          geocoderService.geocode({ address: location }, async (results: any, status: any) => {
            if (status === "OK" && results[0]) {
              const { lat, lng } = results[0].geometry.location;
              const latitude = lat();
              const longitude = lng();
              
              // Create address data object for localStorage
              const addressData = {
                address: location,
                latitude: latitude,
                longitude: longitude,
                is_default: true
              };
              
              // If user is logged in, save to backend
              if (user) {
                try {
                  const newAddress = await addUserAddress({
                    address: location,
                    latitude: latitude,
                    longitude: longitude,
                    is_default: true // Set as default
                  });
                  
                  // Update context with new address ID
                  
                  // Check if ondemand delivery is not available (check newAddress directly first)
                  if (newAddress?.ondemand_delivery_available === false) {
                    setShowDeliveryWarning(true);
                  }
                  
                  // Handle different response structures
                  let addressId = null;
                  let savedAddressData = null;
                  
                  if (newAddress && newAddress.id) {
                    // Direct structure: { id: 456, address: "..." }
                    addressId = newAddress.id;
                    savedAddressData = newAddress;
                  } else if (newAddress && newAddress.data && newAddress.data.id) {
                    // Nested structure: { data: { id: 456, address: "..." } }
                    addressId = newAddress.data.id;
                    savedAddressData = newAddress.data;
                    // Also check nested data structure
                    if (savedAddressData.ondemand_delivery_available === false) {
                      setShowDeliveryWarning(true);
                    }
                  } else if (Array.isArray(newAddress) && newAddress[0] && newAddress[0].id) {
                    // Array structure: [{ id: 456, address: "..." }]
                    addressId = newAddress[0].id;
                    savedAddressData = newAddress[0];
                    // Also check array structure
                    if (savedAddressData.ondemand_delivery_available === false) {
                      setShowDeliveryWarning(true);
                    }
                  }
                  
                  if (addressId && savedAddressData) {
                    setAddressId(addressId);
                    setDefaultAddressContext(savedAddressData);
                    
                    // Save to localStorage for persistence
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('selectedAddressId', addressId.toString());
                      localStorage.setItem('defaultAddress', JSON.stringify(savedAddressData));
                      localStorage.setItem('selectedAddress', location);
                    }
                    
                    // Reload addresses to update the UI
                    const addresses = await getUserAddresses();
                    if (Array.isArray(addresses)) {
                      // Filter to only show manually saved addresses (with names) and the default address
                      const filteredAddresses = addresses.filter((addr: any) => {
                        return addr.name || addr.is_default;
                      });
                      setSavedAddresses(filteredAddresses);
                    } else {
                      setSavedAddresses([]);
                    }
                    
                    toast.success("Address saved as default!");
                  } else {
                    console.error('❌ Could not extract address ID from response:', newAddress);
                    // Fallback: save to localStorage only
                    setDefaultAddressContext(addressData);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('defaultAddress', JSON.stringify(addressData));
                    }
                  }
                } catch (error) {
                  console.error('Error saving address to backend:', error);
                  // Fallback: save to localStorage only
                  setDefaultAddressContext(addressData);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('defaultAddress', JSON.stringify(addressData));
                  }
                  toast.success("Location saved!");
                }
              } else {
                // User not logged in - save to localStorage only
                setDefaultAddressContext(addressData);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('defaultAddress', JSON.stringify(addressData));
                }
                toast.success("Location saved!");
              }
            }
          });
        }
      } catch (error) {
        console.error('Error geocoding address:', error);
        // Don't show error toast for auto-save, just log it
      }
      }
    }
  };

  const isCurrentSavedAddress = (address: any) => {
    if (addressId != null && address.id === addressId) return true;
    if (defaultAddress?.id != null && defaultAddress.id === address.id) return true;
    if (
      addressId == null &&
      selectedLocation &&
      selectedLocation !== "Location" &&
      address.address === selectedLocation
    ) {
      return true;
    }
    return false;
  };

  const closeLocationPicker = () => {
    onOpenChange(false);
    setCurrentView("main");
  };

  const applySavedAddress = (address: any, options?: { close?: boolean }) => {
    const shouldClose = options?.close !== false;
    if (isCurrentSavedAddress(address)) {
      if (shouldClose) closeLocationPicker();
      return;
    }

    setDeliveryType("delivery");
    setHasSelectedDeliveryType(true);
    setSelectedLocation(address.address);
    setAddressId(address.id);
    setDefaultAddressContext(address);
    onLocationSelect(address.address);
    if (shouldClose) closeLocationPicker();

    if (address.ondemand_delivery_available === false) {
      setShowDeliveryWarning(true);
    }

    void setDefaultAddress(address.id).catch((error) => {
      console.error("Error setting default address:", error);
    });
  };

  const handleSelectOutlet = (store: Store) => {
    setPickerMode('pickup');
    setDeliveryType('pickup');
    setHasSelectedDeliveryType(true);
    setSelectedOutlet(store);
    setSelectedStore(store);
    onOpenChange(false);
    setCurrentView('main');
  };

  const hasDeliverySelection = !!(defaultAddress?.latitude && defaultAddress?.longitude);
  const hasPickupSelection = !!selectedStore;

  const handleConfirmMode = () => {
    if (pendingMode === "delivery") {
      setDeliveryType("delivery");
      setHasSelectedDeliveryType(true);
      setPickerMode("delivery");
      if (hasDeliverySelection) {
        if (defaultAddress?.address) {
          setSelectedLocation(defaultAddress.address);
        }
        onOpenChange(false);
        return;
      }
      setCurrentView("main");
      return;
    }

    setPickerMode("pickup");
    if (hasPickupSelection) {
      setDeliveryType("pickup");
      setHasSelectedDeliveryType(true);
      onOpenChange(false);
      return;
    }
    setCurrentView("main");
  };

  const filteredStores = (stores || []).filter(store =>
    store.name.toLowerCase().includes(outletSearchQuery.toLowerCase()) ||
    store.address.toLowerCase().includes(outletSearchQuery.toLowerCase())
  );

  const storesWithCoordinates = (stores || []).filter(
    (store) =>
      Number.isFinite(store.location?.latitude) &&
      Number.isFinite(store.location?.longitude)
  );

  const fetchPredictions = React.useCallback(
    (input: string) => {
      if (!input || input.trim().length < 2) {
        setPredictions([]);
        return;
      }
      
      // Use AutocompleteService for location/place name suggestions
      // Use 'establishment' to search for named places (like "Nero") rather than street addresses
      if (autocompleteService && typeof autocompleteService.getPlacePredictions === 'function') {
        autocompleteService.getPlacePredictions(
          { 
            input: input.trim(),
            types: ['establishment'] // Only search for named places/locations, not street addresses
          },
          (predictions: any, status: any) => {
            if (status === "OK" && predictions) {
              setPredictions(predictions);
            } else if (status === "ZERO_RESULTS") {
              setPredictions([]);
            } else {
              setPredictions([]);
              console.error("AutocompleteService failed:", status);
            }
          }
        );
        return;
      }
      
      // Fallback: Use Geocoder only if AutocompleteService is not available
      if (!autocompleteService && geocoderService) {
        geocoderService.geocode(
          { address: input.trim() },
          (results: any, status: any) => {
            if (status === "OK" && results && results.length > 0) {
              const predictions = results.slice(0, 5).map((result: any, index: number) => ({
                place_id: `geocoder_${index}`,
                description: result.formatted_address,
                structured_formatting: {
                  main_text: result.formatted_address.split(',')[0],
                  secondary_text: result.formatted_address.split(',').slice(1).join(',').trim()
                }
              }));
              setPredictions(predictions);
            } else {
              setPredictions([]);
            }
          }
        );
      } else {
        setPredictions([]);
      }
    },
    [autocompleteService, geocoderService]
  );

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setSearchQuery(input);
    fetchPredictions(input);
  };

  const handlePredictionClick = (prediction: google.maps.places.AutocompletePrediction) => {
    setSearchQuery(prediction.description);
    setPredictions([]); // Clear predictions

    if (!geocoderService) return;

    geocoderService.geocode({ address: prediction.description }, (results: any, status: any) => {
      if (status === "OK" && results[0]) {
        const { lat, lng } = results[0].geometry.location;
        setMapCenter({ lat: lat(), lng: lng() });
        setMarkerPosition({ lat: lat(), lng: lng() });
        // Use prediction.description instead of formatted_address to show the place name
        handleSelectLocation(prediction.description, prediction.structured_formatting.secondary_text);
      } else {
        console.error("Geocode was not successful for the following reason: " + status);
      }
    });
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    if (!geocoderService) return;

    geocoderService.geocode({ address: searchQuery }, (results: any, status: any) => {
      if (status === "OK" && results[0]) {
        const { lat, lng } = results[0].geometry.location;
        setMapCenter({ lat: lat(), lng: lng() });
        setMarkerPosition({ lat: lat(), lng: lng() });
        handleSelectLocation(results[0].formatted_address, results[0].address_components.find((comp: any) => comp.types.includes('locality'))?.long_name);
      } else {
        console.error("Geocode was not successful for the following reason: " + status);
      }
    });
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const latLng = { lat: latitude, lng: longitude };
          setMapCenter(latLng);
          setMarkerPosition(latLng);
          if (geocoderService) {
            geocoderService.geocode({ location: latLng }, (results: any, status: any) => {
              if (status === "OK" && results[0]) {
                handleSelectLocation(results[0].formatted_address, results[0].address_components.find((comp: any) => comp.types.includes('locality'))?.long_name);
              } else {
                console.error("Reverse geocode was not successful: " + status);
                handleSelectLocation(`Lat: ${latitude}, Lng: ${longitude}`);
              }
            });
          } else {
            handleSelectLocation(`Lat: ${latitude}, Lng: ${longitude}`);
          }
        },
        (error) => {
          console.error("Error getting current location:", error);
          toast.error("Could not retrieve current location.");
        }
      );
    } else {
      toast.error("Geolocation is not supported by your browser.");
    }
  };

  const openSriLankaMap = (view: 'map' | 'outletMap') => {
    setMapCenter(SRI_LANKA_MAP_CENTER);
    setMarkerPosition(null);
    setCurrentView(view);
  };

  const handleMapClick = (e: any) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarkerPosition({ lat, lng });
    if (geocoderService) {
      geocoderService.geocode({ location: { lat, lng } }, (results: any, status: any) => {
        if (status === "OK" && results[0]) {
          handleSelectLocation(results[0].formatted_address, results[0].address_components.find((comp: any) => comp.types.includes('locality'))?.long_name);
        } else {
          console.error("Reverse geocode was not successful: " + status);
          handleSelectLocation(`Lat: ${lat}, Lng: ${lng}`);
        }
      });
    }
  };

  if (loadError) {
    console.error('Google Maps failed to load:', loadError);
  }

  return (
    <>
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && required) return;
        onOpenChange(open);
      }}
    >
      <DialogContent
        mobileAsSheet
        sheetDismissible={!required}
        sheetCompact={currentView === "mode"}
        sheetAutoHeight={currentView !== "mode"}
        sheetResizable={currentView !== "mode"}
        sheetSizeKey={`${currentView}-${savedStep}-${isOpen ? "open" : "closed"}`}
        hideCloseButton={required}
        onDismiss={() => {
          if (!required) onOpenChange(false);
        }}
        className="max-w-[95vw] sm:max-w-[600px] lg:max-h-[90vh] lg:overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (required || target?.closest("[data-radix-popper-content-wrapper]")) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (required) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement | null;
          if (required || target?.closest("[data-radix-popper-content-wrapper]")) {
            e.preventDefault();
          }
        }}
      >
        <DialogDescription className="sr-only">
          Search or choose a delivery location or pickup store.
        </DialogDescription>
        {currentView === 'mode' ? (
          <div className="px-1 pt-1 pb-2 sm:px-2">
            <DialogTitle className="text-center text-lg sm:text-xl font-bold mb-4">
              Shopping option
            </DialogTitle>
            <DialogDescription className="sr-only">
              Choose delivery or pickup
            </DialogDescription>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setPendingMode("delivery")}
                className={`flex items-center gap-3 w-full rounded-md border bg-white px-3 py-2.5 text-left text-sm sm:text-base font-medium text-black ${
                  pendingMode === "delivery"
                    ? "border-black"
                    : "border-gray-200"
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md shrink-0">
                  <Image src={deliveryIcon} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
                </span>
                <span className="flex-1">Delivery</span>
                {pendingMode === "delivery" && (
                  <Check className="h-4 w-4 text-black shrink-0" strokeWidth={2.5} aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={() => setPendingMode("pickup")}
                className={`flex items-center gap-3 w-full rounded-md border bg-white px-3 py-2.5 text-left text-sm sm:text-base font-medium text-black ${
                  pendingMode === "pickup"
                    ? "border-black"
                    : "border-gray-200"
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md shrink-0">
                  <Image src={pickupIcon} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
                </span>
                <span className="flex-1">Pickup</span>
                {pendingMode === "pickup" && (
                  <Check className="h-4 w-4 text-black shrink-0" strokeWidth={2.5} aria-hidden />
                )}
              </button>
            </div>
            <Button
              type="button"
              className="mt-4 w-full rounded-md"
              onClick={handleConfirmMode}
            >
              Confirm
            </Button>
          </div>
        ) : (
          <>
        {currentView === 'main' && (
          <div className="p-3 sm:p-4">
            <DialogTitle className="text-sm sm:text-base md:text-lg lg:text-xl font-bold mb-3">
              {pickerMode === 'pickup' ? 'Select Outlet' : 'Select Your Location'}
            </DialogTitle>
            {required && (
              <p className="text-[11px] sm:text-xs text-amber-700 mb-3">
                Please select a delivery location or pickup store to continue.
              </p>
            )}

            {pickerMode === 'pickup' ? (
              // Store Selection View
              <div>
                  <div className="relative mb-3">
                  <div className="flex items-center border rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                    <ArrowLeft className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                    <input
                      id="outlet-search"
                      type="text"
                      placeholder="Search Stores"
                      className="flex-grow border-none focus:ring-0 outline-none text-xs sm:text-sm"
                      value={outletSearchQuery}
                      onChange={(e) => setOutletSearchQuery(e.target.value)}
                      onFocus={handleSearchFocus}
                    />
                  </div>
                </div>

                {/* Select Outlet on Map Option */}
                <div className="flex items-center justify-between cursor-pointer py-2 sm:py-3 px-2 sm:px-3 mb-3 border rounded-lg hover:bg-gray-50 transition-colors"
                     onClick={() => openSriLankaMap('outletMap')}>
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <MapPinIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                    <span className="text-sm sm:text-base font-medium">Select Outlet on Map</span>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>

                <div className="space-y-2 lg:max-h-80 lg:overflow-y-auto">
                  {loadingStores ? (
                    <>
                      <LocationRowSkeleton />
                      <LocationRowSkeleton />
                      <LocationRowSkeleton />
                      <LocationRowSkeleton />
                    </>
                  ) : !filteredStores || filteredStores.length === 0 ? null : (
                    filteredStores.map((store) => (
                      <div
                        key={store.id}
                        className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleSelectOutlet(store)}
                      >
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
                          <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-xs sm:text-sm font-bold">
                            {store.name.charAt(0)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-xs sm:text-sm text-gray-900 truncate">{store.name}</h3>
                          <p className="text-[10px] sm:text-xs text-gray-600 truncate leading-tight">{store.address}</p>
                          <div className="flex items-center justify-between">
                            {store.phone && (
                              <p className="text-[9px] sm:text-xs text-gray-500 truncate">{store.phone}</p>
                            )}
                            {store.distance && (
                              <p className="text-[9px] sm:text-xs text-blue-600 font-medium">
                                {store.distance.toFixed(1)} km away
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              // Delivery Location Selection View
              <div>
                <div className="relative mb-3 sm:mb-4">
                  <div className="flex items-center border rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                    <ArrowLeft className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                    <input
                      id="location-search"
                      type="text"
                      placeholder="Search Location"
                      className="flex-grow border-none focus:ring-0 outline-none text-xs sm:text-sm"
                      value={searchQuery}
                      onChange={handleSearchInputChange}
                      onFocus={handleSearchFocus}
                    />
                  </div>
                  {predictions.length > 0 && (
                    <ul className="max-lg:relative max-lg:mt-2 max-lg:max-h-none max-lg:shadow-sm lg:absolute lg:top-full lg:left-0 lg:right-0 lg:mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 lg:max-h-60 overflow-y-auto">
                      {predictions.map((prediction) => (
                        <li
                          key={prediction.place_id}
                          className="px-3 sm:px-4 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                          onClick={() => handlePredictionClick(prediction)}
                        >
                          <div className="font-medium text-xs sm:text-sm">{prediction.structured_formatting.main_text}</div>
                          <div className="text-[10px] sm:text-xs text-gray-500">{prediction.structured_formatting.secondary_text}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                  <div className="flex items-center justify-between cursor-pointer py-2 hover:bg-gray-50 rounded-md px-2"
                       onClick={handleGetCurrentLocation}>
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <LocateIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                      <span className="text-sm sm:text-base">Your Current Location</span>
                    </div>
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                  <div className="flex items-center justify-between cursor-pointer py-2 hover:bg-gray-50 rounded-md px-2"
                       onClick={() => openSriLankaMap('map')}>
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <MapPinIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                      <span className="text-sm sm:text-base">Set on Map</span>
                    </div>
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                  <div className="flex items-center justify-between cursor-pointer py-2 hover:bg-gray-50 rounded-md px-2"
                       onClick={() => setCurrentView('savedAddresses')}>
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <HeartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                      <span className="text-sm sm:text-base">Saved Address</span>
                    </div>
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                </div>

                {recentLocations.length > 0 && (
                  <div>
                    <h3 className="text-sm sm:text-base text-gray-500 font-semibold mb-2 sm:mb-3">Recently Searched Locations</h3>
                    <ul
                      className={`space-y-2 sm:space-y-3 pr-1 ${
                        recentLocations.length > VISIBLE_RECENT_LOCATIONS
                          ? "lg:max-h-[10rem] lg:overflow-y-auto lg:overscroll-y-contain"
                          : ""
                      }`}
                    >
                      {recentLocations.map((locString) => {
                        const [name, description] = locString.split('|');
                        return (
                          <li
                            key={locString}
                            className="flex items-center justify-between cursor-pointer py-2 hover:bg-gray-50 rounded-md px-2"
                            onClick={() => handleSelectLocation(name, description)}
                          >
                            <div className="flex items-center space-x-2 sm:space-x-3">
                              <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                              <div className="min-w-0">
                                <p className="font-medium text-xs sm:text-sm truncate">{name.split(',')[0].trim()}</p>
                                {description && <p className="text-[10px] sm:text-xs text-gray-500 truncate">{description}</p>}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {currentView === 'map' && (
          <div className="p-3 sm:p-4 relative">
            <div className="relative flex items-center justify-center mb-3 sm:mb-4 min-h-9">
              <Button variant="ghost" size="icon" onClick={() => setCurrentView('main')} className="absolute left-0 shrink-0">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <DialogTitle className="text-lg sm:text-xl font-bold text-center">Set Location on Map</DialogTitle>
            </div>
            <div className="w-full h-64 sm:h-80 bg-gray-200 rounded-md overflow-hidden mb-3 sm:mb-4">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: "100%", height: "100%" }}
                  center={mapCenter}
                  zoom={SRI_LANKA_MAP_ZOOM}
                  onLoad={fitMapToSriLanka}
                  onClick={handleMapClick}
                >
                  {markerPosition && <Marker position={markerPosition} />}
                </GoogleMap>
              ) : (
                <div className="h-full w-full animate-pulse bg-gray-200" />
              )}
            </div>
            <Button className="mt-2 w-full text-xs sm:text-sm" onClick={() => markerPosition && handleSelectLocation(`Lat: ${markerPosition.lat}, Lng: ${markerPosition.lng}`, `Map Location`)}>Confirm Location</Button>
          </div>
        )}

        {currentView === 'outletMap' && (
          <div className="p-3 sm:p-4 relative">
            <div className="flex items-center mb-3 sm:mb-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentView('main')} className="mr-2">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <DialogTitle className="text-lg sm:text-xl font-bold">Select Outlet on Map</DialogTitle>
            </div>
            <div className="w-full h-64 sm:h-80 bg-gray-200 rounded-md overflow-hidden mb-3 sm:mb-4">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: "100%", height: "100%" }}
                  center={SRI_LANKA_MAP_CENTER}
                  zoom={SRI_LANKA_MAP_ZOOM}
                  onLoad={fitMapToSriLanka}
                >
                  {storesWithCoordinates.map((store) => (
                    <Marker
                      key={store.id}
                      position={{ lat: store.location.latitude, lng: store.location.longitude }}
                      onClick={() => handleSelectOutlet(store)}
                      title={store.name}
                    />
                  ))}
                </GoogleMap>
              ) : (
                <div className="h-full w-full animate-pulse bg-gray-200" />
              )}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 mb-2">
              Click on any marker to select that outlet
            </div>
            <div className="space-y-2 max-h-24 sm:max-h-32 overflow-y-auto">
              {(stores || []).map((store) => (
                <div
                  key={store.id}
                  className="flex items-center space-x-2 p-2 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleSelectOutlet(store)}
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
                    <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-[10px] sm:text-xs font-bold">
                      {store.name.charAt(0)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-xs sm:text-sm text-gray-900 truncate">{store.name}</h3>
                    <p className="text-[9px] sm:text-xs text-gray-600 truncate leading-tight">{store.address}</p>
                    {store.distance && (
                      <p className="text-[9px] sm:text-xs text-blue-600 font-medium">
                        {store.distance.toFixed(1)} km away
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'savedAddresses' && (
          <SavedAddressPicker
            onBack={() => setCurrentView("main")}
            user={user}
            savedAddresses={savedAddresses}
            applySavedAddress={applySavedAddress}
            onAddressesChange={setSavedAddresses}
            onSearchFocus={handleSearchFocus}
            onStepChange={setSavedStep}
          />
        )}
          </>
        )}
      </DialogContent>
    </Dialog>

    {/* Delivery Warning Dialog */}
    <DeliveryWarningDialog 
      isOpen={showDeliveryWarning} 
      onClose={() => setShowDeliveryWarning(false)} 
    />
    </>
  );
};

type LocationPickerContextValue = {
  openPicker: (start?: LocationPickerStart) => void;
};

const LocationPickerContext = createContext<LocationPickerContextValue | null>(null);

interface LocationSelectorProviderProps {
  onLocationSelect: (location: string) => void;
  children: React.ReactNode;
}

export function LocationSelectorProvider({
  onLocationSelect,
  children,
}: LocationSelectorProviderProps) {
  const { loading: authLoading } = useAuth();
  const { hasValidLocation, isLocationLoading } = useLocation();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isPickerMounted, setIsPickerMounted] = useState(false);
  const [pickerStart, setPickerStart] = useState<LocationPickerStart>("mode");

  const locationRequired = !hasValidLocation;
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/sign-in" ||
    pathname === "/sign-up" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/sign-in/") ||
    pathname.startsWith("/sign-up/");

  const openPicker = useCallback((start: LocationPickerStart = "location") => {
    setPickerStart(start);
    setIsOpen(true);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsPickerMounted(true);
      return;
    }

    const unmountTimer = setTimeout(() => {
      setIsPickerMounted(false);
    }, 350);

    return () => clearTimeout(unmountTimer);
  }, [isOpen]);

  useEffect(() => {
    if (authLoading || isLocationLoading || isAuthRoute) {
      return;
    }

    if (locationRequired && !isOpen) {
      const timer = setTimeout(() => {
        setPickerStart("mode");
        setIsOpen(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [authLoading, isLocationLoading, locationRequired, isOpen, isAuthRoute]);

  return (
    <LocationPickerContext.Provider value={{ openPicker }}>
      {children}
      {isPickerMounted && (
        <GoogleMapsProvider>
          <LocationSelectorDialog
            isOpen={isOpen}
            onOpenChange={handleOpenChange}
            onLocationSelect={onLocationSelect}
            required={locationRequired && !isAuthRoute}
            startView={pickerStart}
          />
        </GoogleMapsProvider>
      )}
    </LocationPickerContext.Provider>
  );
}

export function useLocationPicker() {
  return useContext(LocationPickerContext);
}

export function LocationSelectorTrigger({
  className,
}: {
  className?: string;
}) {
  const picker = useContext(LocationPickerContext);
  const { selectedLocation, defaultAddress, selectedStore, deliveryType } = useLocation();
  const displayLabel = formatLocationLabel(selectedLocation, {
    defaultAddress,
    selectedStore,
    deliveryType,
  });

  return (
    <Button
      type="button"
      variant="outline"
      title={selectedLocation !== "Location" ? selectedLocation : undefined}
      className={
        className ??
        "rounded-md min-w-[100px] sm:min-w-[120px] max-w-[140px] sm:max-w-[160px] flex items-center gap-1.5 sm:gap-2 overflow-hidden"
      }
      onClick={() => picker?.openPicker("location")}
    >
      <GlobeIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
      <span className="truncate text-left flex-1 min-w-0 text-xs sm:text-sm">
        {displayLabel}
      </span>
    </Button>
  );
}

interface LocationSelectorProps {
  onLocationSelect: (location: string) => void;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ onLocationSelect }) => {
  return (
    <LocationSelectorProvider onLocationSelect={onLocationSelect}>
      <LocationSelectorTrigger />
    </LocationSelectorProvider>
  );
};

export default LocationSelector;
