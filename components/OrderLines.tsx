"use client";

import React from "react";
import { ArrowDown, Phone, Plus } from "lucide-react";
import PriceFormatter from "@/components/PriceFormatter";
import OrderItemChoice from "@/components/OrderItemChoice";
import { heldLineCopy } from "@/lib/order-hold";
import type { OrderItem } from "@/store";

function lineTotal(item: OrderItem): number {
  if (item.totalPrice != null) return item.totalPrice;
  const quantity = item.suppliedQuantity ?? item.quantity;
  return item.price * quantity;
}

function ProductCard({
  name,
  imageUrl,
  detail,
  amount,
  previousAmount,
  unavailable,
  statusLabel,
  badge,
}: {
  name: string;
  imageUrl?: string;
  detail: React.ReactNode;
  amount: number;
  previousAmount?: number;
  unavailable?: boolean;
  statusLabel?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-gray-50">
      <div
        className={`flex items-center gap-2 p-2 sm:gap-3 sm:p-3 ${
          unavailable ? "pointer-events-none select-none blur-[2px] grayscale opacity-60" : ""
        }`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover sm:h-12 sm:w-12" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-300 text-[10px] text-gray-500 sm:h-12 sm:w-12">
            No Image
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-xs font-medium text-gray-900 sm:text-sm">{name}</h4>
          <div className="text-[10px] text-gray-600 sm:text-xs">{detail}</div>
        </div>
        <div className="shrink-0 text-right">
          {previousAmount != null && (
            <PriceFormatter
              amount={previousAmount}
              className="block text-[10px] font-normal text-gray-400 line-through sm:text-xs"
            />
          )}
          <PriceFormatter amount={amount} className="text-xs font-semibold sm:text-sm" />
        </div>
        {badge}
      </div>
      {unavailable && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full border border-gray-200 bg-white/95 px-3 py-1 text-xs font-semibold text-gray-800 shadow-sm">
            {statusLabel ?? "Refunded"}
          </span>
        </div>
      )}
    </div>
  );
}

