"use client";

import React from "react";
import { motion } from "framer-motion";
import { RefreshCw, WifiOff } from "lucide-react";

export function NetworkSignalIcon({ retrying }: { retrying: boolean }) {
  return (
    <div className="relative h-11 w-11 shrink-0">
      {!retrying && (
        <>
          <motion.span
            className="absolute inset-0 rounded-full border border-black/15"
            animate={{ scale: [1, 1.55], opacity: [0.45, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.span
            className="absolute inset-0 rounded-full border border-black/10"
            animate={{ scale: [1, 1.55], opacity: [0.35, 0] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.55,
            }}
          />
        </>
      )}
      <motion.div
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-black text-white shadow-sm"
        animate={retrying ? { scale: [1, 0.94, 1] } : { scale: 1 }}
        transition={
          retrying
            ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" }
            : { type: "spring", stiffness: 420, damping: 22 }
        }
      >
        {retrying ? (
          <RefreshCw className="h-5 w-5 animate-spin" strokeWidth={2.25} />
        ) : (
          <WifiOff className="h-5 w-5" strokeWidth={2.25} />
        )}
      </motion.div>
    </div>
  );
}
