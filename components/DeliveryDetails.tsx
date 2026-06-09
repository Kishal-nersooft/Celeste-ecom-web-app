"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Truck,
  ShoppingBag,
  AlertCircle,
  Sparkles,
  Clock,
  Zap,
  DoorOpen,
  UserRound,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CartLocationSelector from "./CartLocationSelector";
import { useLocation } from "@/contexts/LocationContext";
import type { CheckoutDeliveryOption } from "@/lib/api";

interface DeliveryDetailsProps {
  onLocationChange: (location: string) => void;
  selectedLocation: string;
  selectedDeliveryService?: 'standard' | 'premium' | 'priority';
  onDeliveryServiceChange?: (service: 'standard' | 'premium' | 'priority') => void;
  selectedDeliveryOption: CheckoutDeliveryOption;
  onDeliveryOptionChange: (option: CheckoutDeliveryOption) => void;
  loading?: boolean;
}

const DeliveryDetails: React.FC<DeliveryDetailsProps> = ({
  onLocationChange,
  selectedLocation,
  selectedDeliveryService = 'standard',
  onDeliveryServiceChange,
  selectedDeliveryOption,
  onDeliveryOptionChange,
  loading = false,
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

  if (loading) {
    const showDeliveryExtras = selectedOrderType === "delivery" && !!onDeliveryServiceChange;

    return (
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
            <MapPin className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
            Delivery Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* Location */}
          <div className="space-y-2 sm:space-y-3">
            <div className="h-3.5 sm:h-4 w-32 rounded-md bg-gray-200 animate-pulse" />
            <div className="flex items-center justify-between gap-2 rounded-lg border border-green-100 bg-green-50/60 p-2 sm:p-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="h-3.5 w-3.5 shrink-0 rounded-full bg-green-200/80 animate-pulse sm:h-4 sm:w-4" />
                <div className="h-3.5 sm:h-4 w-3/4 max-w-[220px] rounded-md bg-green-200/70 animate-pulse" />
              </div>
              <div className="h-7 w-14 shrink-0 rounded-md bg-gray-100 animate-pulse" />
            </div>
          </div>

          {/* Order type */}
          <div className="space-y-2 sm:space-y-3">
            <div className="h-3.5 sm:h-4 w-24 rounded-md bg-gray-200 animate-pulse" />
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 sm:gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-2 sm:p-3"
                >
                  <div className="h-4 w-4 shrink-0 rounded-full bg-gray-200 animate-pulse" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 shrink-0 rounded-lg bg-gray-200 animate-pulse" />
                      <div className="h-3.5 w-16 rounded-md bg-gray-200 animate-pulse" />
                    </div>
                    <div className="h-2.5 w-full rounded-md bg-gray-100 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {showDeliveryExtras && (
            <div className="space-y-2 sm:space-y-3">
              <div className="h-3.5 sm:h-4 w-28 rounded-md bg-gray-200 animate-pulse" />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex min-h-[64px] items-start gap-2.5 rounded-lg border border-gray-100 bg-gray-50/50 p-3 sm:min-h-[74px] sm:gap-3 sm:p-4"
                  >
                    <div className="h-8 w-8 shrink-0 rounded-lg bg-gray-200 animate-pulse" />
                    <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                      <div className="h-3.5 w-20 rounded-md bg-gray-200 animate-pulse" />
                      <div className="h-2.5 w-full rounded-md bg-gray-100 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="h-3.5 w-36 rounded-md bg-gray-300 animate-pulse" />
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 rounded-md border border-gray-100 bg-gray-50/50 px-2 py-2 sm:gap-2 sm:px-2.5"
                    >
                      <div className="h-3.5 w-3.5 shrink-0 rounded-full bg-gray-200 animate-pulse" />
                      <div className="h-2.5 flex-1 rounded bg-gray-100 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

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

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-bold sm:text-sm">How should we deliver?</Label>
              <RadioGroup
                value={selectedDeliveryOption}
                onValueChange={(v) => onDeliveryOptionChange(v as CheckoutDeliveryOption)}
                className="grid grid-cols-3 gap-1.5 sm:gap-2"
              >
                <div
                  className={cn(
                    "flex min-w-0 items-center gap-1 rounded-md border border-gray-200 px-1.5 py-1 sm:gap-1.5 sm:px-2 sm:py-1.5",
                    selectedDeliveryOption === "leave_at_door" ? "bg-gray-100" : "hover:bg-gray-50"
                  )}
                >
                  <RadioGroupItem
                    value="leave_at_door"
                    id="delivery_option_leave_at_door"
                    className="h-3.5 w-3.5 shrink-0 border-gray-400 text-gray-900 [&_svg]:h-2 [&_svg]:w-2"
                  />
                  <Label
                    htmlFor="delivery_option_leave_at_door"
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-1 font-bold sm:gap-1.5"
                  >
                    <DoorOpen className="h-3.5 w-3.5 shrink-0 text-amber-600 sm:h-4 sm:w-4" aria-hidden />
                    <span className="truncate text-[10px] font-bold leading-tight sm:text-xs">Leave at door</span>
                  </Label>
                </div>
                <div
                  className={cn(
                    "flex min-w-0 items-center gap-1 rounded-md border border-gray-200 px-1.5 py-1 sm:gap-1.5 sm:px-2 sm:py-1.5",
                    selectedDeliveryOption === "meet_outside" ? "bg-gray-100" : "hover:bg-gray-50"
                  )}
                >
                  <RadioGroupItem
                    value="meet_outside"
                    id="delivery_option_meet_outside"
                    className="h-3.5 w-3.5 shrink-0 border-gray-400 text-gray-900 [&_svg]:h-2 [&_svg]:w-2"
                  />
                  <Label
                    htmlFor="delivery_option_meet_outside"
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-1 font-bold sm:gap-1.5"
                  >
                    <UserRound className="h-3.5 w-3.5 shrink-0 text-blue-600 sm:h-4 sm:w-4" aria-hidden />
                    <span className="truncate text-[10px] font-bold leading-tight sm:text-xs">Meet outside</span>
                  </Label>
                </div>
                <div
                  className={cn(
                    "flex min-w-0 items-center gap-1 rounded-md border border-gray-200 px-1.5 py-1 sm:gap-1.5 sm:px-2 sm:py-1.5",
                    selectedDeliveryOption === "at_reception" ? "bg-gray-100" : "hover:bg-gray-50"
                  )}
                >
                  <RadioGroupItem
                    value="at_reception"
                    id="delivery_option_at_reception"
                    className="h-3.5 w-3.5 shrink-0 border-gray-400 text-gray-900 [&_svg]:h-2 [&_svg]:w-2"
                  />
                  <Label
                    htmlFor="delivery_option_at_reception"
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-1 font-bold sm:gap-1.5"
                  >
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-600 sm:h-4 sm:w-4" aria-hidden />
                    <span className="truncate text-[10px] font-bold leading-tight sm:text-xs">At reception</span>
                  </Label>
                </div>
              </RadioGroup>
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
