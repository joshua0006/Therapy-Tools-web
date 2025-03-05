import React from 'react';

interface LogoProps {
  variant?: 'round' | 'long';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({
  variant = 'round',
  size = 'medium',
  className = '',
}) => {
  const sizeClasses = {
    small: variant === 'round' ? 'h-8 w-8' : 'h-8',
    medium: variant === 'round' ? 'h-12 w-12' : 'h-12',
    large: variant === 'round' ? 'h-16 w-16' : 'h-16',
  };

  const logoSrc = variant === 'round' 
    ? '/assets/logo-round.png' 
    : '/assets/logo-long.png';

  const altText = 'Adventures in Speech Logo';

  return (
    <img 
      src={logoSrc} 
      alt={altText} 
      className={`${sizeClasses[size]} ${className}`} 
    />
  );
};

export default Logo; 