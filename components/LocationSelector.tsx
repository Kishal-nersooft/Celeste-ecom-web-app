import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import DeliveryWarningDialog from "@/components/DeliveryWarningDialog";
import { GlobeIcon } from "lucide-react"; // Assuming lucide-react is installed for icons
import { useLoadScript, GoogleMap, Marker } from "@react-google-maps/api"; // Import Google Maps components
import toast from "react-hot-toast"; // Assuming react-toastify is installed for toasts
import { ArrowLeft, LocateIcon, ChevronRight, MapPinIcon, ClockIcon, HeartIcon, HomeIcon, BriefcaseBusiness, PlusIcon } from "lucide-react";
import { useLocation } from "@/contexts/LocationContext";
import { getStores, getNearbyStores, getUserAddresses, addUserAddress, setDefaultAddress } from "@/lib/api";
import AddressSelector from "@/components/AddressSelector";
import { useAuth } from "@/components/FirebaseAuthProvider";
import Loader from "@/components/Loader";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyB1zVZ0tZ4O1VuOpmDp8ArAq6NZZBjcExI"; // Use NEXT_PUBLIC for client-side access
const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"]; // Define libraries array outside the component

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

interface LocationSelectorProps {
  onLocationSelect: (location: string) => void;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ onLocationSelect }) => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { selectedLocation, setSelectedLocation, setSelectedStore, deliveryType, setDeliveryType, setHasSelectedDeliveryType, defaultAddress, setDefaultAddress: setDefaultAddressContext, addressId, setAddressId, hasLocationSelected, isLocationReady } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [hasCheckedFirstVisit, setHasCheckedFirstVisit] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState({ lat: -34.397, lng: 150.644 }); // Default map center
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [autocompleteService, setAutocompleteService] = useState<any>(null);
  const [geocoderService, setGeocoderService] = useState<google.maps.Geocoder | null>(null);
  const [recentLocations, setRecentLocations] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<'main' | 'map' | 'savedAddresses' | 'outletMap'>('main'); // State to manage views
  const [outletSearchQuery, setOutletSearchQuery] = useState("");
  const [selectedOutlet, setSelectedOutlet] = useState<Store | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [isAddressSelectorOpen, setIsAddressSelectorOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [showDeliveryWarning, setShowDeliveryWarning] = useState(false);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_API_KEY,
    libraries, // Use the externally defined libraries array
    id: 'google-maps-script',
  });

  // Debug Google Maps loading
  React.useEffect(() => {
    console.log('Google Maps loading state:', { isLoaded, loadError });
    if (loadError) {
      console.error('Google Maps load error:', loadError);
    }
  }, [isLoaded, loadError]);

  React.useEffect(() => {
    if (isLoaded && typeof window !== 'undefined' && window.google && window.google.maps) {
      console.log('Google Maps loaded, initializing services...');
      
      const initServices = () => {
        try {
          // Initialize AutocompleteService (standard Places API)
          if (window.google.maps.places && window.google.maps.places.AutocompleteService) {
            try {
              const autocomplete = new window.google.maps.places.AutocompleteService();
              console.log('✅ AutocompleteService initialized');
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
              console.log('✅ Geocoder initialized');
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
    if (typeof window !== "undefined") {
      const storedLocations = localStorage.getItem("recentLocations");
      if (storedLocations) {
        try {
          setRecentLocations(JSON.parse(storedLocations));
        } catch (error) {
          console.warn("Failed to parse recent locations from localStorage:", error);
        }
      }
    }
  }, []);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("recentLocations", JSON.stringify(recentLocations));
      } catch (error) {
        console.warn("Failed to save recent locations to localStorage:", error);
      }
    }
  }, [recentLocations]);

  // Load saved addresses from backend
  React.useEffect(() => {
    const loadAddresses = async () => {
      if (user) {
        try {
          const addresses = await getUserAddresses();
          if (addresses && Array.isArray(addresses)) {
            // Load locally stored name mappings (in case backend doesn't return names)
            const storedNames = typeof window !== 'undefined' 
              ? JSON.parse(localStorage.getItem('addressNames') || '{}')
              : {};
            
            // Merge locally stored names with backend addresses
            const addressesWithNames = addresses.map((addr: any) => {
              if (!addr.name && storedNames[addr.id]) {
                return { ...addr, name: storedNames[addr.id] };
              }
              return addr;
            });
            
            // Filter to only show manually saved addresses (with names) and the default address
            const filteredAddresses = addressesWithNames.filter((addr: any) => {
              return addr.name || addr.is_default;
            });
            setSavedAddresses(filteredAddresses);
          } else {
            setSavedAddresses([]);
          }
        } catch (error) {
          console.error('Error loading addresses:', error);
          // Set empty array on error to prevent crashes
          setSavedAddresses([]);
        }
      } else {
        // Clear addresses if user is not logged in
        setSavedAddresses([]);
      }
    };

    loadAddresses();
  }, [user]);

  // Refresh saved addresses when dialog opens
  React.useEffect(() => {
    const loadAddresses = async () => {
      if (isOpen && user) {
        try {
          const addresses = await getUserAddresses();
          if (addresses && Array.isArray(addresses)) {
            // Load locally stored name mappings (in case backend doesn't return names)
            const storedNames = typeof window !== 'undefined' 
              ? JSON.parse(localStorage.getItem('addressNames') || '{}')
              : {};
            
            // Merge locally stored names with backend addresses
            const addressesWithNames = addresses.map((addr: any) => {
              if (!addr.name && storedNames[addr.id]) {
                return { ...addr, name: storedNames[addr.id] };
              }
              return addr;
            });
            
            // Filter to only show manually saved addresses (with names) and the default address
            const filteredAddresses = addressesWithNames.filter((addr: any) => {
              return addr.name || addr.is_default;
            });
            setSavedAddresses(filteredAddresses);
          } else {
            setSavedAddresses([]);
          }
        } catch (error) {
          console.error('Error loading addresses:', error);
          // Set empty array on error to prevent crashes
          setSavedAddresses([]);
        }
      }
    };

    loadAddresses();
  }, [isOpen, user]);

  // Auto-open location selector on first visit (when no location selected)
  // Use localStorage to ensure only one instance opens the dialog
  React.useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    // Only check once
    if (hasCheckedFirstVisit) return;
    
    // Check if any LocationSelector instance has already tried to open
    const globalCheckKey = 'locationSelectorAutoOpenAttempted';
    if (typeof window !== 'undefined' && localStorage.getItem(globalCheckKey)) {
      setHasCheckedFirstVisit(true);
      return;
    }
    
    // Check if user has selected a location
    // If no location selected and not ready, open the modal
    if (!hasLocationSelected && !isLocationReady) {
      // Mark that we've attempted to open (prevent other instances from opening)
      if (typeof window !== 'undefined') {
        localStorage.setItem(globalCheckKey, 'true');
      }
      
      // Small delay to ensure page is loaded
      const timer = setTimeout(() => {
        setIsOpen(true);
        setHasCheckedFirstVisit(true);
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      if (typeof window !== 'undefined') {
        localStorage.setItem(globalCheckKey, 'true');
      }
      setHasCheckedFirstVisit(true);
    }
  }, [authLoading, hasLocationSelected, isLocationReady, hasCheckedFirstVisit]);

  // Fetch stores when component mounts or when switching to pickup
  React.useEffect(() => {
    const fetchStores = async () => {
      if (deliveryType === 'pickup' && stores.length === 0) {
        setLoadingStores(true);
        try {
          // Try to get user's current location for nearby stores
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                  // First try to get nearby stores
                  const nearbyStores = await getNearbyStores(latitude, longitude, 50); // 50km radius
                  if (nearbyStores && nearbyStores.length > 0) {
                    setStores(nearbyStores);
                  } else {
                    // Fallback to all stores if no nearby stores found
                    const allStores = await getStores();
                    setStores(allStores);
                  }
                } catch (error) {
                  console.error("Error fetching nearby stores:", error);
                  // Fallback to all stores
                  const allStores = await getStores();
                  setStores(allStores);
                }
              },
              async (error) => {
                console.log("Geolocation error:", error);
                // Fallback to all stores if geolocation fails
                const allStores = await getStores();
                setStores(allStores);
              },
              { timeout: 5000, enableHighAccuracy: false }
            );
          } else {
            // Fallback to all stores if geolocation is not available
            const allStores = await getStores();
            setStores(allStores);
          }
        } catch (error) {
          console.error("Error fetching stores:", error);
          toast.error("Failed to load stores. Please try again.");
        } finally {
          setLoadingStores(false);
        }
      }
    };

    fetchStores();
  }, [deliveryType, stores.length]);

  const handleSelectLocation = async (location: string, description?: string) => {
    setSelectedLocation(location);
    onLocationSelect(location);
    setIsOpen(false);
    setPredictions([]); // Clear predictions after selection
    setCurrentView('main'); // Reset view to main after selection
    setHasCheckedFirstVisit(true); // Mark that we've checked first visit

    // Update recent locations
    setRecentLocations((prevLocations) => {
      const newLocationItem = description ? `${location}|${description}` : location;
      const newLocations = [newLocationItem, ...prevLocations.filter((loc) => loc.split('|')[0] !== location)];
      return newLocations.slice(0, 3); // Keep only the last 3 unique locations
    });

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
          console.log('✅ Coordinate location saved to localStorage (user not logged in)');
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
                  console.log('🔍 Full address response:', newAddress);
                  console.log('🚚 ondemand_delivery_available:', newAddress?.ondemand_delivery_available);
                  
                  // Check if ondemand delivery is not available (check newAddress directly first)
                  if (newAddress?.ondemand_delivery_available === false) {
                    console.log('⚠️ Showing delivery warning popup');
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
                    console.log('✅ Address ID set in context and localStorage:', addressId);
                    
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
                console.log('✅ Location saved to localStorage (user not logged in)');
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

  const handleAddressSelect = async (addressData: {
    name: string;
    fullAddress: string;
    coordinates: { lat: number; lng: number };
    city?: string;
  }) => {
    // Count only manually saved addresses (with names) - limit is 3
    const manuallySavedCount = savedAddresses.filter((addr: any) => addr.name).length;
    const MAX_MANUAL_ADDRESSES = 3;
    
    if (manuallySavedCount >= MAX_MANUAL_ADDRESSES) {
      toast.error(`You can only save up to ${MAX_MANUAL_ADDRESSES} addresses. Please delete an existing address first.`);
      return;
    }
    
    try {
      // Always send is_default: true when adding a new address (backend will return ondemand_delivery_available)
      const newAddress = await addUserAddress({
        address: addressData.fullAddress,
        latitude: addressData.coordinates.lat,
        longitude: addressData.coordinates.lng,
        is_default: true,
        name: addressData.name
      });
      
      console.log('✅ LocationSelector - New address created:', newAddress);
      
      // Check if ondemand delivery is not available
      if (newAddress?.ondemand_delivery_available === false) {
        setShowDeliveryWarning(true);
      }
      
      // Store the name locally in case backend doesn't return it
      if (newAddress?.id && addressData.name && typeof window !== 'undefined') {
        const storedNames = JSON.parse(localStorage.getItem('addressNames') || '{}');
        storedNames[newAddress.id] = addressData.name;
        localStorage.setItem('addressNames', JSON.stringify(storedNames));
      }
      
      // Update LocationContext
      if (newAddress) {
        setDefaultAddressContext(newAddress);
        setAddressId(newAddress.id);
        setSelectedLocation(newAddress.address);
        
        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedAddressId', newAddress.id.toString());
          localStorage.setItem('defaultAddress', JSON.stringify(newAddress));
          localStorage.setItem('selectedLocation', newAddress.address);
        }
      }
      
      // Reload addresses from backend
      const addresses = await getUserAddresses();
      if (Array.isArray(addresses)) {
        // Load locally stored name mappings
        const storedNames = typeof window !== 'undefined' 
          ? JSON.parse(localStorage.getItem('addressNames') || '{}')
          : {};
        
        // Merge locally stored names with backend addresses
        const addressesWithNames = addresses.map((addr: any) => {
          if (!addr.name && storedNames[addr.id]) {
            return { ...addr, name: storedNames[addr.id] };
          }
          return addr;
        });
        
        // Filter to only show manually saved addresses (with names) and the default address
        const filteredAddresses = addressesWithNames.filter((addr: any) => {
          return addr.name || addr.is_default;
        });
        setSavedAddresses(filteredAddresses);
      } else {
        setSavedAddresses([]);
      }

      // Select the new address
      handleSelectLocation(addressData.fullAddress, addressData.city);
      toast.success("Address saved successfully!");
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('Failed to save address');
    }
  };

  const handleSelectOutlet = (store: Store) => {
    console.log('Selected store:', store);
    setSelectedOutlet(store);
    setSelectedLocation(store.name);
    setSelectedStore(store); // Store the selected store in context
    onLocationSelect(store.name);
    setIsOpen(false);
    setCurrentView('main'); // Reset view to main after selection
    setHasCheckedFirstVisit(true); // Mark that we've checked first visit
    
    // Navigate to store page
    router.push(`/store/${store.id}`);
  };

  const filteredStores = (stores || []).filter(store =>
    store.name.toLowerCase().includes(outletSearchQuery.toLowerCase()) ||
    store.address.toLowerCase().includes(outletSearchQuery.toLowerCase())
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

  // Safety check: if there's a load error or maps aren't loaded, show a simple button
  if (loadError) {
    console.error('Google Maps failed to load:', loadError);
    return (
      <Button variant="outline" className="rounded-full min-w-[120px] sm:min-w-[160px] max-w-[200px] sm:max-w-[240px] flex items-center gap-1.5 sm:gap-2 overflow-hidden">
        <GlobeIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
        <span className="truncate text-left flex-1 min-w-0 text-xs sm:text-sm">{selectedLocation || "Location"}</span>
      </Button>
    );
  }
  
  if (!isLoaded) {
    return (
      <Button variant="outline" className="rounded-full min-w-[120px] sm:min-w-[160px] max-w-[200px] sm:max-w-[240px] flex items-center gap-1.5 sm:gap-2 overflow-hidden" disabled>
        <GlobeIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
        <span className="truncate text-left flex-1 min-w-0 text-xs sm:text-sm">Loading...</span>
      </Button>
    );
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full min-w-[120px] sm:min-w-[160px] max-w-[200px] sm:max-w-[240px] flex items-center gap-1.5 sm:gap-2 overflow-hidden">
          <GlobeIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="truncate text-left flex-1 min-w-0 text-xs sm:text-sm">{selectedLocation}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        {currentView === 'main' && (
          <div className="p-3 sm:p-4">
            <div className="flex justify-between items-center mb-3">
              <DialogTitle className="text-sm sm:text-base md:text-lg lg:text-xl font-bold">
                {deliveryType === 'pickup' ? 'Select Outlet' : 'Select Your Location'}
              </DialogTitle>
              <div className="flex bg-gray-100 rounded-full p-0.5 sm:p-1">
                <Button
                  variant="ghost"
                  className={`rounded-full px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-[10px] sm:text-xs md:text-sm ${deliveryType === 'pickup' ? 'bg-black text-white' : ''}`}
                  onClick={() => {
                    setDeliveryType('pickup');
                    setHasSelectedDeliveryType(true);
                  }}
                >
                  Pickup
                </Button>
                <Button
                  variant="ghost"
                  className={`rounded-full px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-[10px] sm:text-xs md:text-sm ${deliveryType === 'delivery' ? 'bg-black text-white' : ''}`}
                  onClick={() => {
                    setDeliveryType('delivery');
                    setHasSelectedDeliveryType(true);
                  }}
                >
                  Delivery
                </Button>
              </div>
            </div>

            {deliveryType === 'pickup' ? (
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
                    />
                  </div>
                </div>

                {/* Select Outlet on Map Option */}
                <div className="flex items-center justify-between cursor-pointer py-2 sm:py-3 px-2 sm:px-3 mb-3 border rounded-lg hover:bg-gray-50 transition-colors"
                     onClick={() => setCurrentView('outletMap')}>
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <MapPinIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                    <span className="text-sm sm:text-base font-medium">Select Outlet on Map</span>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>

                <div className="space-y-2 max-h-80 sm:max-h-96 overflow-y-auto">
                  {loadingStores ? (
                    <div className="flex items-center justify-center py-6 sm:py-8">
                      <Loader />
                    </div>
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
                    />
                  </div>
                  {predictions.length > 0 && (
                    <ul className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 mt-1 max-h-48 sm:max-h-60 overflow-y-auto">
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
                       onClick={() => setCurrentView('map')}>
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
                    <ul className="space-y-2 sm:space-y-3">
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
                              <div>
                                <p className="font-medium text-xs sm:text-sm">{name}</p>
                                {description && <p className="text-[10px] sm:text-xs text-gray-500">{description}</p>}
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
            <div className="flex items-center mb-3 sm:mb-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentView('main')} className="mr-2">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <DialogTitle className="text-lg sm:text-xl font-bold">Set Location on Map</DialogTitle>
            </div>
            <div className="w-full h-64 sm:h-80 bg-gray-200 rounded-md overflow-hidden mb-3 sm:mb-4">
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={mapCenter}
                zoom={10}
                onClick={handleMapClick}
              >
                {markerPosition && <Marker position={markerPosition} />}
              </GoogleMap>
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
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={stores && stores.length > 0 ? { lat: stores[0].location.latitude, lng: stores[0].location.longitude } : { lat: 6.841532143759643, lng: 79.96499475091696 }}
                zoom={12}
              >
                {(stores || []).map((store) => (
                  <Marker
                    key={store.id}
                    position={{ lat: store.location.latitude, lng: store.location.longitude }}
                    onClick={() => handleSelectOutlet(store)}
                    title={store.name}
                  />
                ))}
              </GoogleMap>
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
          <div className="p-3 sm:p-4 relative">
            <div className="flex items-center mb-3 sm:mb-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentView('main')} className="mr-2">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <DialogTitle className="text-lg sm:text-xl font-bold">Saved Addresses</DialogTitle>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {savedAddresses.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <MapPinIcon className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No saved addresses</h3>
                  <p className="text-gray-500 mb-3 sm:mb-4 text-sm sm:text-base">Add your first address to get started</p>
                </div>
              ) : (
                savedAddresses.map((address) => (
                  <div 
                    key={address.id} 
                    className="flex flex-col border rounded-md p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => handleSelectLocation(address.address, address.address)}
                    >
                      <div className="flex items-center space-x-2 sm:space-x-3 flex-1">
                        {address.name?.toLowerCase().includes('home') || address.name?.toLowerCase().includes('house') || address.address.toLowerCase().includes('home') || address.address.toLowerCase().includes('house') ? (
                          <HomeIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        ) : address.name?.toLowerCase().includes('office') || address.name?.toLowerCase().includes('work') || address.address.toLowerCase().includes('office') || address.address.toLowerCase().includes('work') ? (
                          <BriefcaseBusiness className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        ) : (
                          <MapPinIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-base font-medium truncate">
                              {address.name || (address.is_default ? "Default Address" : `Address ${address.id}`)}
                            </span>
                            {address.is_default && (
                              <span className="text-[9px] sm:text-xs bg-green-100 text-green-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap">Default</span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 truncate mt-0.5">{address.address}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0 ml-2" />
                    </div>
                    {!address.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 text-xs sm:text-sm"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await setDefaultAddress(address.id);
                            
                            // Update LocationContext
                            setDefaultAddressContext(address);
                            setAddressId(address.id);
                            setSelectedLocation(address.address);
                            
                            // Save to localStorage
                            if (typeof window !== 'undefined') {
                              localStorage.setItem('selectedAddressId', address.id.toString());
                              localStorage.setItem('defaultAddress', JSON.stringify(address));
                              localStorage.setItem('selectedLocation', address.address);
                            }
                            
                            // Check if ondemand delivery is not available
                            if (address.ondemand_delivery_available === false) {
                              setShowDeliveryWarning(true);
                            }
                            
                            // Reload addresses to update the UI
                            const addresses = await getUserAddresses();
                            if (Array.isArray(addresses)) {
                              // Load locally stored name mappings
                              const storedNames = typeof window !== 'undefined' 
                                ? JSON.parse(localStorage.getItem('addressNames') || '{}')
                                : {};
                              
                              // Merge locally stored names with backend addresses
                              const addressesWithNames = addresses.map((addr: any) => {
                                if (!addr.name && storedNames[addr.id]) {
                                  return { ...addr, name: storedNames[addr.id] };
                                }
                                return addr;
                              });
                              
                              const filteredAddresses = addressesWithNames.filter((addr: any) => {
                                return addr.name || addr.is_default;
                              });
                              setSavedAddresses(filteredAddresses);
                            }
                            
                            toast.success("Default address updated!");
                          } catch (error) {
                            console.error('Error setting default address:', error);
                            toast.error('Failed to set default address');
                          }
                        }}
                      >
                        Set as Default
                      </Button>
                    )}
                  </div>
                ))
              )}
              <Button 
                className="w-full mt-3 sm:mt-4 flex items-center gap-2 text-xs sm:text-sm" 
                onClick={() => setIsAddressSelectorOpen(true)}
              >
                <PlusIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                Add New Address
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    <AddressSelector
      isOpen={isAddressSelectorOpen}
      onClose={() => setIsAddressSelectorOpen(false)}
      onAddressSelect={handleAddressSelect}
      title="Add New Address"
      description="Choose your address by searching or clicking on the map"
    />

    {/* Delivery Warning Dialog */}
    <DeliveryWarningDialog 
      isOpen={showDeliveryWarning} 
      onClose={() => setShowDeliveryWarning(false)} 
    />
    </>
  );
};

export default LocationSelector;
