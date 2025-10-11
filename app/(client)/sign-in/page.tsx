"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Title from "@/components/Title";
import PhoneAuth from "@/components/PhoneAuth";
import { useAuth } from "@/components/FirebaseAuthProvider";
import toast from "react-hot-toast";

const SignInPage = () => {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handlePhoneSuccess = async (token: string, phone: string) => {
    try {
      // For sign in, we just need to verify the phone number
      // The user is already authenticated by Firebase
      toast.success("Signed in successfully!");
      router.push("/");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handlePhoneError = (error: string) => {
    toast.error(error);
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
      <Title className="!text-3xl">Sign In</Title>
      
      <div className="w-full max-w-md mt-8">
        <PhoneAuth 
          onSuccess={handlePhoneSuccess}
          onError={handlePhoneError}
          isSignUp={false}
        />
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{" "}
          <Link href="/sign-up" className="text-blue-600 hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignInPage;
