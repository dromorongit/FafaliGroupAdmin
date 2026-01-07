import React from 'react';
import { FaSpinner } from 'react-icons/fa';

const LoadingSpinner = ({ size = 'medium', color = 'primary' }) => {
  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-12 w-12',
    large: 'h-16 w-16'
  };

  const colorClasses = {
    primary: 'text-primary-500',
    secondary: 'text-secondary-500',
    white: 'text-white',
    black: 'text-black'
  };

  return (
    <div className="flex items-center justify-center">
      <FaSpinner 
        className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
        aria-label="Loading"
      />
    </div>
  );
};

export default LoadingSpinner;