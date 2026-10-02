'use client';

import React, { useState } from 'react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { sendOtp, verifyOtpAndSignIn } from '@/lib/otpAuth';
import toast from 'react-hot-toast';

interface PhoneAuthProps {
  onSuccess: (idToken: string, phoneNumber: string, isNewUser?: boolean) => void;
  onError: (error: string) => void;
  isSignUp?: boolean;
}

export default function PhoneAuth({ onSuccess, onError }: PhoneAuthProps) {
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>(undefined);
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  const sendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      toast.error('Please enter your phone number');
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      await sendOtp(phoneNumber);
      setStep('otp');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send OTP';
      console.error('Error sending OTP:', error);
      onError(message);
      toast.error('Failed to send OTP: ' + message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    const sanitizedOtp = otp.replace(/\D/g, '');

    if (!sanitizedOtp || sanitizedOtp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    if (!phoneNumber) {
      toast.error('OTP session expired. Please request a new OTP.');
      setStep('phone');
      return;
    }

    setLoading(true);
    try {
      const { user, isNewUser } = await verifyOtpAndSignIn(phoneNumber, sanitizedOtp);
      const idToken = await user.getIdToken();
      // Prefer the number the user entered; custom-token users may not have phoneNumber set on the Firebase user.
      onSuccess(idToken, phoneNumber, isNewUser);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid OTP. Please try again.';
      console.error('Error verifying OTP:', error);
      onError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    if (!phoneNumber) return;

    setLoading(true);
    try {
      await sendOtp(phoneNumber);
      toast.success('OTP resent successfully!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to resend OTP';
      console.error('Error resending OTP:', error);
      toast.error('Failed to resend OTP: ' + message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {step === 'phone' ? (
        <form onSubmit={sendOTP} className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Sign in</h1>
            <p className="mt-1 text-sm text-neutral-500">We&apos;ll text you a code.</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 transition-colors focus-within:border-black focus-within:bg-white focus-within:ring-2 focus-within:ring-black/10">
            <PhoneInput
              international
              defaultCountry="LK"
              countryCallingCodeEditable={false}
              placeholder="77 123 4567"
              value={phoneNumber}
              onChange={setPhoneNumber}
              className="login-phone"
              numberInputProps={{ 'aria-label': 'Phone number' }}
              inputComponent={Input as React.ComponentType<React.InputHTMLAttributes<HTMLInputElement>>}
            />
          </div>
          <Button type="submit" className={primaryButtonClass} disabled={loading}>
            {loading ? 'Sending…' : 'Continue'}
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyOTP} className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Enter code</h1>
            <p className="mt-1 text-sm text-neutral-500">Sent to {phoneNumber}</p>
          </div>
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(value) => setOtp((value ?? "").replace(/\D/g, "").slice(0, 6))}
              containerClassName="justify-center"
              autoFocus
            >
              <InputOTPGroup className="gap-2">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="h-12 w-10 rounded-xl border-neutral-200 text-lg shadow-none sm:w-11"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button type="submit" className={primaryButtonClass} disabled={loading}>
            {loading ? 'Checking…' : 'Verify'}
          </Button>
          <div className="flex items-center justify-center gap-5 text-sm">
            <button
              type="button"
              onClick={resendOTP}
              disabled={loading}
              className="font-medium text-neutral-500 transition-colors hover:text-black disabled:opacity-50"
            >
              Resend
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setOtp('');
              }}
              disabled={loading}
              className="font-medium text-neutral-500 transition-colors hover:text-black disabled:opacity-50"
            >
              Change number
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const primaryButtonClass =
  "h-11 w-full rounded-full bg-black text-sm font-semibold text-white shadow-sm hover:bg-neutral-800";
