"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MapPin,
  Truck,
  ShoppingBag,
  Sparkles,
  Clock,
  Zap,
  DoorOpen,
  UserRound,
  Building2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CartLocationSelector from "./CartLocationSelector";
import { useLocation } from "@/contexts/LocationContext";
import type { CheckoutDeliveryOption } from "@/lib/api";

interface DeliveryDetailsProps {
  onLocationChange: (location: string) => void;
  selectedLocation: string;
  selectedDeliveryService?: "standard" | "premium" | "priority";
  onDeliveryServiceChange?: (service: "standard" | "premium" | "priority") => void;
  selectedDeliveryOption: CheckoutDeliveryOption;
  onDeliveryOptionChange: (option: CheckoutDeliveryOption) => void;
  loading?: boolean;
}

const handoffOptions: {
  value: CheckoutDeliveryOption;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
}[] = [
  {
    value: "leave_at_door",
    label: "Leave at door",
    icon: DoorOpen,
    iconClassName: "text-amber-600",
  },
  {
    value: "meet_outside",
    label: "Meet outside",
    icon: UserRound,
    iconClassName: "text-sky-600",
  },
  {
    value: "at_reception",
    label: "At reception",
    icon: Building2,
    iconClassName: "text-slate-600",
  },
];

function OrderTypeCapsule({
  value,
  onChange,
}: {
  value: "delivery" | "pickup";
  onChange: (value: "delivery" | "pickup") => void;
}) {
  const options = [
    { id: "delivery" as const, label: "Delivery", icon: Truck },
    { id: "pickup" as const, label: "Pickup", icon: ShoppingBag },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Order type"
      className="inline-flex w-full rounded-full bg-neutral-100 p-1 lg:w-auto"
    >
      {options.map((option) => {
        const selected = value === option.id;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all lg:flex-none lg:px-3.5",
              selected
                ? "bg-neutral-900 text-white shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SelectionRow({
  icon,
  label,
  onEdit,
  empty,
  editLabel,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  onEdit: () => void;
  empty?: boolean;
  editLabel: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      title={title}
      className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-left transition-colors hover:bg-neutral-50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
        {icon}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm font-medium",
          empty ? "text-neutral-500" : "text-neutral-900"
        )}
      >
        {label}
      </span>
      <span className="hidden shrink-0 text-sm font-semibold text-neutral-900 lg:inline">{editLabel}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 lg:hidden" aria-hidden />
    </button>
  );
}

const DeliveryDetails: React.FC<DeliveryDetailsProps> = ({
  onLocationChange,
  selectedLocation,
  selectedDeliveryService = "standard",
  onDeliveryServiceChange,
  selectedDeliveryOption,
  onDeliveryOptionChange,
  loading = false,
}) => {
  const { deliveryType: selectedOrderType, setDeliveryType } = useLocation();
  const [locationOpen, setLocationOpen] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);

  const handleOrderTypeChange = (value: "delivery" | "pickup") => {
    setDeliveryType(value);
  };

  const isLocationSelected = selectedLocation && selectedLocation !== "Location";
  const selectedHandoff =
    handoffOptions.find((option) => option.value === selectedDeliveryOption) ?? handoffOptions[1];
  const HandoffIcon = selectedHandoff.icon;
  const showDeliveryExtras = selectedOrderType === "delivery" && !!onDeliveryServiceChange;

  if (loading) {
    return (
      <Card className="h-fit">
        <CardHeader className="hidden flex-row items-center justify-between space-y-0 lg:flex">
          <div className="h-5 w-36 rounded-md bg-gray-200 animate-pulse" />
          <div className="h-10 w-52 rounded-full bg-gray-100 animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-3 pt-6 sm:space-y-4 lg:pt-0">
          <div className="h-10 w-full rounded-full bg-gray-100 animate-pulse lg:hidden" />
          <div className="h-14 w-full rounded-xl bg-gray-100 animate-pulse" />
          {showDeliveryExtras && (
            <>
              <div className="h-14 w-full rounded-xl bg-gray-100 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-32 rounded-md bg-gray-200 animate-pulse" />
                <div className="h-[4.75rem] w-full rounded-2xl bg-gray-100 animate-pulse" />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit">
      <CardHeader className="hidden flex-row items-center justify-between space-y-0 pb-2 lg:flex">
        <CardTitle className="text-sm sm:text-base md:text-lg">Delivery Details</CardTitle>
        <OrderTypeCapsule value={selectedOrderType} onChange={handleOrderTypeChange} />
      </CardHeader>
      <CardContent className="space-y-3 pt-6 sm:space-y-4 lg:pt-0">
        <div className="lg:hidden">
          <OrderTypeCapsule value={selectedOrderType} onChange={handleOrderTypeChange} />
        </div>

        <SelectionRow
          icon={<MapPin className="h-4 w-4" />}
          label={isLocationSelected ? selectedLocation : "Select a location"}
          title={isLocationSelected ? selectedLocation : undefined}
          empty={!isLocationSelected}
          editLabel="Edit"
          onEdit={() => setLocationOpen(true)}
        />
        <CartLocationSelector
          hideTrigger
          open={locationOpen}
          onOpenChange={setLocationOpen}
          onLocationSelect={onLocationChange}
        />

        {showDeliveryExtras && (
          <>
            <SelectionRow
              icon={<HandoffIcon className={cn("h-4 w-4", selectedHandoff.iconClassName)} />}
              label={selectedHandoff.label}
              editLabel="Edit"
              onEdit={() => setHandoffOpen(true)}
            />

            <Dialog open={handoffOpen} onOpenChange={setHandoffOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>How should we deliver?</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  {handoffOptions.map((option) => {
                    const selected = selectedDeliveryOption === option.value;
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onDeliveryOptionChange(option.value);
                          setHandoffOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                          selected
                            ? "border-neutral-900 bg-neutral-50"
                            : "border-neutral-200 hover:bg-neutral-50"
                        )}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
                          <Icon className={cn("h-4 w-4", option.iconClassName)} />
                        </span>
                        <span className="text-sm font-medium text-neutral-900">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>

            <div className="space-y-2.5">
              <Label className="text-xs font-medium sm:text-sm">Delivery Options</Label>
              <div
                role="radiogroup"
                aria-label="Delivery Options"
                className="relative grid grid-cols-3 gap-1 rounded-2xl bg-neutral-100 p-1.5"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-1.5 left-1.5 top-1.5 w-[calc((100%-0.75rem-0.5rem)/3)] rounded-xl bg-neutral-900 shadow-sm transition-transform duration-300 ease-out"
                  style={{
                    transform: `translateX(calc(${Math.max(
                      0,
                      ["premium", "standard", "priority"].indexOf(selectedDeliveryService)
                    )} * (100% + 0.25rem)))`,
                  }}
                />
                {(
                  [
                    { id: "premium" as const, label: "Premium", icon: Sparkles },
                    { id: "standard" as const, label: "Standard", icon: Clock },
                    { id: "priority" as const, label: "Priority", icon: Zap },
                  ]
                ).map((option) => {
                  const selected = selectedDeliveryService === option.id;
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => onDeliveryServiceChange?.(option.id)}
                      className={cn(
                        "relative z-10 flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-sm transition-colors duration-300",
                        selected ? "font-bold text-white" : "font-medium text-neutral-500 hover:text-neutral-800"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5 transition-all duration-300",
                          selected ? "scale-110 text-white" : "scale-100 text-neutral-400"
                        )}
                        aria-hidden
                      />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryDetails;
