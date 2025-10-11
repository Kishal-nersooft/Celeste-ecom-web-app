'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useCategory } from '../contexts/CategoryContext';

interface SmartBackButtonProps {
  fallbackUrl?: string;
  className?: string;
  children?: React.ReactNode;
}

const SmartBackButton: React.FC<SmartBackButtonProps> = ({ 
  fallbackUrl = '/', 
  className = '',
  children 
}) => {
  const router = useRouter();
  const { lastVisitedCategory, lastVisitedIsDeals, restoreLastVisitedCategory } = useCategory();

  const handleBackClick = () => {
    // Check if we have a last visited category
    if (lastVisitedCategory !== null) {
      // Restore the last visited category
      restoreLastVisitedCategory();
      
      // Navigate back to homepage with category state
      const url = new URL(window.location.origin + '/');
      if (lastVisitedIsDeals) {
        url.searchParams.set('deals', 'true');
      } else if (lastVisitedCategory !== null) {
        url.searchParams.set('category', lastVisitedCategory.toString());
      }
      
      router.push(url.toString());
    } else {
      // Fallback to regular back navigation or fallback URL
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push(fallbackUrl);
      }
    }
  };

  return (
    <button
      onClick={handleBackClick}
      className={`flex items-center text-gray-600 hover:text-gray-900 transition-colors ${className}`}
      title="Go back to previous category"
    >
      <ArrowLeft className="h-5 w-5 mr-2" />
      {children || 'Back'}
    </button>
  );
};

export default SmartBackButton;
