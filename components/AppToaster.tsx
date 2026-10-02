"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Toaster, ToastBar, toast } from "react-hot-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const SWIPE_DISMISS_PX = 72;

function SwipeableToast({
  id,
  visible,
  children,
}: {
  id: string;
  visible: boolean;
  children: ReactNode;
}) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const tracking = useRef(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEntered(true);
      return;
    }
    const timer = window.setTimeout(() => setEntered(true), 20);
    return () => window.clearTimeout(timer);
  }, []);

  const resetGesture = () => {
    startX.current = null;
    startY.current = null;
    tracking.current = false;
    setDragging(false);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    startX.current = event.clientX;
    startY.current = event.clientY;
    tracking.current = false;
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (startX.current == null || startY.current == null) return;
    const dx = event.clientX - startX.current;
    const dy = event.clientY - startY.current;

    if (!tracking.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx) || dx <= 0) {
        resetGesture();
        return;
      }
      tracking.current = true;
      setDragging(true);
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is unavailable for this event.
      }
    }

    setOffset(Math.max(0, dx));
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (startX.current == null) return;
    const dx = Math.max(0, event.clientX - startX.current);
    const shouldDismiss = tracking.current && dx >= SWIPE_DISMISS_PX;
    resetGesture();
    if (shouldDismiss) {
      setOffset(Math.max(dx, 180));
      toast.dismiss(id);
      return;
    }
    setOffset(0);
  };

  const offscreen = "calc(100% + 32px)";
  const shift = !visible || !entered ? offscreen : `${offset}px`;

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        width: "fit-content",
        marginLeft: "auto",
        touchAction: "pan-y",
        transform: `translateX(${shift})`,
        opacity: !visible ? 0 : offset > 0 ? Math.max(0.25, 1 - offset / 220) : 1,
        transition: dragging || !entered
          ? "none"
          : "transform 280ms cubic-bezier(0.32, 0.72, 0, 1), opacity 240ms ease",
      }}
    >
      {children}
    </div>
  );
}

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
        <SwipeableToast id={t.id} visible={t.visible}>
          <ToastBar toast={t} style={{ animation: "none", opacity: 1 }}>
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
        </SwipeableToast>
      )}
    </Toaster>
  );
}
