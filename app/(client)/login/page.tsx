"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Loader from "@/components/Loader";
import PhoneAuth from "@/components/PhoneAuth";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { getCurrentUserWithToken, registerUser } from "@/lib/api";
import { queueIntroAfterLogin } from "@/lib/intro-splash";
import toast from "react-hot-toast";

function displayNameFromProfile(profile: unknown): string {
  if (!profile || typeof profile !== "object") return "";
  const record = profile as { name?: unknown };
  return typeof record.name === "string" ? record.name.trim() : "";
}

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
        const name = displayNameFromProfile(result.profile);
        toast.success(name ? `Welcome back ${name} 👋🏻` : "Welcome back 👋🏻");
        queueIntroAfterLogin();
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
      queueIntroAfterLogin();
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
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-black/5 bg-white px-6 py-8 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.12),0_4px_12px_-2px_rgba(0,0,0,0.05)]">
        {step === "phone" ? (
          <PhoneAuth onSuccess={handlePhoneSuccess} onError={handlePhoneError} />
        ) : (
          <form onSubmit={handleNameSubmit} className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Your name</h1>
              <p className="mt-1 text-sm text-neutral-500">{phoneNumber}</p>
            </div>
            <Input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              aria-label="Full name"
              className="h-11 rounded-xl border-neutral-200 bg-neutral-50 px-3 text-sm font-medium shadow-none focus-visible:border-black focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-black/10"
            />
            <Button
              type="submit"
              className="h-11 w-full rounded-full bg-black text-sm font-semibold text-white shadow-sm hover:bg-neutral-800"
              disabled={registering}
            >
              {registering ? "Creating…" : "Continue"}
            </Button>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setStep("phone")}
                disabled={registering}
                className="text-sm font-medium text-neutral-500 transition-colors hover:text-black disabled:opacity-50"
              >
                Change number
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
