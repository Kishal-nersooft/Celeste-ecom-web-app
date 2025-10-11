'use client';

import { useState, useEffect } from 'react';

export default function AuthStatus() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasPricing, setHasPricing] = useState(false);

  useEffect(() => {
    // Check if user is authenticated by testing API
    async function checkAuth() {
      try {
        const response = await fetch('/api/test-discounts');
        const data = await response.json();
        
        // If we get pricing data, user is authenticated
        const hasPricingData = data.analysis?.discountedFromAPI > 0 && 
          data.analysis?.discountedSample?.some((p: any) => p.pricing !== null);
        
        setHasPricing(hasPricingData);
        setIsAuthenticated(hasPricingData);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
        setHasPricing(false);
      }
    }

    checkAuth();
  }, []);

  if (isAuthenticated) {
    return (
      <div className="bg-green-100 border border-green-200 text-green-800 px-4 py-2 rounded-md text-sm">
        ✅ User authenticated - Discounts available
      </div>
    );
  }

  return (
    <div className="bg-yellow-100 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-md text-sm">
      ⚠️ Not authenticated - <a href="/sign-in" className="underline hover:text-yellow-900">Login to see discounts</a>
    </div>
  );
}
