import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLoadScript, GoogleMap, Marker, Autocomplete } from "@react-google-maps/api";
import { useLocation } from "@/contexts/LocationContext";
import { ArrowLeft, LocateIcon, MapPinIcon, SearchIcon, X } from "lucide-react";
import toast from "react-hot-toast";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyB1zVZ0tZ4O1VuOpmDp8ArAq6NZZBjcExI";
const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];

interface AddressSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressSelect: (address: {
    name: string;
    fullAddress: string;
    coordinates: { lat: number; lng: number };
    city?: string;
  }) => void;
  title?: string;
  description?: string;
}

const AddressSelector: React.FC<AddressSelectorProps> = ({
  isOpen,
  onClose,
  onAddressSelect,
  title = "Select Address",
  description = "Choose your address by searching or clicking on the map"
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState({ lat: 6.9271, lng: 79.8612 }); // Default to Colombo
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [addressName, setAddressName] = useState("");
  const [geocoderService, setGeocoderService] = useState<google.maps.Geocoder | null>(null);
  const [autocompleteService, setAutocompleteService] = useState<any>(null);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [currentView, setCurrentView] = useState<'search' | 'map'>('search');
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_API_KEY,
    libraries,
    id: 'google-maps-script-address',
  });

  // Debug Google Maps loading
  useEffect(() => {
    console.log('AddressSelector - Google Maps loading state:', { isLoaded, loadError });
    if (loadError) {
      console.error('AddressSelector - Google Maps load error:', loadError);
    }
  }, [isLoaded, loadError]);

  useEffect(() => {
    if (isLoaded && window.google) {
      const geocoder = new window.google.maps.Geocoder();
      
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
      
      setGeocoderService(geocoder);
    }
  }, [isLoaded]);

  const fetchPredictions = (input: string) => {
    if (!input.trim()) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    // Try AutocompleteService first
    if (autocompleteService) {
      try {
        // Check if it's the old AutocompleteService API
        if (typeof autocompleteService.getPlacePredictions === 'function') {
          autocompleteService.getPlacePredictions(
            {
              input,
              componentRestrictions: { country: 'lk' }, // Restrict to Sri Lanka
              types: ['address']
            },
            (predictions: any, status: any) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                setPredictions(predictions);
                setShowPredictions(true);
              } else {
                setPredictions([]);
                setShowPredictions(false);
              }
            }
          );
          return;
        } else {
          console.log('AutocompleteSuggestion API detected, but getPlacePredictions not available');
          // Fall through to Geocoder
        }
      } catch (error) {
        console.error("Error calling AutocompleteService:", error);
      }
    }

    // Fallback: Use Geocoder for basic search
    if (geocoderService) {
      try {
        geocoderService.geocode(
          { address: input, componentRestrictions: { country: 'lk' } },
          (results: any, status: any) => {
            if (status === window.google.maps.GeocoderStatus.OK && results) {
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
              setShowPredictions(true);
            } else {
              setPredictions([]);
              setShowPredictions(false);
            }
          }
        );
      } catch (error) {
        console.error("Error calling Geocoder:", error);
        setPredictions([]);
        setShowPredictions(false);
      }
    } else {
      setPredictions([]);
      setShowPredictions(false);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setSearchQuery(input);
    fetchPredictions(input);
  };

  const handlePredictionClick = (prediction: google.maps.places.AutocompletePrediction) => {
    setSearchQuery(prediction.description);
    setPredictions([]);
    setShowPredictions(false);

    if (!geocoderService) return;

    geocoderService.geocode({ address: prediction.description }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const { lat, lng } = results[0].geometry.location;
        const coordinates = { lat: lat(), lng: lng() };
        setMapCenter(coordinates);
        setMarkerPosition(coordinates);
        setSelectedAddress(results[0].formatted_address);
        setCurrentView('map');
      } else {
        console.error("Geocode was not successful for the following reason: " + status);
        toast.error("Could not find the selected address");
      }
    });
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    if (!geocoderService) return;

    geocoderService.geocode({ address: searchQuery }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const { lat, lng } = results[0].geometry.location;
        const coordinates = { lat: lat(), lng: lng() };
        setMapCenter(coordinates);
        setMarkerPosition(coordinates);
        setSelectedAddress(results[0].formatted_address);
        setCurrentView('map');
      } else {
        console.error("Geocode was not successful for the following reason: " + status);
        toast.error("Could not find the address");
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
            geocoderService.geocode({ location: latLng }, (results, status) => {
              if (status === "OK" && results && results[0]) {
                setSelectedAddress(results[0].formatted_address);
              } else {
                console.error("Reverse geocode was not successful: " + status);
                setSelectedAddress(`Lat: ${latitude}, Lng: ${longitude}`);
              }
            });
          } else {
            setSelectedAddress(`Lat: ${latitude}, Lng: ${longitude}`);
          }
          setCurrentView('map');
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

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const coordinates = { lat, lng };
      setMarkerPosition(coordinates);
      
      if (geocoderService) {
        geocoderService.geocode({ location: coordinates }, (results, status) => {
          if (status === "OK" && results && results[0]) {
            setSelectedAddress(results[0].formatted_address);
          } else {
            console.error("Reverse geocode was not successful: " + status);
            setSelectedAddress(`Lat: ${lat}, Lng: ${lng}`);
          }
        });
      } else {
        setSelectedAddress(`Lat: ${lat}, Lng: ${lng}`);
      }
    }
  };

  const handleConfirmAddress = () => {
    if (!markerPosition || !selectedAddress) {
      toast.error("Please select a location on the map or search for an address");
      return;
    }

    if (!addressName.trim()) {
      toast.error("Please enter a name for this address");
      return;
    }

    const city = selectedAddress.split(',').pop()?.trim() || '';
    
    onAddressSelect({
      name: addressName.trim(),
      fullAddress: selectedAddress,
      coordinates: markerPosition,
      city
    });

    // Reset form
    setSearchQuery("");
    setAddressName("");
    setSelectedAddress("");
    setMarkerPosition(null);
    setCurrentView('search');
    onClose();
  };

  const handleClose = () => {
    setSearchQuery("");
    setAddressName("");
    setSelectedAddress("");
    setMarkerPosition(null);
    setCurrentView('search');
    onClose();
  };

  if (!isLoaded) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl h-[600px]">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p>Loading map...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[600px] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col px-6 pb-6">
          {/* Search Section */}
          <div className="mb-4">
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for an address..."
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  className="pl-10"
                />
                {showPredictions && predictions.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {predictions.map((prediction, index) => (
                      <div
                        key={index}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => handlePredictionClick(prediction)}
                      >
                        <div className="flex items-start space-x-2">
                          <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {prediction.structured_formatting.main_text}
                            </p>
                            <p className="text-xs text-gray-500">
                              {prediction.structured_formatting.secondary_text}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={handleSearch} variant="outline">
                Search
              </Button>
              <Button onClick={handleGetCurrentLocation} variant="outline">
                <LocateIcon className="h-4 w-4 mr-2" />
                Current Location
              </Button>
            </div>

            {/* Address Name Input */}
            <div className="mb-4">
              <Input
                type="text"
                placeholder="Enter a name for this address (e.g., Home, Office)"
                value={addressName}
                onChange={(e) => setAddressName(e.target.value)}
              />
            </div>

            {/* View Toggle */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={currentView === 'search' ? 'default' : 'outline'}
                onClick={() => setCurrentView('search')}
                className="flex-1"
              >
                Search
              </Button>
              <Button
                variant={currentView === 'map' ? 'default' : 'outline'}
                onClick={() => setCurrentView('map')}
                className="flex-1"
              >
                Map
              </Button>
            </div>
          </div>

          {/* Map Section */}
          {currentView === 'map' && (
            <div className="flex-1 relative">
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={mapCenter}
                zoom={15}
                onClick={handleMapClick}
                onLoad={() => setIsMapLoaded(true)}
              >
                {markerPosition && (
                  <Marker
                    position={markerPosition}
                    draggable={true}
                    onDragEnd={(e) => {
                      if (e.latLng) {
                        const lat = e.latLng.lat();
                        const lng = e.latLng.lng();
                        const coordinates = { lat, lng };
                        setMarkerPosition(coordinates);
                        
                        if (geocoderService) {
                          geocoderService.geocode({ location: coordinates }, (results, status) => {
                            if (status === "OK" && results && results[0]) {
                              setSelectedAddress(results[0].formatted_address);
                            }
                          });
                        }
                      }
                    }}
                  />
                )}
              </GoogleMap>
            </div>
          )}

          {/* Selected Address Display */}
          {selectedAddress && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <div className="flex items-start space-x-2">
                <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Selected Address:</p>
                  <p className="text-sm text-gray-600">{selectedAddress}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirmAddress} disabled={!markerPosition || !addressName.trim()}>
              Confirm Address
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddressSelector;
