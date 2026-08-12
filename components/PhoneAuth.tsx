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
      toast.success('OTP sent successfully!');
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
      toast.success('Phone number verified successfully!');
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
    <div className="w-full max-w-md space-y-4">
      {step === 'phone' ? (
        <form onSubmit={sendOTP} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <PhoneInput
              international
              defaultCountry="LK"
              placeholder="Enter phone number"
              value={phoneNumber}
              onChange={setPhoneNumber}
              inputComponent={Input as React.ComponentType<React.InputHTMLAttributes<HTMLInputElement>>}
            />
            <p className="text-xs text-gray-500 mt-1">
              Select your country and enter your number (e.g., +94771234567)
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyOTP} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter OTP
            </label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => setOtp((value ?? "").replace(/\D/g, "").slice(0, 6))}
                containerClassName="justify-center"
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              OTP sent to {phoneNumber ?? ''}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resendOTP}
              disabled={loading}
            >
              Resend
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setStep('phone');
              setOtp('');
            }}
            className="w-full"
          >
            Change Phone Number
          </Button>
        </form>
      )}
    </div>
  );
}
