"use client";

import { Toaster, ToastBar, toast } from "react-hot-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const baseToastStyle: React.CSSProperties = {
  background: "#ffffff",
  color: "#171717",
  border: "1px solid rgba(0, 0, 0, 0.06)",
  borderRadius: "14px",
  boxShadow:
    "0 12px 40px -8px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05)",
  padding: "14px 18px",
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: 1.45,
  maxWidth: "min(360px, calc(100vw - 32px))",
  fontFamily: "var(--font-poppins), system-ui, sans-serif",
};

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      containerStyle={{
        top: 20,
        right: 20,
      }}
      toastOptions={{
        duration: 3500,
        style: baseToastStyle,
        success: {
          iconTheme: {
            primary: "#16a34a",
            secondary: "#ffffff",
          },
          style: {
            ...baseToastStyle,
            borderLeft: "3px solid #16a34a",
          },
        },
        error: {
          iconTheme: {
            primary: "#dc2626",
            secondary: "#ffffff",
          },
          style: {
            ...baseToastStyle,
            borderLeft: "3px solid #dc2626",
          },
        },
        loading: {
          style: {
            ...baseToastStyle,
            borderLeft: "3px solid #171717",
          },
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <div className="flex w-full items-start gap-2.5">
              {icon}
              <div className="min-w-0 flex-1">{message}</div>
              {t.type !== "loading" && (
                <button
                  type="button"
                  onClick={() => toast.dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className={cn(
                    "mt-0.5 shrink-0 rounded-md p-0.5 text-neutral-400 transition-colors",
                    "hover:bg-neutral-100 hover:text-neutral-600",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300",
                  )}
                >
                  <X className="size-4" strokeWidth={2} />
                </button>
              )}
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}
