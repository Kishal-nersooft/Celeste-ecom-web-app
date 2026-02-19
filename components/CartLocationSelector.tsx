"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GlobeIcon, MapPin } from "lucide-react";
import { useLoadScript, GoogleMap, Marker } from "@react-google-maps/api";
import toast from "react-hot-toast";
import { ArrowLeft, LocateIcon, ChevronRight, ClockIcon, HeartIcon, HomeIcon, BriefcaseBusiness, PlusIcon } from "lucide-react";
import { useLocation } from "@/contexts/LocationContext";
import AddressSelector from "@/components/AddressSelector";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { createUserAddress } from "@/lib/api";
import Loader from "@/components/Loader";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];

interface CartLocationSelectorProps {
  onLocationSelect: (location: string) => void;
}

const CartLocationSelector: React.FC<CartLocationSelectorProps> = ({ onLocationSelect }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { selectedLocation, setSelectedLocation, defaultAddress, setDefaultAddress, addressId, setAddressId, deliveryType, setDeliveryType, setHasSelectedDeliveryType } = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState({ lat: -34.397, lng: 150.644 });
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [autocompleteService, setAutocompleteService] = useState<any>(null);
  const [geocoderService, setGeocoderService] = useState<google.maps.Geocoder | null>(null);
  const [recentLocations, setRecentLocations] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<'main' | 'map' | 'savedAddresses'>('main');
  const [isAddressSelectorOpen, setIsAddressSelectorOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  // Remove local deliveryType state - use LocationContext instead

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_API_KEY ?? '',
    libraries,
  });

  React.useEffect(() => {
    if (isLoaded && window.google) {
      console.log('Google Maps loaded, initializing services...');
      
      // Initialize AutocompleteService
      if (window.google.maps.places.AutocompleteService) {
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
      }
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

  // Load saved addresses from localStorage
  React.useEffect(() => {
    if (typeof window !== "undefined" && user) {
      const saved = localStorage.getItem(`savedAddresses_${user.uid}`);
      if (saved) {
        setSavedAddresses(JSON.parse(saved));
      }
    }
  }, [user]);

  // Refresh saved addresses when dialog opens
  React.useEffect(() => {
    if (isOpen && user) {
      const saved = localStorage.getItem(`savedAddresses_${user.uid}`);
      if (saved) {
        setSavedAddresses(JSON.parse(saved));
      }
    }
  }, [isOpen, user]);

  const handleSelectLocation = async (location: string, description?: string) => {
    setSelectedLocation(location);
    onLocationSelect(location);
    setIsOpen(false);
    setPredictions([]);
    setCurrentView('main');

    // If this is a saved address, update the address ID
    const matchingAddress = savedAddresses.find(addr => 
      addr.fullAddress.toLowerCase().includes(location.toLowerCase())
    );
    
    if (matchingAddress) {
      setAddressId(matchingAddress.id);
    } else if (location && !location.startsWith('Lat:') && !location.startsWith('Lng:')) {
      // This is a new address that needs to be created in the backend
      try {
        // Get coordinates for the address using geocoder
        if (geocoderService) {
          geocoderService.geocode({ address: location }, async (results: any, status: any) => {
            if (status === "OK" && results[0]) {
              const { lat, lng } = results[0].geometry.location;
              
              try {
                // Create new address in backend
                const newAddress = await createUserAddress({
                  address: location,
                  latitude: lat(),
                  longitude: lng(),
                  is_default: true // Set as default
                });
                
                // Handle different response structures
                let addressId = null;
                let addressData = null;
                
                if (newAddress && newAddress.id) {
                  addressId = newAddress.id;
                  addressData = newAddress;
                } else if (newAddress && newAddress.data && newAddress.data.id) {
                  addressId = newAddress.data.id;
                  addressData = newAddress.data;
                } else if (Array.isArray(newAddress) && newAddress[0] && newAddress[0].id) {
                  addressId = newAddress[0].id;
                  addressData = newAddress[0];
                }
                
                if (addressId && addressData) {
                  // Update context with new address
                  setDefaultAddress(addressData);
                  setAddressId(addressId);
                  console.log('✅ New address created and set:', { addressId, addressData });
                } else {
                  console.error('❌ Invalid address response structure:', newAddress);
                  toast.error('Failed to save address');
                }
              } catch (error) {
                console.error('❌ Failed to create address:', error);
                toast.error('Failed to save address');
              }
            } else {
              console.error('❌ Geocoding failed:', status);
              toast.error('Could not find coordinates for the address');
            }
          });
        } else {
          console.error('❌ Geocoder service not available');
          toast.error('Address service not available');
        }
      } catch (error) {
        console.error('❌ Error in handleSelectLocation:', error);
        toast.error('Failed to process address');
      }
    }

    setRecentLocations((prevLocations) => {
      const newLocationItem = description ? `${location}|${description}` : location;
      const newLocations = [newLocationItem, ...prevLocations.filter((loc) => loc.split('|')[0] !== location)];
      return newLocations.slice(0, 3);
    });
  };

  const handleAddressSelect = async (addressData: {
    name: string;
    fullAddress: string;
    coordinates: { lat: number; lng: number };
    city?: string;
  }) => {
    const newAddress = {
      id: Date.now().toString(),
      name: addressData.name,
      fullAddress: addressData.fullAddress,
      coordinates: addressData.coordinates,
      city: addressData.city,
      isDefault: savedAddresses.length === 0,
      createdAt: new Date().toISOString()
    };

    const updatedAddresses = [...savedAddresses, newAddress];
    setSavedAddresses(updatedAddresses);
    
    if (typeof window !== "undefined" && user) {
      localStorage.setItem(`savedAddresses_${user.uid}`, JSON.stringify(updatedAddresses));
    }

    // Update context with new address
    setDefaultAddress(newAddress);
    setAddressId(parseInt(newAddress.id));
    
    // Select the new address
    await handleSelectLocation(addressData.fullAddress, addressData.city);
    toast.success("Address saved successfully!");
  };

  const fetchPredictions = React.useCallback(
    (input: string) => {
      if (!input || input.trim().length < 2) {
        setPredictions([]);
        return;
      }
      
      // Use AutocompleteService for address suggestions
      if (autocompleteService && typeof autocompleteService.getPlacePredictions === 'function') {
        autocompleteService.getPlacePredictions(
          { 
            input: input.trim(),
            types: ['geocode', 'establishment']
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
    setPredictions([]);

    if (!geocoderService) return;

    geocoderService.geocode({ address: prediction.description }, async (results: any, status: any) => {
      if (status === "OK" && results[0]) {
        const { lat, lng } = results[0].geometry.location;
        setMapCenter({ lat: lat(), lng: lng() });
        setMarkerPosition({ lat: lat(), lng: lng() });
        // Use prediction.description instead of formatted_address to show the place name
        await handleSelectLocation(prediction.description, prediction.structured_formatting.secondary_text);
      } else {
        console.error("Geocode was not successful for the following reason: " + status);
      }
    });
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    if (!geocoderService) return;

    geocoderService.geocode({ address: searchQuery }, async (results: any, status: any) => {
      if (status === "OK" && results[0]) {
        const { lat, lng } = results[0].geometry.location;
        setMapCenter({ lat: lat(), lng: lng() });
        setMarkerPosition({ lat: lat(), lng: lng() });
        await handleSelectLocation(results[0].formatted_address, results[0].address_components.find((comp: any) => comp.types.includes('locality'))?.long_name);
      } else {
        console.error("Geocode was not successful for the following reason: " + status);
      }
    });
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const latLng = { lat: latitude, lng: longitude };
          setMapCenter(latLng);
          setMarkerPosition(latLng);
          if (geocoderService) {
            geocoderService.geocode({ location: latLng }, async (results: any, status: any) => {
              if (status === "OK" && results[0]) {
                await handleSelectLocation(results[0].formatted_address, results[0].address_components.find((comp: any) => comp.types.includes('locality'))?.long_name);
              } else {
                console.error("Reverse geocode was not successful: " + status);
                await handleSelectLocation(`Lat: ${latitude}, Lng: ${longitude}`);
              }
            });
          } else {
            await handleSelectLocation(`Lat: ${latitude}, Lng: ${longitude}`);
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
      geocoderService.geocode({ location: { lat, lng } }, async (results: any, status: any) => {
        if (status === "OK" && results[0]) {
          await handleSelectLocation(results[0].formatted_address, results[0].address_components.find((comp: any) => comp.types.includes('locality'))?.long_name);
        } else {
          console.error("Reverse geocode was not successful: " + status);
          await handleSelectLocation(`Lat: ${lat}, Lng: ${lng}`);
        }
      });
    }
  };

  if (loadError) return <Loader />;
  if (!isLoaded) return <Loader />;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full h-12 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
        >
          <MapPin className="h-5 w-5" />
          <span className="font-medium">{selectedLocation === "Location" ? "Choose your location" : selectedLocation}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogDescription className="sr-only">
          Select your delivery location by searching, using the map, or choosing from saved addresses
        </DialogDescription>
        {currentView === 'main' && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <DialogTitle className="text-2xl font-bold">Select Your Location</DialogTitle>
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
            <div className="relative mb-4">
              <div className="flex items-center border rounded-lg px-3 py-2">
                <ArrowLeft className="mr-2 h-5 w-5 text-gray-500" />
                <input
                  id="location-search"
                  type="text"
                  placeholder="Search Location"
                  className="flex-grow border-none focus:ring-0 outline-none"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                />
              </div>
              {predictions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 mt-1 max-h-60 overflow-y-auto">
                  {predictions.map((prediction) => (
                    <li
                      key={prediction.place_id}
                      className="px-4 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                      onClick={() => handlePredictionClick(prediction)}
                    >
                      <div className="font-medium text-sm">{prediction.structured_formatting.main_text}</div>
                      <div className="text-xs text-gray-500">{prediction.structured_formatting.secondary_text}</div>
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
                  <MapPin className="h-5 w-5 text-gray-600" />
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
                        onClick={async () => await handleSelectLocation(name, description)}
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
            <Button className="mt-2 w-full" onClick={async () => markerPosition && await handleSelectLocation(`Lat: ${markerPosition.lat}, Lng: ${markerPosition.lng}`, `Map Location`)}>Confirm Location</Button>
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
                  <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No saved addresses</h3>
                  <p className="text-gray-500 mb-4">Add your first address to get started</p>
                </div>
              ) : (
                savedAddresses.map((address) => (
                  <div 
                    key={address.id} 
                    className="flex items-center justify-between cursor-pointer py-2 hover:bg-gray-50 rounded-md px-2"
                    onClick={async () => await handleSelectLocation(address.fullAddress, address.city)}
                  >
                    <div className="flex items-center space-x-3">
                      {address.name.toLowerCase().includes('home') || address.name.toLowerCase().includes('house') ? (
                        <HomeIcon className="h-5 w-5 text-blue-600" />
                      ) : address.name.toLowerCase().includes('office') || address.name.toLowerCase().includes('work') ? (
                        <BriefcaseBusiness className="h-5 w-5 text-green-600" />
                      ) : (
                        <MapPin className="h-5 w-5 text-gray-600" />
                      )}
                      <div>
                        <span className="text-base font-medium">{address.name}</span>
                        {address.isDefault && (
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

export default CartLocationSelector;
