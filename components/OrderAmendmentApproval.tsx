"use client";

import React, { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import PriceFormatter from "@/components/PriceFormatter";
import {
  approveOrderAmendment,
  getOrderById,
  rejectOrderAmendment,
} from "@/lib/api";
import {
  amendmentResultCopy,
  formatApprovalRemaining,
  orderPatchFromPayload,
  unwrapOrderPayload,
} from "@/lib/order-amendment";
import type { Order } from "@/store";

type Phase = "idle" | "submitting" | "confirming";

interface OrderAmendmentApprovalProps {
  order: Order;
  onUpdated: (orderId: string, patch: Partial<Order>) => void;
}

const POLL_INTERVAL_MS = 4000;
const POLL_WINDOW_MS = 90_000;

const OrderAmendmentApproval = ({ order, onUpdated }: OrderAmendmentApprovalProps) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const onUpdatedRef = useRef(onUpdated);
  const blockRetryRef = useRef(false);
  onUpdatedRef.current = onUpdated;

  const deadlineAt = order.approvalDeadlineAt;
  const isPending = order.approvalStatus === "pending";

  useEffect(() => {
    if (!isPending || !deadlineAt) {
      setRemainingMs(null);
      return;
    }

    const deadlineMs = Date.parse(deadlineAt);
    if (Number.isNaN(deadlineMs)) {
      setRemainingMs(null);
      return;
    }

    // A replacement amendment sends a new deadline and opens a fresh window.
    blockRetryRef.current = false;

    const tick = () => {
      const left = deadlineMs - Date.now();
      if (left <= 0) {
        setRemainingMs(0);
        setPhase((current) => (current === "submitting" ? current : "confirming"));
        return true;
      }
      setRemainingMs(left);
      setPhase((current) => {
        if (current === "submitting" || blockRetryRef.current) return current;
        return "idle";
      });
      return false;
    };

    if (tick()) return;
    const id = window.setInterval(() => {
      if (tick()) window.clearInterval(id);
    }, 250);
    return () => window.clearInterval(id);
  }, [deadlineAt, isPending]);

  useEffect(() => {
    if (!isPending || phase !== "confirming") return;

    let stopped = false;
    const started = Date.now();

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
      });

    const poll = async () => {
      while (!stopped && Date.now() - started <= POLL_WINDOW_MS) {
        try {
          const response = await getOrderById(order.id);
          if (stopped) return;
          const raw = unwrapOrderPayload(response);
          if (raw) {
            const patch = orderPatchFromPayload(raw);
            const status = String(patch.status || "").toUpperCase();
            const settled =
              (patch.approvalStatus != null && patch.approvalStatus !== "pending") ||
              status === "CANCELLED" ||
              status === "CANCELED" ||
              status === "REFUNDED";
            if (settled) {
              onUpdatedRef.current(order.id, patch as Partial<Order>);
              return;
            }
          }
        } catch {
          // The server cancels shortly after the deadline. Keep waiting.
        }
        await sleep(POLL_INTERVAL_MS);
      }
    };

    void poll();
    return () => {
      stopped = true;
    };
  }, [isPending, order.id, phase]);

  const applyResponseOrder = (payload: unknown) => {
    const raw = unwrapOrderPayload(payload);
    if (!raw) return null;
    const patch = orderPatchFromPayload(raw);
    onUpdated(order.id, patch as Partial<Order>);
    return patch;
  };

  const handleApprove = async () => {
    if (phase !== "idle" || blockRetryRef.current) return;
    setPhase("submitting");
    try {
      const result = await approveOrderAmendment(order.id);
      if (!result.ok) {
        // Late 400: refetch and show the order. Do not retry the approve call.
        blockRetryRef.current = true;
        setPhase("confirming");
        return;
      }
      const patch = applyResponseOrder(result.order);
      if (!patch?.approvalStatus || patch.approvalStatus === "pending") {
        onUpdated(order.id, { approvalStatus: "approved" });
      }
      toast.success("Change approved. The extra will be taken at dispatch.");
    } catch (error) {
      console.error("Approve amendment error:", error);
      setPhase("idle");
      toast.error(error instanceof Error ? error.message : "Couldn't approve the change");
    }
  };

  const handleReject = async () => {
    if (phase !== "idle" || blockRetryRef.current) return;
    setPhase("submitting");
    try {
      const result = await rejectOrderAmendment(order.id);
      if (!result.ok) {
        blockRetryRef.current = true;
        setPhase("confirming");
        return;
      }
      const patch = applyResponseOrder(result.order);
      if (!patch?.approvalStatus || patch.approvalStatus === "pending") {
        onUpdated(order.id, {
          approvalStatus: "rejected",
          cancelReasonCode: patch?.cancelReasonCode ?? "amendment_rejected",
        });
      }
      toast.success("You declined the change. Your payment will be fully refunded.");
    } catch (error) {
      console.error("Reject amendment error:", error);
      setPhase("idle");
      toast.error(error instanceof Error ? error.message : "Couldn't cancel the order");
    }
  };

  if (isPending) {
    const waitingOnServer =
      phase === "confirming" || (remainingMs !== null && remainingMs <= 0);
    const busy = phase === "submitting" || waitingOnServer;
    const paid = order.originalTotalAmount;
    const now = order.totalAmount;
    const extra = order.approvalAmount;

    return (
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-5 text-center">
        <h4 className="text-base font-semibold text-gray-900">Approve your order change</h4>
        <dl className="mx-auto mt-4 max-w-sm space-y-2 text-sm text-gray-800">
          <div className="flex items-center justify-between gap-4">
            <dt>You paid</dt>
            <dd>
              {paid != null ? (
                <PriceFormatter amount={paid} className="text-sm font-medium text-gray-900" />
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt>Order total now</dt>
            <dd>
              {now != null ? (
                <PriceFormatter amount={now} className="text-sm font-medium text-gray-900" />
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 font-semibold">
            <dt>Extra to pay</dt>
            <dd className="inline-flex items-center">
              +<PriceFormatter amount={extra} className="text-sm font-semibold text-gray-900" />
            </dd>
          </div>
        </dl>

        <p className="mt-4 inline-flex items-center justify-center gap-1.5 text-sm font-medium text-gray-900">
          <Clock className="h-4 w-4" />
          {waitingOnServer || phase === "submitting"
            ? "Confirming…"
            : remainingMs !== null
              ? `${formatApprovalRemaining(remainingMs)} left to approve`
              : "Waiting for the approval deadline"}
        </p>

        {!waitingOnServer && (
          <div className="mx-auto mt-4 flex max-w-sm flex-col items-center gap-3">
            <Button
              type="button"
              onClick={handleApprove}
              disabled={busy}
              className="h-11 w-full bg-black text-white hover:bg-gray-800"
            >
              <span className="inline-flex items-center">
                Approve +
                <PriceFormatter amount={extra} className="font-medium text-white" />
              </span>
            </Button>
            <button
              type="button"
              onClick={handleReject}
              disabled={busy}
              className="text-sm text-gray-800 underline underline-offset-2 disabled:opacity-50"
            >
              {phase === "submitting" ? "Confirming…" : "No thanks, cancel my order"}
            </button>
          </div>
        )}

        <p className="mx-auto mt-4 max-w-xs text-xs text-gray-600">
          Without your approval the order is cancelled and fully refunded.
        </p>
      </div>
    );
  }

  const outcome = amendmentResultCopy(order);
  if (!outcome) return null;

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800">
      <p className="font-medium text-gray-900">{outcome.title}</p>
      <p className="mt-1 text-gray-600">{outcome.detail}</p>
    </div>
  );
};

export default OrderAmendmentApproval;
