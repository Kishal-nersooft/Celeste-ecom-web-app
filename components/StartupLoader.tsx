"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import Loader from "@/components/Loader";
import { NetworkSignalIcon } from "@/components/NetworkSignalIcon";

const STARTUP_LOADER_TIMEOUT_MS = 4000;

const StartupLoader = () => {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setTimedOut(true);
    }, STARTUP_LOADER_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!timedOut) {
    return <Loader />;
  }

  return (
    <div className="fixed top-0 left-0 w-full min-h-screen z-50 bg-lightBg flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="max-w-md w-full rounded-2xl border border-black/5 bg-white px-6 py-10 text-center shadow-[0_12px_40px_-8px_rgba(0,0,0,0.12),0_4px_12px_-2px_rgba(0,0,0,0.05)]"
      >
        <div className="flex justify-center mb-5">
          <NetworkSignalIcon retrying={false} />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">
          This is taking longer than usual
        </h1>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          Check your connection and retry, or wait a moment for the page to finish loading.
        </p>
        <motion.button
          type="button"
          onClick={() => window.location.reload()}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-neutral-800"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2.5} />
          Retry
        </motion.button>
      </motion.div>
    </div>
  );
};

export default StartupLoader;
