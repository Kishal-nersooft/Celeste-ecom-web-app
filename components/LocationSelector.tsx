import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GlobeIcon } from "lucide-react"; // Assuming lucide-react is installed for icons
import { useLoadScript, GoogleMap, Marker } from "@react-google-maps/api"; // Import Google Maps components
import toast from "react-hot-toast"; // Assuming react-toastify is installed for toasts
import { ArrowLeft, LocateIcon, ChevronRight, MapPinIcon, ClockIcon, HeartIcon, HomeIcon, BriefcaseBusiness, PlusIcon } from "lucide-react";
import { useLocation } from "@/contexts/LocationContext";
import { getStores, getNearbyStores, getUserAddresses, addUserAddress } from "@/lib/api";
import AddressSelector from "@/components/AddressSelector";
import { useAuth } from "@/components/FirebaseAuthProvider";

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
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { selectedLocation, setSelectedLocation, setSelectedStore, deliveryType, setDeliveryType, setHasSelectedDeliveryType, defaultAddress, setDefaultAddress, addressId, setAddressId } = useLocation();
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
    if (isLoaded && window.google) {
      console.log('Google Maps loaded, initializing services...');
      console.log('Available services:', {
        AutocompleteService: !!window.google.maps.places.AutocompleteService,
        Geocoder: !!window.google.maps.Geocoder,
        PlacesService: !!window.google.maps.places.PlacesService
      });
      
      // Add a small delay to ensure Google Maps API is fully loaded
      const initServices = () => {
        // Initialize AutocompleteSuggestion (new API)
        if (window.google.maps.places.AutocompleteSuggestion) {
          try {
            const autocomplete = new window.google.maps.places.AutocompleteSuggestion();
            console.log('AutocompleteSuggestion created:', autocomplete);
            console.log('AutocompleteSuggestion methods:', Object.getOwnPropertyNames(autocomplete));
            setAutocompleteService(autocomplete);
          } catch (error) {
            console.error('Error creating AutocompleteSuggestion:', error);
            // Fallback to AutocompleteService if available
            if (window.google.maps.places.AutocompleteService) {
              try {
                const fallbackAutocomplete = new window.google.maps.places.AutocompleteService();
                console.log('Fallback AutocompleteService created:', fallbackAutocomplete);
                setAutocompleteService(fallbackAutocomplete);
              } catch (fallbackError) {
                console.error('Error creating fallback AutocompleteService:', fallbackError);
              }
            }
          }
        } else if (window.google.maps.places.AutocompleteService) {
          // Fallback to old API if new one is not available
          try {
            const autocomplete = new window.google.maps.places.AutocompleteService();
            console.log('Fallback AutocompleteService created:', autocomplete);
            setAutocompleteService(autocomplete);
          } catch (error) {
            console.error('Error creating fallback AutocompleteService:', error);
          }
        } else {
          console.error('Neither AutocompleteSuggestion nor AutocompleteService available');
        }
        
        // Initialize Geocoder
        if (window.google.maps.Geocoder) {
          try {
            const geocoder = new window.google.maps.Geocoder();
            console.log('Geocoder created:', geocoder);
            setGeocoderService(geocoder);
          } catch (error) {
            console.error('Error creating Geocoder:', error);
          }
        }
      };
      
      // Try immediately
      initServices();
      
      // Also try after a short delay as a fallback
      setTimeout(initServices, 100);
    }
  }, [isLoaded]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const storedLocations = localStorage.getItem("recentLocations");
      if (storedLocations) {
        setRecentLocations(JSON.parse(storedLocations));
      }
    }
  }, []);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("recentLocations", JSON.stringify(recentLocations));
    }
  }, [recentLocations]);

  // Load saved addresses from backend
  React.useEffect(() => {
    const loadAddresses = async () => {
      if (user) {
        try {
          const addresses = await getUserAddresses();
          setSavedAddresses(addresses);
        } catch (error) {
          console.error('Error loading addresses:', error);
        }
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
          setSavedAddresses(addresses);
        } catch (error) {
          console.error('Error loading addresses:', error);
        }
      }
    };

    loadAddresses();
  }, [isOpen, user]);

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

    // Update recent locations
    setRecentLocations((prevLocations) => {
      const newLocationItem = description ? `${location}|${description}` : location;
      const newLocations = [newLocationItem, ...prevLocations.filter((loc) => loc.split('|')[0] !== location)];
      return newLocations.slice(0, 3); // Keep only the last 3 unique locations
    });

    // Auto-save the selected location as default address if it's a real address (not coordinates)
    if (location && !location.startsWith('Lat:') && !location.startsWith('Lng:')) {
      try {
        // Get coordinates for the address using geocoder
        if (geocoderService) {
          geocoderService.geocode({ address: location }, async (results: any, status: any) => {
            if (status === "OK" && results[0]) {
              const { lat, lng } = results[0].geometry.location;
              
              // Save as default address
              const newAddress = await addUserAddress({
                address: location,
                latitude: lat(),
                longitude: lng(),
                is_default: true // Set as default
              });
              
              // Update context with new address ID
              console.log('🔍 Full address response:', newAddress);
              
              // Handle different response structures
              let addressId = null;
              let addressData = null;
              
              if (newAddress && newAddress.id) {
                // Direct structure: { id: 456, address: "..." }
                addressId = newAddress.id;
                addressData = newAddress;
              } else if (newAddress && newAddress.data && newAddress.data.id) {
                // Nested structure: { data: { id: 456, address: "..." } }
                addressId = newAddress.data.id;
                addressData = newAddress.data;
              } else if (Array.isArray(newAddress) && newAddress[0] && newAddress[0].id) {
                // Array structure: [{ id: 456, address: "..." }]
                addressId = newAddress[0].id;
                addressData = newAddress[0];
              }
              
              if (addressId && addressData) {
                setAddressId(addressId);
                setDefaultAddress(addressData);
                
                // Save to localStorage for persistence
                localStorage.setItem('selectedAddressId', addressId.toString());
                localStorage.setItem('selectedAddress', location);
                console.log('✅ Address ID set in context and localStorage:', addressId);
              } else {
                console.error('❌ Could not extract address ID from response:', newAddress);
              }
              
              // Reload addresses to update the UI
              const addresses = await getUserAddresses();
              setSavedAddresses(addresses);
              
              toast.success("Address saved as default!");
            }
          });
        }
      } catch (error) {
        console.error('Error auto-saving address:', error);
        // Don't show error toast for auto-save, just log it
      }
    }
  };

  const handleAddressSelect = async (addressData: {
    name: string;
    fullAddress: string;
    coordinates: { lat: number; lng: number };
    city?: string;
  }) => {
    try {
      await addUserAddress({
        address: addressData.fullAddress,
        latitude: addressData.coordinates.lat,
        longitude: addressData.coordinates.lng,
        is_default: savedAddresses.length === 0
      });
      
      // Reload addresses from backend
      const addresses = await getUserAddresses();
      setSavedAddresses(addresses);

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
    
    // Navigate to store page
    router.push(`/store/${store.id}`);
  };

  const filteredStores = (stores || []).filter(store =>
    store.name.toLowerCase().includes(outletSearchQuery.toLowerCase()) ||
    store.address.toLowerCase().includes(outletSearchQuery.toLowerCase())
  );

  const fetchPredictions = React.useCallback(
    (input: string) => {
      console.log('fetchPredictions called with:', { input, autocompleteService, hasGetPlacePredictions: !!autocompleteService?.getPlacePredictions });
      
      if (!input) {
        console.log('No input provided');
        setPredictions([]);
        return;
      }
      
      // Try AutocompleteSuggestion first (new API)
      if (autocompleteService) {
        try {
          // Check if it's the new AutocompleteSuggestion API
          if (typeof autocompleteService.getPlacePredictions === 'function') {
            console.log('Calling getPlacePredictions (AutocompleteService)...');
            autocompleteService.getPlacePredictions(
              { input, componentRestrictions: { country: "lk" } },
              (predictions: any, status: any) => {
                console.log('getPlacePredictions callback:', { predictions, status });
                if (status === "OK" && predictions) {
                  setPredictions(predictions);
                } else {
                  setPredictions([]);
                  console.error("AutocompleteService failed due to: " + status);
                }
              }
            );
            return;
          }
          // Check if it's the new AutocompleteSuggestion API with different method names
          else {
            console.log('AutocompleteSuggestion API detected, but getPlacePredictions not available');
            // For now, fall through to Geocoder
          }
        } catch (error) {
          console.error("Error calling AutocompleteSuggestion:", error);
        }
      }
      
      // Fallback: Use Geocoder for basic search
      if (geocoderService) {
        console.log('Using Geocoder fallback...');
        try {
          geocoderService.geocode(
            { address: input, componentRestrictions: { country: "lk" } },
            (results: any, status: any) => {
              console.log('Geocoder callback:', { results, status });
              if (status === "OK" && results) {
                // Convert geocoder results to autocomplete-like format
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
                console.error("Geocoder failed due to: " + status);
              }
            }
          );
        } catch (error) {
          console.error("Error calling Geocoder:", error);
          setPredictions([]);
        }
      } else {
        console.log('No services available');
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
        handleSelectLocation(results[0].formatted_address, prediction.structured_formatting.secondary_text);
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

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading Maps...</div>;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full w-40 text-left overflow-hidden whitespace-nowrap text-ellipsis">
          <GlobeIcon className="mr-2 h-4 w-4" />
          {selectedLocation}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        {currentView === 'main' && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <DialogTitle className="text-xl font-bold">
                {deliveryType === 'pickup' ? 'Select Outlet' : 'Select Your Location'}
              </DialogTitle>
              <div className="flex bg-gray-100 rounded-full p-1">
                <Button
                  variant="ghost"
                  className={`rounded-full px-4 py-2 ${deliveryType === 'pickup' ? 'bg-black text-white' : ''}`}
                  onClick={() => {
                    setDeliveryType('pickup');
                    setHasSelectedDeliveryType(true);
                  }}
                >
                  Pickup
                </Button>
                <Button
                  variant="ghost"
                  className={`rounded-full px-4 py-2 ${deliveryType === 'delivery' ? 'bg-black text-white' : ''}`}
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
                <div className="relative flex items-center mb-3 border rounded-lg px-3 py-2">
                  <ArrowLeft className="mr-2 h-4 w-4 text-gray-500" />
                  <input
                    id="outlet-search"
                    type="text"
                    placeholder="Search Stores"
                    className="flex-grow border-none focus:ring-0 outline-none text-sm"
                    value={outletSearchQuery}
                    onChange={(e) => setOutletSearchQuery(e.target.value)}
                  />
                </div>

                {/* Select Outlet on Map Option */}
                <div className="flex items-center justify-between cursor-pointer py-3 px-3 mb-3 border rounded-lg hover:bg-gray-50 transition-colors"
                     onClick={() => setCurrentView('outletMap')}>
                  <div className="flex items-center space-x-3">
                    <MapPinIcon className="h-5 w-5 text-gray-600" />
                    <span className="text-base font-medium">Select Outlet on Map</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {loadingStores ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-gray-500">Loading stores...</div>
                    </div>
                  ) : !filteredStores || filteredStores.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-gray-500">
                        {outletSearchQuery ? 'No stores found matching your search.' : 'No stores available.'}
                      </div>
                    </div>
                  ) : (
                    filteredStores.map((store) => (
                      <div
                        key={store.id}
                        className="flex items-center space-x-2 p-2 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleSelectOutlet(store)}
                      >
                        <div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
                          <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-sm font-bold">
                            {store.name.charAt(0)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-gray-900 truncate">{store.name}</h3>
                          <p className="text-xs text-gray-600 truncate leading-tight">{store.address}</p>
                          <div className="flex items-center justify-between">
                            {store.phone && (
                              <p className="text-xs text-gray-500 truncate">{store.phone}</p>
                            )}
                            {store.distance && (
                              <p className="text-xs text-blue-600 font-medium">
                                {store.distance.toFixed(1)} km away
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              // Delivery Location Selection View
              <div>
                <div className="relative flex items-center mb-4 border rounded-lg px-3 py-2">
                  <ArrowLeft className="mr-2 h-5 w-5 text-gray-500" />
                  <input
                    id="location-search"
                    type="text"
                    placeholder="Search Location"
                    className="flex-grow border-none focus:ring-0 outline-none"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                  />
                  {predictions.length > 0 && (
                    <ul className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-20 mt-1 max-h-60 overflow-y-auto">
                      {predictions.map((prediction) => (
                        <li
                          key={prediction.place_id}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                          onClick={() => handlePredictionClick(prediction)}
                        >
                          {prediction.description}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between cursor-pointer py-2 hover:bg-gray-50 rounded-md px-2"
                       onClick={handleGetCurrentLocation}>
                    <div className="flex items-center space-x-3">
                      <LocateIcon className="h-5 w-5 text-gray-600" />
                      <span className="text-base">Your Current Location</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="flex items-center justify-between cursor-pointer py-2 hover:bg-gray-50 rounded-md px-2"
                       onClick={() => setCurrentView('map')}>
                    <div className="flex items-center space-x-3">
                      <MapPinIcon className="h-5 w-5 text-gray-600" />
                      <span className="text-base">Set on Map</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="flex items-center justify-between cursor-pointer py-2 hover:bg-gray-50 rounded-md px-2"
                       onClick={() => setCurrentView('savedAddresses')}>
                    <div className="flex items-center space-x-3">
                      <HeartIcon className="h-5 w-5 text-gray-600" />
                      <span className="text-base">Saved Address</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>

                {recentLocations.length > 0 && (
                  <div>
                    <h3 className="text-base text-gray-500 font-semibold mb-3">Recently Searched Locations</h3>
                    <ul className="space-y-3">
                      {recentLocations.map((locString) => {
                        const [name, description] = locString.split('|');
                        return (
                          <li
                            key={locString}
                            className="flex items-center justify-between cursor-pointer py-2 hover:bg-gray-50 rounded-md px-2"
                            onClick={() => handleSelectLocation(name, description)}
                          >
                            <div className="flex items-center space-x-3">
                              <ClockIcon className="h-5 w-5 text-gray-400" />
                              <div>
                                <p className="font-medium">{name}</p>
                                {description && <p className="text-xs text-gray-500">{description}</p>}
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400" />
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
          <div className="p-4 relative">
            <div className="flex items-center mb-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentView('main')} className="mr-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <DialogTitle className="text-xl font-bold">Set Location on Map</DialogTitle>
            </div>
            <div className="w-full h-80 bg-gray-200 rounded-md overflow-hidden mb-4">
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={mapCenter}
                zoom={10}
                onClick={handleMapClick}
              >
                {markerPosition && <Marker position={markerPosition} />}
              </GoogleMap>
            </div>
            <Button className="mt-2 w-full" onClick={() => markerPosition && handleSelectLocation(`Lat: ${markerPosition.lat}, Lng: ${markerPosition.lng}`, `Map Location`)}>Confirm Location</Button>
          </div>
        )}

        {currentView === 'outletMap' && (
          <div className="p-4 relative">
            <div className="flex items-center mb-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentView('main')} className="mr-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <DialogTitle className="text-xl font-bold">Select Outlet on Map</DialogTitle>
            </div>
            <div className="w-full h-80 bg-gray-200 rounded-md overflow-hidden mb-4">
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
            <div className="text-sm text-gray-600 mb-2">
              Click on any marker to select that outlet
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {(stores || []).map((store) => (
                <div
                  key={store.id}
                  className="flex items-center space-x-2 p-2 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleSelectOutlet(store)}
                >
                  <div className="w-8 h-8 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
                    <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-xs font-bold">
                      {store.name.charAt(0)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-gray-900 truncate">{store.name}</h3>
                    <p className="text-xs text-gray-600 truncate leading-tight">{store.address}</p>
                    {store.distance && (
                      <p className="text-xs text-blue-600 font-medium">
                        {store.distance.toFixed(1)} km away
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'savedAddresses' && (
          <div className="p-4 relative">
            <div className="flex items-center mb-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentView('main')} className="mr-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <DialogTitle className="text-xl font-bold">Saved Addresses</DialogTitle>
            </div>
            <div className="space-y-4">
              {savedAddresses.length === 0 ? (
                <div className="text-center py-8">
                  <MapPinIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No saved addresses</h3>
                  <p className="text-gray-500 mb-4">Add your first address to get started</p>
                </div>
              ) : (
                savedAddresses.map((address) => (
                  <div 
                    key={address.id} 
                    className="flex items-center justify-between cursor-pointer py-2 hover:bg-gray-50 rounded-md px-2"
                    onClick={() => handleSelectLocation(address.address, address.address)}
                  >
                    <div className="flex items-center space-x-3">
                      {address.address.toLowerCase().includes('home') || address.address.toLowerCase().includes('house') ? (
                        <HomeIcon className="h-5 w-5 text-blue-600" />
                      ) : address.address.toLowerCase().includes('office') || address.address.toLowerCase().includes('work') ? (
                        <BriefcaseBusiness className="h-5 w-5 text-green-600" />
                      ) : (
                        <MapPinIcon className="h-5 w-5 text-gray-600" />
                      )}
                      <div>
                        <span className="text-base font-medium">Address {address.id}</span>
                        {address.is_default && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Default</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                ))
              )}
              <Button 
                className="w-full mt-4 flex items-center gap-2" 
                onClick={() => setIsAddressSelectorOpen(true)}
              >
                <PlusIcon className="h-4 w-4" />
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
    </>
  );
};

export default LocationSelector;
