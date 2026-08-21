"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { NetworkSignalIcon } from "@/components/NetworkSignalIcon";

interface AuthRetryScreenProps {
  message?: string;
}

const AuthRetryScreen: React.FC<AuthRetryScreenProps> = ({ message }) => {
  const { retry, loading } = useAuth();

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-16 bg-lightBg">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="max-w-md w-full rounded-2xl border border-black/5 bg-white px-6 py-10 text-center shadow-[0_12px_40px_-8px_rgba(0,0,0,0.12),0_4px_12px_-2px_rgba(0,0,0,0.05)]"
      >
        <div className="flex justify-center mb-5">
          <NetworkSignalIcon retrying={loading} />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">
          {loading ? "Trying again…" : "Connection issue"}
        </h1>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          {loading
            ? "Checking your connection now."
            : message ||
              "We couldn't reach your account. Retry, or keep browsing the shop."}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <motion.button
            type="button"
            onClick={retry}
            disabled={loading}
            whileHover={loading ? undefined : { scale: 1.03 }}
            whileTap={loading ? undefined : { scale: 0.96 }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              strokeWidth={2.5}
            />
            {loading ? "Retrying" : "Retry"}
          </motion.button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
          >
            Continue browsing
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthRetryScreen;
