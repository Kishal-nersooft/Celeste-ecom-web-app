import React from 'react';
import Loader from './Loader';

interface LocationLoadingIndicatorProps {
  isLocationLoading: boolean;
  isLocationReady: boolean;
  className?: string;
}

const LocationLoadingIndicator: React.FC<LocationLoadingIndicatorProps> = ({
  isLocationLoading,
  isLocationReady,
  className = ""
}) => {
  if (!isLocationLoading && isLocationReady) {
    return null; // Don't show anything when location is ready
  }

  return <Loader />;
};

export default LocationLoadingIndicator;
