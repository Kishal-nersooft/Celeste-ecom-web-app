"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { NetworkSignalIcon } from "@/components/NetworkSignalIcon";

const AUTH_RETRY_ROUTES = [
  "/cart",
  "/checkout",
  "/favorites",
  "/recent-items",
  "/profile",
  "/saved-address",
  "/saved-cards",
  "/orders",
];

const AuthStatusBanner: React.FC = () => {
  const { unresolved, retry, loading } = useAuth();
  const pathname = usePathname();

  const hasInlineRetry = AUTH_RETRY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const visible = unresolved && !hasInlineRetry;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="fixed z-40 max-lg:bottom-24 max-lg:inset-x-4 lg:top-24 lg:right-6 lg:bottom-auto lg:left-auto lg:w-[380px]"
        >
          <motion.div
            className="rounded-2xl border border-yellow-200/70 bg-white px-4 py-3.5 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.12),0_4px_12px_-2px_rgba(0,0,0,0.05)]"
            animate={{
              boxShadow: [
                "0 0 0 1px rgba(253,224,71,0.22), 0 0 8px rgba(253,224,71,0.12), 0 12px 40px -8px rgba(0,0,0,0.12)",
                "0 0 0 1px rgba(253,224,71,0.38), 0 0 12px rgba(253,224,71,0.2), 0 12px 40px -8px rgba(0,0,0,0.12)",
                "0 0 0 1px rgba(253,224,71,0.22), 0 0 8px rgba(253,224,71,0.12), 0 12px 40px -8px rgba(0,0,0,0.12)",
              ],
            }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="flex items-center gap-3">
              <NetworkSignalIcon retrying={loading} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {loading ? "Trying again…" : "Connection issue"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {loading
                    ? "Checking your connection now."
                    : "You can keep shopping. Retry to restore your account."}
                </p>
              </div>
              <motion.button
                type="button"
                onClick={retry}
                disabled={loading}
                whileHover={loading ? undefined : { scale: 1.03 }}
                whileTap={loading ? undefined : { scale: 0.96 }}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-black px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                  strokeWidth={2.5}
                />
                {loading ? "Retrying" : "Retry"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AuthStatusBanner;
