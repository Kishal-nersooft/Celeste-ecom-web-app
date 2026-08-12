"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { updateProfile } from "firebase/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Title from "@/components/Title";
import Loader from "@/components/Loader";
import PhoneAuth from "@/components/PhoneAuth";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { getCurrentUserWithToken, registerUser } from "@/lib/api";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [step, setStep] = useState<"phone" | "name">("phone");
  const [idToken, setIdToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [checkingExistingUser, setCheckingExistingUser] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") ?? "/";

  React.useEffect(() => {
    // Important: after OTP verification Firebase sets `user` immediately.
    // We must check backend registration state before redirecting, otherwise
    // new users get redirected and never see the "enter name" step.
    const run = async () => {
      if (!user || step !== "phone" || checkingExistingUser) return;
      setCheckingExistingUser(true);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);
      try {
        const token = await user.getIdToken();
        const result = await getCurrentUserWithToken(token, false, { signal: controller.signal });
        if (result.registered) {
          router.push(returnUrl);
          return;
        }
        // Not registered yet: keep them on this page and collect name.
        // Custom-token users may not have phoneNumber on the Firebase user — keep the number from OTP if already set.
        setIdToken(token);
        setPhoneNumber((prev) => user.phoneNumber || prev || "");
        setStep("name");
      } catch (err) {
        // On mobile networks, this check can hang; don't keep the user on an infinite loader.
        const message =
          err instanceof DOMException && err.name === "AbortError"
            ? "Network timeout while checking your account. Please try again."
            : "Could not check your account. Please try again.";
        toast.error(message);
      } finally {
        clearTimeout(timeout);
        setCheckingExistingUser(false);
      }
    };
    run();
  }, [user, step, checkingExistingUser, router, returnUrl]);

  const handlePhoneSuccess = async (token: string, phone: string) => {
    try {
      const result = await getCurrentUserWithToken(token);
      if (result.registered) {
        toast.success("Welcome back!");
        router.push(returnUrl);
        return;
      }
      setIdToken(token);
      setPhoneNumber(phone);
      setStep("name");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    }
  };

  const handlePhoneError = (error: string) => {
    toast.error(error);
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setRegistering(true);
    try {
      await registerUser(idToken, name.trim());
      // Keep Firebase user profile in sync for UI fallbacks (e.g. Header/Profile).
      if (user) {
        try {
          await updateProfile(user, { displayName: name.trim() });
        } catch {
          // Non-blocking; backend is the source of truth for name.
        }
      }
      toast.success("Account created successfully!");
      router.push(returnUrl);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Registration failed. Please try again.";
      toast.error(message);
    } finally {
      setRegistering(false);
    }
  };

  if (user) {
    // If user is signed in but backend status is still being checked,
    // keep showing the login UI so we can route to "name" step when needed.
    if (checkingExistingUser) {
      return <Loader />;
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4">
      <Title className="!text-3xl">Login</Title>

      {step === "phone" ? (
        <div className="w-full max-w-md mt-8">
          <PhoneAuth onSuccess={handlePhoneSuccess} onError={handlePhoneError} />
        </div>
      ) : (
        <form onSubmit={handleNameSubmit} className="w-full max-w-md mt-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <Input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Phone verified: {phoneNumber}</p>
          </div>
          <Button type="submit" className="w-full" disabled={registering}>
            {registering ? "Creating account..." : "Continue"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep("phone")}
            className="w-full"
          >
            Change Phone Number
          </Button>
        </form>
      )}
    </div>
  );
}
