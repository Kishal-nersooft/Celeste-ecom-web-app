"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Title from "@/components/Title";
import PhoneAuth from "@/components/PhoneAuth";
import { useAuth } from "@/components/FirebaseAuthProvider";
import { registerUser } from "@/lib/auth-api";
import toast from "react-hot-toast";

const SignUpPage = () => {
  const [name, setName] = useState("");
  const [step, setStep] = useState<'phone' | 'name'>('phone');
  const [idToken, setIdToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const { user } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handlePhoneSuccess = async (token: string, phone: string) => {
    setIdToken(token);
    setPhoneNumber(phone);
    setStep('name');
  };

  const handlePhoneError = (error: string) => {
    toast.error(error);
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      const result = await registerUser({ idToken, name });
      if (result.success) {
        toast.success("Account created successfully!");
        router.push("/");
      } else {
        toast.error(result.error || "Failed to create account. Please try again.");
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4">
        <Title className="!text-3xl">Already Signed In</Title>
        <p className="mt-4 text-gray-600">You are already signed in.</p>
        <Link href="/" className="mt-4 text-blue-600 hover:underline">
          Go to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4">
      <Title className="!text-3xl">Sign Up</Title>
      
      {step === 'phone' ? (
        <div className="w-full max-w-md mt-8">
          <PhoneAuth 
            onSuccess={handlePhoneSuccess}
            onError={handlePhoneError}
            isSignUp={true}
          />
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
            <p className="text-xs text-gray-500 mt-1">
              Phone verified: {phoneNumber}
            </p>
          </div>
          <Button type="submit" className="w-full">
            Complete Registration
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setStep('phone')}
            className="w-full"
          >
            Change Phone Number
          </Button>
        </form>
      )}

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-blue-600 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;
