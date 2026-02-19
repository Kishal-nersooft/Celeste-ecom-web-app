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
import { useLocation } from "@/contexts/LocationContext";

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];

interface DeliveryDetailsProps {
  onLocationChange: (location: string) => void;
  selectedLocation: string;
  selectedDeliveryService?: 'standard' | 'premium' | 'priority';
  onDeliveryServiceChange?: (service: 'standard' | 'premium' | 'priority') => void;
}

const DeliveryDetails: React.FC<DeliveryDetailsProps> = ({
  onLocationChange,
  selectedLocation,
  selectedDeliveryService = 'standard',
  onDeliveryServiceChange
}) => {
  // Use LocationContext for order type
  const { deliveryType: selectedOrderType, setDeliveryType } = useLocation();
  const [mapCenter, setMapCenter] = useState({ lat: 6.9271, lng: 79.8612 }); // Colombo, Sri Lanka
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_API_KEY ?? '',
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
    setDeliveryType(value as 'delivery' | 'pickup');
  };

  const isLocationSelected = selectedLocation && selectedLocation !== "Location";

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
          <MapPin className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
          Delivery Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-5 md:space-y-6">
        {/* Location Selection */}
        <div className="space-y-2 sm:space-y-3">
          <Label className="text-xs sm:text-sm font-medium">Delivery Location</Label>
          {!isLocationSelected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 sm:p-3 border border-amber-200 bg-amber-50 rounded-lg">
                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
                <span className="text-xs sm:text-sm text-amber-700">Please select a delivery location</span>
              </div>
              <CartLocationSelector onLocationSelect={handleLocationSelect} />
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between p-2 sm:p-3 border border-green-200 bg-green-50 rounded-lg">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-green-700 truncate">{selectedLocation}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    // Reset location to show the selector again
                    onLocationChange("Location");
                  }}
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 text-xs sm:text-sm px-2 py-1"
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
        <div className="space-y-2 sm:space-y-3">
          <Label className="text-xs sm:text-sm font-medium">Order Type</Label>
          <RadioGroup
            value={selectedOrderType}
            onValueChange={handleOrderTypeChange}
            className="space-y-2 sm:space-y-3"
          >
            <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <RadioGroupItem value="delivery" id="delivery" />
              <Label htmlFor="delivery" className="flex items-center gap-2 sm:gap-3 cursor-pointer flex-1">
                <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-xs sm:text-sm">Delivery</div>
                  <div className="text-[10px] sm:text-xs text-gray-500">We'll deliver to your location</div>
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <RadioGroupItem value="pickup" id="pickup" />
              <Label htmlFor="pickup" className="flex items-center gap-2 sm:gap-3 cursor-pointer flex-1">
                <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                <div>
                  <div className="font-medium text-xs sm:text-sm">Pickup</div>
                  <div className="text-[10px] sm:text-xs text-gray-500">Pick up from our store</div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Delivery Service Level Selector */}
        {selectedOrderType === 'delivery' && onDeliveryServiceChange && (
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-xs sm:text-sm font-medium">Delivery Service</Label>
            <p className="text-[10px] sm:text-xs text-gray-500 -mt-1">Choose your delivery speed</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <Button
                variant={selectedDeliveryService === 'premium' ? 'default' : 'outline'}
                onClick={() => onDeliveryServiceChange('premium')}
                className={`h-auto min-h-[60px] sm:min-h-[70px] flex flex-col items-center justify-center py-2 sm:py-3 px-3 transition-all duration-200 ${
                  selectedDeliveryService === 'premium'
                    ? 'bg-black text-white hover:bg-gray-800 shadow-md border-2 border-black'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`text-xs sm:text-sm font-semibold mb-0.5 text-center ${selectedDeliveryService === 'premium' ? 'text-white' : 'text-gray-900'}`}>
                  Premium
                </div>
                <div className={`text-[10px] sm:text-xs text-center ${selectedDeliveryService === 'premium' ? 'text-gray-200' : 'text-gray-500'}`}>
                  Faster delivery
                </div>
              </Button>
              
              <Button
                variant={selectedDeliveryService === 'standard' ? 'default' : 'outline'}
                onClick={() => onDeliveryServiceChange('standard')}
                className={`h-auto min-h-[60px] sm:min-h-[70px] flex flex-col items-center justify-center py-2 sm:py-3 px-3 transition-all duration-200 ${
                  selectedDeliveryService === 'standard'
                    ? 'bg-black text-white hover:bg-gray-800 shadow-md border-2 border-black'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`text-xs sm:text-sm font-semibold mb-0.5 text-center ${selectedDeliveryService === 'standard' ? 'text-white' : 'text-gray-900'}`}>
                  Standard
                </div>
                <div className={`text-[10px] sm:text-xs text-center ${selectedDeliveryService === 'standard' ? 'text-gray-200' : 'text-gray-500'}`}>
                  Regular delivery
                </div>
              </Button>
              
              <Button
                variant={selectedDeliveryService === 'priority' ? 'default' : 'outline'}
                onClick={() => onDeliveryServiceChange('priority')}
                className={`h-auto min-h-[60px] sm:min-h-[70px] flex flex-col items-center justify-center py-2 sm:py-3 px-3 transition-all duration-200 ${
                  selectedDeliveryService === 'priority'
                    ? 'bg-black text-white hover:bg-gray-800 shadow-md border-2 border-black'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className={`text-xs sm:text-sm font-semibold mb-0.5 text-center ${selectedDeliveryService === 'priority' ? 'text-white' : 'text-gray-900'}`}>
                  Priority
                </div>
                <div className={`text-[10px] sm:text-xs text-center ${selectedDeliveryService === 'priority' ? 'text-gray-200' : 'text-gray-500'}`}>
                  Fastest delivery
                </div>
              </Button>
            </div>
          </div>
        )}

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
