import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLoadScript, GoogleMap, Marker, Autocomplete } from "@react-google-maps/api";
import { useLocation } from "@/contexts/LocationContext";
import { ArrowLeft, LocateIcon, MapPinIcon, SearchIcon, X } from "lucide-react";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";

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
  editingAddress?: {
    id: number;
    address: string;
    latitude: number;
    longitude: number;
    name?: string;
  } | null;
}

const AddressSelector: React.FC<AddressSelectorProps> = ({
  isOpen,
  onClose,
  onAddressSelect,
  title = "Select Address",
  description = "Choose your address by searching or clicking on the map",
  editingAddress = null
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState({ lat: 6.9271, lng: 79.8612 }); // Default to Colombo
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [addressName, setAddressName] = useState("");
  const [geocoderService, setGeocoderService] = useState<google.maps.Geocoder | null>(null);
  const [autocompleteService, setAutocompleteService] = useState<any>(null);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [currentView, setCurrentView] = useState<'search' | 'map'>('search');
  
  // Debug: Log when predictions change
  useEffect(() => {
    console.log('AddressSelector - Predictions updated:', predictions.length, predictions);
  }, [predictions]);

  // Pre-fill form when editing an address
  useEffect(() => {
    if (editingAddress && isOpen) {
      setAddressName(editingAddress.name || "");
      setSelectedAddress(editingAddress.address);
      setMarkerPosition({ lat: editingAddress.latitude, lng: editingAddress.longitude });
      setMapCenter({ lat: editingAddress.latitude, lng: editingAddress.longitude });
      setCurrentView('map');
    } else if (!editingAddress && isOpen) {
      // Reset form when opening for new address
      setSearchQuery("");
      setAddressName("");
      setSelectedAddress("");
      setMarkerPosition(null);
      setCurrentView('search');
    }
  }, [editingAddress, isOpen]);
  
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
    if (isLoaded && typeof window !== 'undefined' && window.google && window.google.maps) {
      console.log('AddressSelector - Initializing Google Maps services...');
      const geocoder = new window.google.maps.Geocoder();
      
      // Initialize AutocompleteService (standard Places API)
      if (window.google.maps.places && window.google.maps.places.AutocompleteService) {
        try {
          const autocomplete = new window.google.maps.places.AutocompleteService();
          console.log('AddressSelector - AutocompleteService initialized successfully');
          setAutocompleteService(autocomplete);
        } catch (error) {
          console.error('AddressSelector - Error creating AutocompleteService:', error);
        }
      } else {
        console.error('AddressSelector - AutocompleteService not available');
      }
      
      setGeocoderService(geocoder);
      console.log('AddressSelector - Geocoder initialized successfully');
    }
  }, [isLoaded]);

  const fetchPredictions = useCallback(
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
            console.log('AddressSelector - AutocompleteService response:', { status, predictionsCount: predictions?.length, predictions });
            // Check both constant and string for compatibility
            const isOK = status === window.google.maps.places.PlacesServiceStatus.OK || status === "OK";
            const isZeroResults = status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS || status === "ZERO_RESULTS";
            
            if (isOK && predictions && predictions.length > 0) {
              console.log('AddressSelector - Setting predictions:', predictions.length);
              setPredictions(predictions);
            } else if (isZeroResults) {
              console.log('AddressSelector - Zero results');
              setPredictions([]);
            } else {
              console.error("AddressSelector - AutocompleteService failed:", status);
              setPredictions([]);
            }
          }
        );
        return;
      }
      
      console.log('AddressSelector - AutocompleteService not available, using fallback');

      
      // Fallback: Use Geocoder only if AutocompleteService is not available
      if (!autocompleteService && geocoderService) {
        geocoderService.geocode(
          { address: input.trim() },
          (results: any, status: any) => {
            console.log('AddressSelector - Geocoder response:', { status, resultsCount: results?.length });
            if (status === window.google.maps.GeocoderStatus.OK && results && results.length > 0) {
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
    console.log('AddressSelector - Input changed:', input);
    setSearchQuery(input);
    fetchPredictions(input);
  };

  const handlePredictionClick = (prediction: google.maps.places.AutocompletePrediction) => {
    setSearchQuery(prediction.description);
    setPredictions([]);

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
            <Loader />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[600px] p-0 overflow-visible">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col px-6 pb-6 overflow-visible">
          {/* Search Section */}
          <div className="mb-4 overflow-visible">
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1 z-[101]">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for an address..."
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  className="pl-10 relative z-10"
                />
                {predictions.length > 0 && (
                  <ul className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-[200] mt-1 max-h-48 sm:max-h-60 overflow-y-auto">
                    {predictions.map((prediction) => (
                      <li
                        key={prediction.place_id || `prediction-${prediction.description}`}
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
