'use client';

import React, { useState, useEffect } from 'react';
import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier, 
  ConfirmationResult,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface PhoneAuthProps {
  onSuccess: (idToken: string, phoneNumber: string) => void;
  onError: (error: string) => void;
  isSignUp?: boolean;
}

export default function PhoneAuth({ onSuccess, onError, isSignUp = false }: PhoneAuthProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Helper function to reinitialize reCAPTCHA verifier
  const reinitializeRecaptcha = () => {
    if (typeof window !== 'undefined') {
      try {
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
        }
        
        const container = document.getElementById('recaptcha-container');
        if (container) {
          window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
            callback: () => console.log('reCAPTCHA solved'),
            'expired-callback': () => {
              console.log('reCAPTCHA expired');
              reinitializeRecaptcha();
            }
          });
          return true;
        }
      } catch (error) {
        console.error('Error reinitializing reCAPTCHA:', error);
      }
    }
    return false;
  };

  useEffect(() => {
    // Initialize reCAPTCHA
    const initializeRecaptcha = () => {
      if (typeof window !== 'undefined') {
        // Clean up existing verifier if it exists
        if (window.recaptchaVerifier) {
          try {
            window.recaptchaVerifier.clear();
          } catch (error) {
            console.log('Error clearing existing reCAPTCHA verifier:', error);
          }
        }

        // Check if the container exists
        const container = document.getElementById('recaptcha-container');
        if (!container) {
          console.error('reCAPTCHA container not found');
          return;
        }

        try {
          window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
            callback: () => {
              console.log('reCAPTCHA solved');
            },
            'expired-callback': () => {
              console.log('reCAPTCHA expired');
              // Reset the verifier when expired
              initializeRecaptcha();
            }
          });
        } catch (error) {
          console.error('Error initializing reCAPTCHA:', error);
        }
      }
    };

    // Initialize with a small delay to ensure DOM is ready
    const timer = setTimeout(initializeRecaptcha, 100);
    
    return () => {
      clearTimeout(timer);
      // Cleanup on unmount
      if (typeof window !== 'undefined' && window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (error) {
          console.log('Error clearing reCAPTCHA on unmount:', error);
        }
      }
    };
  }, []);

  const sendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    setLoading(true);
    try {
      // Format phone number (add +94 for Sri Lanka if not present)
      const formattedPhone = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+94${phoneNumber.replace(/^0/, '')}`;

      // Validate reCAPTCHA verifier exists
      if (!window.recaptchaVerifier) {
        throw new Error('reCAPTCHA verifier not initialized. Please refresh the page and try again.');
      }

      // Check if the container still exists
      const container = document.getElementById('recaptcha-container');
      if (!container) {
        throw new Error('reCAPTCHA container not found. Please refresh the page and try again.');
      }

      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      
      setConfirmationResult(confirmation);
      setStep('otp');
      toast.success('OTP sent successfully!');
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      
      // If it's a reCAPTCHA error, try to reinitialize
      if (error.message.includes('reCAPTCHA') || error.message.includes('verifier')) {
        reinitializeRecaptcha();
      }
      
      onError(error.message);
      toast.error('Failed to send OTP: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !confirmationResult) {
      toast.error('Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      const user = result.user;
      
      // Get the ID token
      const idToken = await user.getIdToken();
      
      // Get phone number
      const phoneNumber = user.phoneNumber || '';
      
      onSuccess(idToken, phoneNumber);
      toast.success('Phone number verified successfully!');
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      onError(error.message);
      toast.error('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    if (!phoneNumber) return;
    
    setLoading(true);
    try {
      const formattedPhone = phoneNumber.startsWith('+') 
        ? phoneNumber 
        : `+94${phoneNumber.replace(/^0/, '')}`;

      // Validate reCAPTCHA verifier exists
      if (!window.recaptchaVerifier) {
        throw new Error('reCAPTCHA verifier not initialized. Please refresh the page and try again.');
      }

      // Check if the container still exists
      const container = document.getElementById('recaptcha-container');
      if (!container) {
        throw new Error('reCAPTCHA container not found. Please refresh the page and try again.');
      }

      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      
      setConfirmationResult(confirmation);
      toast.success('OTP resent successfully!');
    } catch (error: any) {
      console.error('Error resending OTP:', error);
      
      // If it's a reCAPTCHA error, try to reinitialize
      if (error.message.includes('reCAPTCHA') || error.message.includes('verifier')) {
        reinitializeRecaptcha();
      }
      
      toast.error('Failed to resend OTP: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      {/* reCAPTCHA container */}
      <div id="recaptcha-container"></div>

      {step === 'phone' ? (
        <form onSubmit={sendOTP} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <Input
              type="tel"
              placeholder="Enter your phone number (e.g., 0771234567)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter your phone number with country code (e.g., +94771234567)
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
            <Input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              OTP sent to {phoneNumber}
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
            onClick={() => setStep('phone')}
            className="w-full"
          >
            Change Phone Number
          </Button>
        </form>
      )}
    </div>
  );
}

// Extend Window interface for reCAPTCHA
declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
  }
}
