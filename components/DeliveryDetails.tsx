"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { MapPin, Truck, ShoppingBag, AlertCircle } from "lucide-react";
import CartLocationSelector from "./CartLocationSelector";
import { useLoadScript, GoogleMap, Marker } from "@react-google-maps/api";
import toast from "react-hot-toast";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyB1zVZ0tZ4O1VuOpmDp8ArAq6NZZBjcExI";
const libraries: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ["places"];

interface DeliveryDetailsProps {
  onLocationChange: (location: string) => void;
  onOrderTypeChange: (orderType: 'delivery' | 'pickup') => void;
  selectedLocation: string;
  selectedOrderType: 'delivery' | 'pickup';
}

const DeliveryDetails: React.FC<DeliveryDetailsProps> = ({
  onLocationChange,
  onOrderTypeChange,
  selectedLocation,
  selectedOrderType
}) => {
  const [mapCenter, setMapCenter] = useState({ lat: 6.9271, lng: 79.8612 }); // Colombo, Sri Lanka
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_API_KEY,
    libraries,
  });

  const handleLocationSelect = (location: string) => {
    onLocationChange(location);
    
    // Update map center based on selected location
    // This is a simplified version - in a real app, you'd geocode the location
    if (location !== "Location") {
      // For demo purposes, we'll just center on Colombo
      setMapCenter({ lat: 6.9271, lng: 79.8612 });
      setMarkerPosition({ lat: 6.9271, lng: 79.8612 });
    }
  };

  const handleOrderTypeChange = (value: string) => {
    onOrderTypeChange(value as 'delivery' | 'pickup');
  };

  const isLocationSelected = selectedLocation && selectedLocation !== "Location";

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Delivery Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Location Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Delivery Location</Label>
          {!isLocationSelected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 border border-amber-200 bg-amber-50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-700">Please select a delivery location</span>
              </div>
              <CartLocationSelector onLocationSelect={handleLocationSelect} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-green-200 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">{selectedLocation}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    // Reset location to show the selector again
                    onLocationChange("Location");
                  }}
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                >
                  Change
                </Button>
              </div>
              
              {/* Map Preview */}
              {isLoaded && (
                <div className="h-48 w-full rounded-lg overflow-hidden border">
                  <GoogleMap
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    center={mapCenter}
                    zoom={15}
                    options={{
                      disableDefaultUI: true,
                      zoomControl: true,
                    }}
                  >
                    {markerPosition && <Marker position={markerPosition} />}
                  </GoogleMap>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Order Type Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Order Type</Label>
          <RadioGroup
            value={selectedOrderType}
            onValueChange={handleOrderTypeChange}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <RadioGroupItem value="delivery" id="delivery" />
              <Label htmlFor="delivery" className="flex items-center gap-3 cursor-pointer flex-1">
                <Truck className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium">Delivery</div>
                  <div className="text-sm text-gray-500">We'll deliver to your location</div>
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <RadioGroupItem value="pickup" id="pickup" />
              <Label htmlFor="pickup" className="flex items-center gap-3 cursor-pointer flex-1">
                <ShoppingBag className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium">Pickup</div>
                  <div className="text-sm text-gray-500">Pick up from our store</div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Delivery Information */}
        {/* {selectedOrderType === 'delivery' && isLocationSelected && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-700">
              <div className="font-medium mb-1">Delivery Information</div>
              <div>• Estimated delivery time: 30-45 minutes</div>
              <div>• Free delivery on orders over $25</div>
              <div>• Delivery fee: $2.99</div>
            </div>
          </div>
        )}

        {selectedOrderType === 'pickup' && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm text-green-700">
              <div className="font-medium mb-1">Pickup Information</div>
              <div>• Ready in 15-20 minutes</div>
              <div>• No delivery fee</div>
              <div>• Store location: 123 Main Street, Colombo</div>
            </div>
          </div>
        )} */}
      </CardContent>

    </Card>
  );
};

export default DeliveryDetails;
