"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Title from "@/components/Title";
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
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") ?? "/";

  React.useEffect(() => {
    if (user) {
      router.push(returnUrl);
    }
  }, [user, router, returnUrl]);

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
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4">
        <Title className="!text-3xl">Welcome back!</Title>
        <p className="mt-4 text-gray-600">Taking you there...</p>
        <Link href={returnUrl} className="mt-4 text-blue-600 hover:underline">
          Go to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4">
      <Title className="!text-3xl">Login</Title>

      {/* Persistent reCAPTCHA container so it's never unmounted (avoids "Cannot read properties of null (reading 'style')" when switching to name step) */}
      <div id="recaptcha-container" className="hidden" aria-hidden="true" />

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
