"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { MapPin, Truck, ShoppingBag, AlertCircle, Sparkles, Clock, Zap } from "lucide-react";
import CartLocationSelector from "./CartLocationSelector";
import { useLocation } from "@/contexts/LocationContext";

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

  const handleLocationSelect = (location: string) => {
    onLocationChange(location);
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
            </div>
          )}
        </div>

        {/* Order Type Selection */}
        <div className="space-y-2 sm:space-y-3">
          <Label className="text-xs sm:text-sm font-medium">Order Type</Label>
          <RadioGroup
            value={selectedOrderType}
            onValueChange={handleOrderTypeChange}
            className="grid grid-cols-2 gap-2 sm:gap-3"
          >
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <RadioGroupItem value="delivery" id="delivery" />
              <Label htmlFor="delivery" className="flex items-center gap-2 sm:gap-3 cursor-pointer flex-1">
                <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                <div>
                  <div className="font-medium text-xs sm:text-sm">Delivery</div>
                  <div className="text-[10px] sm:text-xs text-gray-500">We'll deliver to your location</div>
                </div>
              </Label>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
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
            {/* <p className="text-[10px] sm:text-xs text-gray-500 -mt-1">Choose your delivery speed</p> */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <Button
                variant={selectedDeliveryService === 'premium' ? 'default' : 'outline'}
                onClick={() => onDeliveryServiceChange('premium')}
                className={`h-auto min-h-[64px] sm:min-h-[74px] w-full justify-start px-3 py-2.5 sm:px-4 sm:py-3 transition-all duration-200 ${
                  selectedDeliveryService === 'premium'
                    ? 'bg-black text-white hover:bg-gray-800 shadow-md border-2 border-black'
                    : 'bg-white text-gray-800 hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex w-full items-start gap-2.5 sm:gap-3">
                  <div
                    className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                      selectedDeliveryService === 'premium'
                        ? 'border-white/15 bg-white/10'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <Sparkles
                      className={`h-4 w-4 ${
                        selectedDeliveryService === 'premium' ? 'text-white' : 'text-amber-600'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <div
                        className={`text-xs sm:text-sm font-semibold ${
                          selectedDeliveryService === 'premium' ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        Premium
                      </div>
                      {selectedDeliveryService === 'premium' && (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-white/90">
                          Recommended
                        </span>
                      )}
                    </div>
                    <div
                      className={`mt-0.5 text-[10px] sm:text-xs leading-snug ${
                        selectedDeliveryService === 'premium' ? 'text-gray-200' : 'text-gray-500'
                      }`}
                    >
                      Faster delivery
                    </div>
                  </div>
                </div>
              </Button>
              
              <Button
                variant={selectedDeliveryService === 'standard' ? 'default' : 'outline'}
                onClick={() => onDeliveryServiceChange('standard')}
                className={`h-auto min-h-[64px] sm:min-h-[74px] w-full justify-start px-3 py-2.5 sm:px-4 sm:py-3 transition-all duration-200 ${
                  selectedDeliveryService === 'standard'
                    ? 'bg-black text-white hover:bg-gray-800 shadow-md border-2 border-black'
                    : 'bg-white text-gray-800 hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex w-full items-start gap-2.5 sm:gap-3">
                  <div
                    className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                      selectedDeliveryService === 'standard'
                        ? 'border-white/15 bg-white/10'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <Clock
                      className={`h-4 w-4 ${
                        selectedDeliveryService === 'standard' ? 'text-white' : 'text-slate-600'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 text-left">
                    <div
                      className={`text-xs sm:text-sm font-semibold ${
                        selectedDeliveryService === 'standard' ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      Standard
                    </div>
                    <div
                      className={`mt-0.5 text-[10px] sm:text-xs leading-snug ${
                        selectedDeliveryService === 'standard' ? 'text-gray-200' : 'text-gray-500'
                      }`}
                    >
                      Regular delivery
                    </div>
                  </div>
                </div>
              </Button>
              
              <Button
                variant={selectedDeliveryService === 'priority' ? 'default' : 'outline'}
                onClick={() => onDeliveryServiceChange('priority')}
                className={`h-auto min-h-[64px] sm:min-h-[74px] w-full justify-start px-3 py-2.5 sm:px-4 sm:py-3 transition-all duration-200 ${
                  selectedDeliveryService === 'priority'
                    ? 'bg-black text-white hover:bg-gray-800 shadow-md border-2 border-black'
                    : 'bg-white text-gray-800 hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex w-full items-start gap-2.5 sm:gap-3">
                  <div
                    className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border ${
                      selectedDeliveryService === 'priority'
                        ? 'border-white/15 bg-white/10'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <Zap
                      className={`h-4 w-4 ${
                        selectedDeliveryService === 'priority' ? 'text-white' : 'text-fuchsia-600'
                      }`}
                    />
                  </div>
                  <div className="min-w-0 text-left">
                    <div
                      className={`text-xs sm:text-sm font-semibold ${
                        selectedDeliveryService === 'priority' ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      Priority
                    </div>
                    <div
                      className={`mt-0.5 text-[10px] sm:text-xs leading-snug ${
                        selectedDeliveryService === 'priority' ? 'text-gray-200' : 'text-gray-500'
                      }`}
                    >
                      Fastest delivery
                    </div>
                  </div>
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
