"use client";

import React, { useEffect, useState } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { ArrowLeft, LocateIcon, MapPinIcon, SearchIcon } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useGoogleMaps } from "@/components/GoogleMapsProvider";
import { addUserAddress, getUserAddresses } from "@/lib/api";
import { SRI_LANKA_MAP_CENTER, SRI_LANKA_MAP_ZOOM, fitMapToSriLanka } from "@/lib/google-maps-config";
import {
  classifyAddressName,
  findSlotAddress,
  getNamedSavedAddresses,
  rememberAddressName,
} from "@/lib/named-addresses";
import type { SavedAddStep, SavedAddress } from "./types";

interface SavedAddressAddFlowProps {
  onBack: () => void;
  onSaved: (addresses: SavedAddress[]) => void;
  existingAddresses: SavedAddress[];
  presetName?: string;
  onSearchFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onStepChange?: (step: SavedAddStep) => void;
}

export default function SavedAddressAddFlow({
  onBack,
  onSaved,
  existingAddresses,
  presetName = "",
  onSearchFocus,
  onStepChange,
}: SavedAddressAddFlowProps) {
  const { isLoaded } = useGoogleMaps();
  const [step, setStep] = useState<SavedAddStep>("search");
  const [slideFrom, setSlideFrom] = useState<"right" | "left">("right");
  const [cameFromMap, setCameFromMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [addressName, setAddressName] = useState(presetName);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState(SRI_LANKA_MAP_CENTER);
  const [saving, setSaving] = useState(false);
  const [geocoderService, setGeocoderService] = useState<google.maps.Geocoder | null>(null);
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);

  useEffect(() => {
    onStepChange?.("search");
  }, [onStepChange]);

  useEffect(() => {
    if (!isLoaded || typeof window === "undefined" || !window.google?.maps) return;
    try {
      setGeocoderService(new window.google.maps.Geocoder());
      if (window.google.maps.places?.AutocompleteService) {
        setAutocompleteService(new window.google.maps.places.AutocompleteService());
      }
    } catch (error) {
      console.error("Error initializing maps services:", error);
    }
  }, [isLoaded]);

  const goTo = (next: SavedAddStep, direction: "right" | "left" = "right") => {
    setSlideFrom(direction);
    setStep(next);
    onStepChange?.(next);
  };

  const slideClass =
    slideFrom === "right"
      ? "animate-in fade-in slide-in-from-right-8 duration-300"
      : "animate-in fade-in slide-in-from-left-8 duration-300";

  const fetchPredictions = (input: string) => {
    if (!input || input.trim().length < 2) {
      setPredictions([]);
      return;
    }

    if (autocompleteService && typeof autocompleteService.getPlacePredictions === "function") {
      autocompleteService.getPlacePredictions({ input: input.trim() }, (results, status) => {
        if (status === "OK" && results) {
          setPredictions(results);
        } else {
          setPredictions([]);
        }
      });
      return;
    }

    if (geocoderService) {
      geocoderService.geocode({ address: input.trim() }, (results, status) => {
        if (status === "OK" && results?.length) {
          setPredictions(
            results.slice(0, 5).map((result, index) => ({
              place_id: `geocoder_${index}`,
              description: result.formatted_address,
              structured_formatting: {
                main_text: result.formatted_address.split(",")[0],
                secondary_text: result.formatted_address.split(",").slice(1).join(",").trim(),
              },
            })) as google.maps.places.AutocompletePrediction[]
          );
        } else {
          setPredictions([]);
        }
      });
    }
  };

  const openConfirm = (address: string, coords: { lat: number; lng: number }, fromMap = false) => {
    setSelectedAddress(address);
    setMarkerPosition(coords);
    setMapCenter(coords);
    setCameFromMap(fromMap);
    setPredictions([]);
    goTo("confirm", "right");
  };

  const handlePredictionClick = (prediction: google.maps.places.AutocompletePrediction) => {
    setSearchQuery(prediction.description);
    setPredictions([]);
    if (!geocoderService) {
      toast.error("Maps is still loading. Please try again.");
      return;
    }
    geocoderService.geocode({ address: prediction.description }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const location = results[0].geometry.location;
        openConfirm(prediction.description, { lat: location.lat(), lng: location.lng() });
      } else {
        toast.error("Could not find that location.");
      }
    });
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        if (!geocoderService) {
          openConfirm(`Lat: ${coords.lat}, Lng: ${coords.lng}`, coords);
          return;
        }
        geocoderService.geocode({ location: coords }, (results, status) => {
          if (status === "OK" && results?.[0]) {
            openConfirm(results[0].formatted_address, coords);
          } else {
            openConfirm(`Lat: ${coords.lat}, Lng: ${coords.lng}`, coords);
          }
        });
      },
      () => toast.error("Could not retrieve current location.")
    );
  };

  const handleAddMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setMarkerPosition(coords);
    setMapCenter(coords);
    if (!geocoderService) {
      openConfirm(`Lat: ${coords.lat}, Lng: ${coords.lng}`, coords, true);
      return;
    }
    geocoderService.geocode({ location: coords }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        openConfirm(results[0].formatted_address, coords, true);
      } else {
        openConfirm(`Lat: ${coords.lat}, Lng: ${coords.lng}`, coords, true);
      }
    });
  };

  const handleSave = async () => {
    const name = addressName.trim();
    if (!name) {
      toast.error("Please enter a name for this address");
      return;
    }
    if (!selectedAddress || !markerPosition) {
      toast.error("Please select a location");
      return;
    }

    const slot = classifyAddressName(name);
    if (slot === "home" && findSlotAddress(existingAddresses, "home")) {
      toast.error(`${name} is already in use`);
      return;
    }
    if (slot === "work" && findSlotAddress(existingAddresses, "work")) {
      toast.error(`${name} is already in use`);
      return;
    }

    setSaving(true);
    try {
      const newAddress = await addUserAddress({
        address: selectedAddress,
        latitude: markerPosition.lat,
        longitude: markerPosition.lng,
        is_default: false,
        name,
      });

      if (newAddress?.id) {
        rememberAddressName(newAddress.id, name);
      }

      const addresses = await getUserAddresses();
      onSaved(Array.isArray(addresses) ? getNamedSavedAddresses(addresses) : []);
      toast.success("Address saved");
    } catch (error) {
      console.error("Error saving address:", error);
      toast.error("Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 relative overflow-x-hidden">
      {step === "search" && (
        <div key="search" className={slideClass}>
          <div className="flex items-center mb-3 sm:mb-4 min-w-0">
            <Button variant="ghost" size="icon" onClick={onBack} className="mr-2 shrink-0">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <DialogTitle className="text-lg sm:text-xl font-bold truncate">Add address</DialogTitle>
          </div>

          <div className="relative mb-3">
            <div className="flex items-center border rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
              <SearchIcon className="mr-1.5 h-4 w-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search Location"
                className="flex-grow min-w-0 border-none focus:ring-0 outline-none text-xs sm:text-sm bg-transparent"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  fetchPredictions(e.target.value);
                }}
                onFocus={onSearchFocus}
              />
            </div>
            {predictions.length > 0 && (
              <ul className="mt-2 bg-white border border-gray-200 rounded-md shadow-sm max-h-48 overflow-y-auto">
                {predictions.map((prediction) => (
                  <li
                    key={prediction.place_id}
                    className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                    onClick={() => handlePredictionClick(prediction)}
                  >
                    <div className="font-medium text-xs sm:text-sm">
                      {prediction.structured_formatting?.main_text || prediction.description}
                    </div>
                    {prediction.structured_formatting?.secondary_text && (
                      <div className="text-[10px] sm:text-xs text-gray-500">
                        {prediction.structured_formatting.secondary_text}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1">
            <button
              type="button"
              className="flex w-full items-center py-2.5 px-1 hover:bg-gray-50 rounded-md"
              onClick={handleCurrentLocation}
            >
              <span className="flex items-center gap-3">
                <LocateIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                <span className="text-sm sm:text-base">Your Current Location</span>
              </span>
            </button>
            <button
              type="button"
              className="flex w-full items-center py-2.5 px-1 hover:bg-gray-50 rounded-md"
              onClick={() => {
                setMarkerPosition(null);
                setMapCenter(SRI_LANKA_MAP_CENTER);
                goTo("map", "right");
              }}
            >
              <span className="flex items-center gap-3">
                <MapPinIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                <span className="text-sm sm:text-base">Set on Map</span>
              </span>
            </button>
          </div>
        </div>
      )}

      {step === "map" && (
        <div key="map" className={slideClass}>
          <div className="relative flex items-center justify-center mb-3 sm:mb-4 min-h-9">
            <Button variant="ghost" size="icon" onClick={() => goTo("search", "left")} className="absolute left-0 shrink-0">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <DialogTitle className="text-lg sm:text-xl font-bold text-center">Set on Map</DialogTitle>
          </div>
          <div className="w-full h-64 sm:h-80 bg-gray-200 rounded-md overflow-hidden">
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={mapCenter}
                zoom={SRI_LANKA_MAP_ZOOM}
                onLoad={fitMapToSriLanka}
                onClick={handleAddMapClick}
              >
                {markerPosition && <Marker position={markerPosition} />}
              </GoogleMap>
            ) : (
              <div className="h-full w-full animate-pulse bg-gray-200" />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">Tap the map to choose a location.</p>
        </div>
      )}

      {step === "confirm" && (
        <div key="confirm" className={slideClass}>
          <div className="flex items-center mb-3 sm:mb-4 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goTo(cameFromMap ? "map" : "search", "left")}
              className="mr-2 shrink-0"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <DialogTitle className="text-lg sm:text-xl font-bold truncate">Save address</DialogTitle>
          </div>

          <div className="w-full h-40 sm:h-48 bg-gray-200 rounded-md overflow-hidden mb-3">
            {isLoaded && markerPosition ? (
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={markerPosition}
                zoom={16}
                options={{ disableDefaultUI: true, gestureHandling: "none" }}
              >
                <Marker position={markerPosition} />
              </GoogleMap>
            ) : (
              <div className="h-full w-full animate-pulse bg-gray-200" />
            )}
          </div>

          <p className="text-sm text-gray-800 mb-3 break-words">{selectedAddress}</p>

          <label className="block text-xs sm:text-sm text-gray-500 mb-1">Saved address as (name)</label>
          <Input
            value={addressName}
            onChange={(e) => setAddressName(e.target.value)}
            placeholder="Home, Work, or a name"
            className="mb-4"
          />

          <Button className="w-full" onClick={handleSave} disabled={saving || !addressName.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}
