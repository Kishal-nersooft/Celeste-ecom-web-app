import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { LocateIcon, SearchIcon, X } from "lucide-react";
import toast from "react-hot-toast";
import { GoogleMapsProvider, useGoogleMaps } from "@/components/GoogleMapsProvider";
import { SRI_LANKA_MAP_CENTER, SRI_LANKA_MAP_ZOOM, fitMapToSriLanka } from "@/lib/google-maps-config";

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

const AddressSelectorContent: React.FC<AddressSelectorProps> = ({
  isOpen,
  onClose,
  onAddressSelect,
  title = "Select Address",
  description = "Choose your address by searching or clicking on the map",
  editingAddress = null
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState(
    editingAddress
      ? { lat: editingAddress.latitude, lng: editingAddress.longitude }
      : SRI_LANKA_MAP_CENTER
  );
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(
    editingAddress ? { lat: editingAddress.latitude, lng: editingAddress.longitude } : null
  );
  const [selectedAddress, setSelectedAddress] = useState<string>(editingAddress?.address ?? "");
  const [addressName, setAddressName] = useState(editingAddress?.name ?? "");
  const [geocoderService, setGeocoderService] = useState<google.maps.Geocoder | null>(null);
  const [autocompleteService, setAutocompleteService] = useState<any>(null);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useGoogleMaps();

  // Debug Google Maps loading
  useEffect(() => {
    if (loadError) {
      console.error('AddressSelector - Google Maps load error:', loadError);
    }
  }, [isLoaded, loadError]);

  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined' && window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder();
      
      // Initialize AutocompleteService (standard Places API)
      if (window.google.maps.places && window.google.maps.places.AutocompleteService) {
        try {
          const autocomplete = new window.google.maps.places.AutocompleteService();
          setAutocompleteService(autocomplete);
        } catch (error) {
          console.error('AddressSelector - Error creating AutocompleteService:', error);
        }
      } else {
        console.error('AddressSelector - AutocompleteService not available');
      }
      
      setGeocoderService(geocoder);
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
            // Check both constant and string for compatibility
            const isOK = status === window.google.maps.places.PlacesServiceStatus.OK || status === "OK";
            const isZeroResults = status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS || status === "ZERO_RESULTS";
            
            if (isOK && predictions && predictions.length > 0) {
              setPredictions(predictions);
            } else if (isZeroResults) {
              setPredictions([]);
            } else {
              console.error("AddressSelector - AutocompleteService failed:", status);
              setPredictions([]);
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
    setSearchQuery(input);
    fetchPredictions(input);
  };

  const focusMap = (coordinates: { lat: number; lng: number }) => {
    setMapCenter(coordinates);
    setMarkerPosition(coordinates);
    mapRef.current?.panTo(coordinates);
    mapRef.current?.setZoom(16);
  };

  const handlePredictionClick = (prediction: google.maps.places.AutocompletePrediction) => {
    setSearchQuery("");
    setPredictions([]);

    if (!geocoderService) return;

    geocoderService.geocode({ address: prediction.description }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const { lat, lng } = results[0].geometry.location;
        focusMap({ lat: lat(), lng: lng() });
        setSelectedAddress(results[0].formatted_address);
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
        focusMap({ lat: lat(), lng: lng() });
        setSelectedAddress(results[0].formatted_address);
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
          focusMap(latLng);
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
      focusMap(coordinates);

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
    setPredictions([]);
    onClose();
  };

  const handleClose = () => {
    setSearchQuery("");
    setPredictions([]);
    onClose();
  };

  const dialogClassName =
    "w-[calc(100%-1.5rem)] max-w-md gap-0 p-0 max-h-[90dvh] overflow-y-auto";

  if (!isLoaded) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent hideCloseButton className={dialogClassName}>
          <div className="p-4">
            <AddressDialogHeader title={title} />
            <DialogDescription className="sr-only">{description}</DialogDescription>
            <div className="h-56 w-full rounded-md bg-gray-200 animate-pulse mb-3" />
            <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse mb-4" />
            <div className="h-10 w-full rounded-md bg-gray-200 animate-pulse mb-3" />
            <div className="h-10 w-full rounded-md bg-gray-200 animate-pulse" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        hideCloseButton
        className={dialogClassName}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-4">
          <AddressDialogHeader title={title} />
          <DialogDescription className="sr-only">{description}</DialogDescription>

          <div className="w-full h-56 bg-gray-200 rounded-md overflow-hidden mb-3">
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={mapCenter}
              zoom={markerPosition ? 16 : SRI_LANKA_MAP_ZOOM}
              onClick={handleMapClick}
              onLoad={(map) => {
                mapRef.current = map;
                if (!markerPosition) fitMapToSriLanka(map);
              }}
              options={{
                fullscreenControl: false,
                mapTypeControl: false,
                streetViewControl: false,
              }}
            >
              {markerPosition && (
                <Marker
                  position={markerPosition}
                  draggable
                  onDragEnd={(e) => {
                    if (!e.latLng) return;
                    const coordinates = { lat: e.latLng.lat(), lng: e.latLng.lng() };
                    setMarkerPosition(coordinates);
                    setMapCenter(coordinates);
                    if (!geocoderService) {
                      setSelectedAddress(`Lat: ${coordinates.lat}, Lng: ${coordinates.lng}`);
                      return;
                    }
                    geocoderService.geocode({ location: coordinates }, (results, status) => {
                      if (status === "OK" && results?.[0]) {
                        setSelectedAddress(results[0].formatted_address);
                      } else {
                        setSelectedAddress(`Lat: ${coordinates.lat}, Lng: ${coordinates.lng}`);
                      }
                    });
                  }}
                />
              )}
            </GoogleMap>
          </div>
          <p className="text-xs text-gray-500 mb-3">Drag the pin or tap the map to adjust.</p>

          <p className="text-sm text-gray-800 mb-4 break-words min-h-5">
            {selectedAddress || "Search or choose a point on the map."}
          </p>

          <div className="relative mb-2">
            <div className="flex items-center border rounded-lg px-3 py-2">
              <SearchIcon className="mr-2 h-4 w-4 text-gray-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search for an address"
                className="flex-grow min-w-0 border-none focus:ring-0 outline-none text-sm bg-transparent"
                value={searchQuery}
                onChange={handleSearchInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
            </div>
            {predictions.length > 0 && (
              <ul className="mt-2 bg-white border border-gray-200 rounded-md shadow-sm max-h-48 overflow-y-auto">
                {predictions.map((prediction) => (
                  <li
                    key={prediction.place_id || `prediction-${prediction.description}`}
                    className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                    onClick={() => handlePredictionClick(prediction)}
                  >
                    <div className="font-medium text-sm">
                      {prediction.structured_formatting?.main_text || prediction.description}
                    </div>
                    {prediction.structured_formatting?.secondary_text && (
                      <div className="text-xs text-gray-500">
                        {prediction.structured_formatting.secondary_text}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            className="flex w-full items-center gap-3 py-2.5 px-1 mb-4 hover:bg-gray-50 rounded-md"
            onClick={handleGetCurrentLocation}
          >
            <LocateIcon className="h-4 w-4 text-gray-600 shrink-0" />
            <span className="text-sm">Current location</span>
          </button>

          <label className="block text-sm text-gray-500 mb-1">Saved address as (name)</label>
          <Input
            value={addressName}
            onChange={(e) => setAddressName(e.target.value)}
            placeholder="Home, Work, or a name"
            className="mb-4"
          />

          <Button
            className="w-full"
            onClick={handleConfirmAddress}
            disabled={!markerPosition || !selectedAddress || !addressName.trim()}
          >
            {editingAddress ? "Update" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function AddressDialogHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <DialogTitle className="text-lg font-bold truncate">{title}</DialogTitle>
      <DialogClose asChild>
        <button
          type="button"
          aria-label="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </DialogClose>
    </div>
  );
}

const AddressSelector: React.FC<AddressSelectorProps> = (props) => {
  if (!props.isOpen) {
    return null;
  }

  return (
    <GoogleMapsProvider>
      <AddressSelectorContent {...props} />
    </GoogleMapsProvider>
  );
};

export default AddressSelector;
