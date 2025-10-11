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

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyB1zVZ0tZ4O1VuOpmDp8ArAq6NZZBjcExI";
const libraries: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ["places"];

interface CartLocationSelectorProps {
  onLocationSelect: (location: string) => void;
}

const CartLocationSelector: React.FC<CartLocationSelectorProps> = ({ onLocationSelect }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const { selectedLocation, setSelectedLocation, defaultAddress, setDefaultAddress, addressId, setAddressId } = useLocation();
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
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('delivery');

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_API_KEY,
    libraries,
  });

  React.useEffect(() => {
    if (isLoaded) {
      // Try AutocompleteSuggestion first (new API)
      if (window.google.maps.places.AutocompleteSuggestion) {
        try {
          const autocomplete = new window.google.maps.places.AutocompleteSuggestion();
          setAutocompleteService(autocomplete);
        } catch (error) {
          console.error('Error creating AutocompleteSuggestion:', error);
          // Fallback to AutocompleteService
          if (window.google.maps.places.AutocompleteService) {
            try {
              const fallbackAutocomplete = new window.google.maps.places.AutocompleteService();
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
          setAutocompleteService(autocomplete);
        } catch (error) {
          console.error('Error creating fallback AutocompleteService:', error);
        }
      }
      
      setGeocoderService(new (window as any).google.maps.Geocoder());
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

  const handleSelectLocation = (location: string, description?: string) => {
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
    }

    setRecentLocations((prevLocations) => {
      const newLocationItem = description ? `${location}|${description}` : location;
      const newLocations = [newLocationItem, ...prevLocations.filter((loc) => loc.split('|')[0] !== location)];
      return newLocations.slice(0, 3);
    });
  };

  const handleAddressSelect = (addressData: {
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
    setAddressId(newAddress.id);
    
    // Select the new address
    handleSelectLocation(addressData.fullAddress, addressData.city);
    toast.success("Address saved successfully!");
  };

  const fetchPredictions = React.useCallback(
    (input: string) => {
      if (!input) {
        setPredictions([]);
        return;
      }
      
      if (autocompleteService && typeof autocompleteService.getPlacePredictions === 'function') {
        autocompleteService.getPlacePredictions(
          { input, componentRestrictions: { country: "lk" } },
          (predictions: any, status: any) => {
            if (status === "OK" && predictions) {
              setPredictions(predictions);
            } else {
              setPredictions([]);
              console.error("AutocompleteService failed due to: " + status);
            }
          }
        );
      } else {
        console.log('AutocompleteSuggestion API detected, but getPlacePredictions not available');
        setPredictions([]);
      }
    },
    [autocompleteService]
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
                  onClick={() => setDeliveryType('pickup')}
                >
                  Pickup
                </Button>
                <Button
                  variant="ghost"
                  className={`rounded-full px-4 py-2 ${deliveryType === 'delivery' ? 'bg-black text-white' : ''}`}
                  onClick={() => setDeliveryType('delivery')}
                >
                  Delivery
                </Button>
              </div>
            </div>
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
                    onClick={() => handleSelectLocation(address.fullAddress, address.city)}
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