function Thumb({ imageUrl, mark }: { imageUrl?: string; mark?: "out" | "in" }) {
  return (
    <div className="relative shrink-0">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-12 w-12 rounded-md object-cover" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-200 text-[10px] text-gray-500">
          No Image
        </div>
      )}
      {mark && (
        <span
          className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-sm ${
            mark === "out" ? "bg-gray-500" : "bg-sky-600"
          }`}
        >
          {mark === "out" ? "−" : "+"}
        </span>
      )}
    </div>
  );
}

function PriceDelta({ amount }: { amount: number }) {
  if (Math.abs(amount) < 0.009) return null;
  const increase = amount > 0;
  return (
    <span className={`inline-flex items-center text-xs font-semibold ${increase ? "text-amber-700" : "text-emerald-700"}`}>
      {increase ? "+" : "−"}
      <PriceFormatter amount={Math.abs(amount)} className={`text-xs font-semibold ${increase ? "text-amber-700" : "text-emerald-700"}`} />
    </span>
  );
}

function ReplacementGroup({
  item,
  ordered,
  supplied,
}: {
  item: OrderItem;
  ordered: number;
  supplied: number;
}) {
  const replacement = item.replacement;
  const fullReplace = item.isReplaced || supplied <= 0;
  const partial = !fullReplace && supplied < ordered;
  const replacedCount = fullReplace ? Math.max(ordered, 1) : Math.max(ordered - supplied, 0);
  const unitPrice = item.originalUnitPrice ?? item.price;
  const removedValue = replacedCount * unitPrice;
  const addedValue = replacement
    ? (replacement.totalPrice ?? replacement.quantity * replacement.unitPrice)
    : 0;
  const delta = replacement ? addedValue - removedValue : 0;

  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50/80 p-3">
      {partial && (
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/80 px-2 py-2">
          <Thumb imageUrl={item.imageUrl} />
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-medium text-gray-900">{item.name}</h4>
            <p className="text-xs font-medium text-gray-700">
              Ordered {ordered} · supplying {supplied}
            </p>
          </div>
          <PriceFormatter
            amount={item.totalPrice ?? supplied * item.price}
            className="shrink-0 text-sm font-semibold text-gray-900"
          />
        </div>
      )}

      {!partial && replacedCount > 0 && (
        <div className="flex items-center gap-3 px-1 opacity-70">
          <Thumb imageUrl={item.imageUrl} mark="out" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="truncate text-sm font-medium text-gray-500 line-through">{item.name}</h4>
              {fullReplace && (
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                  Substituted
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              Qty: {replacedCount} ×{" "}
              <PriceFormatter amount={unitPrice} className="text-xs font-normal text-gray-400" />
            </p>
          </div>
          <PriceFormatter amount={removedValue} className="shrink-0 text-sm font-medium text-gray-400 line-through" />
        </div>
      )}

      {replacement && (
        <>
          <div className="my-2 flex items-center gap-2">
            <div className="h-px flex-1 bg-sky-200" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 shadow-sm">
              <ArrowDown className="h-3.5 w-3.5 text-sky-700" />
              <PriceDelta amount={delta} />
            </span>
            <div className="h-px flex-1 bg-sky-200" />
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-white px-2 py-2 shadow-sm">
            <Thumb imageUrl={replacement.imageUrl} mark="in" />
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-medium text-gray-900">{replacement.name}</h4>
              <p className="text-xs text-gray-500">
                Qty: {replacement.quantity} ×{" "}
                <PriceFormatter amount={replacement.unitPrice} className="text-xs font-normal text-gray-500" />
              </p>
            </div>
            <PriceFormatter amount={addedValue} className="shrink-0 text-sm font-semibold text-gray-900" />
          </div>
        </>
      )}

      {item.agreementNote && (
        <p className="mt-2 flex items-center gap-1.5 px-1 text-xs text-gray-500">
          <Phone className="h-3.5 w-3.5" />
          {item.agreementNote}
        </p>
      )}
    </div>
  );
}

function ItemRow({
  item,
  orderId,
  liveVersion,
  onChoiceApplied,
}: {
  item: OrderItem;
  orderId?: string;
  liveVersion?: number;
  onChoiceApplied?: () => void;
}) {
  const ordered = item.orderedQuantity ?? item.quantity;
  const supplied = item.suppliedQuantity ?? ordered;
  const amount = lineTotal(item);
  const repriced =
    item.isRepriced &&
    item.originalUnitPrice != null &&
    Math.abs(item.originalUnitPrice - item.price) > 0.009;

  if (item.holdStatus === "awaiting_customer") {
    const held = item.heldQuantity ?? 0;
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-1">
        <ProductCard
          name={item.name}
          imageUrl={item.imageUrl}
          amount={amount}
          detail={
            <span className="font-medium text-amber-900">{heldLineCopy(item.quantity, held)}</span>
          }
        />
        {orderId && item.lineId && onChoiceApplied && (
          <div className="px-2 pb-2">
            <OrderItemChoice
              orderId={orderId}
              item={item}
              liveVersion={liveVersion}
              onApplied={onChoiceApplied}
            />
          </div>
        )}
      </div>
    );
  }

  if (item.replacement || item.isReplaced) {
    return <ReplacementGroup item={item} ordered={ordered} supplied={supplied} />;
  }

  if (item.unavailable || item.isOutOfStock) {
    return (
      <ProductCard
        name={item.name}
        imageUrl={item.imageUrl}
        amount={amount}
        unavailable
        statusLabel={item.isOutOfStock ? "Refunded" : "Unavailable"}
        detail={
          <>
            Qty: {ordered} × <PriceFormatter amount={item.price} className="text-[10px] font-normal text-gray-600 sm:text-xs" />
          </>
        }
      />
    );
  }

  const added = ordered === 0 && item.quantity > 0;
  const quantityChanged = supplied !== ordered && !added;

  if (added) {
    return (
      <ProductCard
        name={item.name}
        imageUrl={item.imageUrl}
        amount={item.quantity * item.price}
        detail={
          <span className="inline-flex items-center gap-1 font-medium text-sky-700">
            <Plus className="h-3 w-3" />
            Qty {item.quantity}
          </span>
        }
        badge={
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-[11px] font-bold text-white">
            +
          </span>
        }
      />
    );
  }

  return (
    <ProductCard
      name={item.name}
      imageUrl={item.imageUrl}
      amount={quantityChanged ? (item.totalPrice ?? supplied * item.price) : amount}
      previousAmount={
        quantityChanged
          ? ordered * (item.originalUnitPrice ?? item.price)
          : repriced
            ? ordered * (item.originalUnitPrice ?? item.price)
            : undefined
      }
      detail={
        quantityChanged ? (
          <p className="font-medium text-gray-700">
            Ordered {ordered} · supplying {supplied}
          </p>
        ) : repriced ? (
          <p>
            Qty: {ordered} ×{" "}
            <PriceFormatter
              amount={item.originalUnitPrice}
              className="text-[10px] font-normal text-gray-400 line-through sm:text-xs"
            />
            {" "}
            <PriceFormatter amount={item.price} className="text-[10px] font-medium text-gray-800 sm:text-xs" />
          </p>
        ) : (
          <>
            Qty: {ordered} × <PriceFormatter amount={item.price} className="text-[10px] font-normal text-gray-600 sm:text-xs" />
            {item.isReplacement ? <span className="ml-1 font-medium text-sky-700">· Replacement</span> : null}
          </>
        )
      }
    />
  );
}

const OrderLines = ({
  items,
  orderId,
  liveVersion,
  onChoiceApplied,
}: {
  items: OrderItem[];
  paid?: number;
  totalNow?: number;
  orderId?: string;
  liveVersion?: number;
  onChoiceApplied?: () => void;
}) => {
  const rows = items;

  return (
    <div className="space-y-2 sm:space-y-3">
      {rows.map((item, index) => (
        <ItemRow
          key={`${item.lineId ?? item.productId}-${index}`}
          item={item}
          orderId={orderId}
          liveVersion={liveVersion}
          onChoiceApplied={onChoiceApplied}
        />
      ))}
    </div>
  );
};

export default OrderLines;
