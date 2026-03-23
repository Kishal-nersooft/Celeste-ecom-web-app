"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const MASTERCARD_CHECKOUT_SCRIPT =
  "https://cbcmpgs.gateway.mastercard.com/static/checkout/checkout.min.js";

declare global {
  interface Window {
    Checkout?: {
      configure: (config: { session: { id: string } }) => void;
      showPaymentPage: () => void;
    };
  }
}

export default function CheckoutPaymentPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!sessionId || !sessionId.trim()) {
      setStatus("error");
      setErrorMessage("Missing payment session. Please go back to checkout and place the order again.");
      return;
    }

    let scriptEl: HTMLScriptElement | null = null;

    const initCheckout = () => {
      if (typeof window === "undefined" || !window.Checkout) return;
      const container = document.getElementById("mastercard-checkout-container");
      if (!container) {
        setErrorMessage("Payment container not found.");
        setStatus("error");
        return;
      }

      try {
        window.Checkout.configure({
          session: { id: sessionId.trim() },
        });
        // Prefer embedding in our container so the SDK has a valid target (avoids appendChild null).
        const checkout = window.Checkout as typeof window.Checkout & { showEmbeddedPage?: (selector: string) => void };
        if (typeof checkout.showEmbeddedPage === "function") {
          checkout.showEmbeddedPage("#mastercard-checkout-container");
        } else {
          window.Checkout.showPaymentPage();
        }
        setStatus("ready");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to start payment form.";
        setErrorMessage(msg);
        setStatus("error");
      }
    };

    const loadScript = () => {
      if (window.Checkout) {
        initCheckout();
        return;
      }

      scriptEl = document.createElement("script");
      scriptEl.src = MASTERCARD_CHECKOUT_SCRIPT;
      scriptEl.async = true;
      scriptEl.onload = () => {
        if (window.Checkout) initCheckout();
        else {
          setErrorMessage("Payment gateway script did not load correctly.");
          setStatus("error");
        }
      };
      scriptEl.onerror = () => {
        setErrorMessage("Could not load payment gateway. Check your connection and try again.");
        setStatus("error");
      };
      document.body.appendChild(scriptEl);
    };

    loadScript();

    return () => {
      if (scriptEl && scriptEl.parentNode) scriptEl.parentNode.removeChild(scriptEl);
    };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-start pt-8 px-4">
        <h1 className="text-xl font-semibold text-gray-800 mb-4">Complete your payment</h1>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 text-gray-600">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p>Loading payment gateway...</p>
          </div>
        )}

        {status === "error" && (
          <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
            <p className="text-red-600 font-medium">{errorMessage}</p>
            <p className="text-sm text-gray-500 mt-2">
              You can close this tab and try again from the checkout page.
            </p>
          </div>
        )}

        {/* Dedicated container for Mastercard SDK – must exist before showPaymentPage() */}
        <div
          id="mastercard-checkout-container"
          ref={containerRef}
          className="w-full max-w-lg min-h-[400px] bg-white rounded-lg shadow overflow-hidden"
          style={{ minHeight: "420px" }}
        />
      </div>
    </div>
  );
}
