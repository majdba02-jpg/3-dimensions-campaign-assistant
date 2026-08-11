import React from 'react';
import logoDarkBg from '../../assets/logo_dark_bg.png';
import logoLightBg from '../../assets/logo_light_bg.png';

interface LogoProps {
  className?: string;
  showText?: boolean;
  collapsed?: boolean;
  isDark?: boolean;
  compact?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  collapsed = false,
  isDark = true,
  compact = false,
}) => {
  const isCompact = collapsed || compact;
  const logoSrc = isDark ? logoDarkBg : logoLightBg;

  return (
    <div className={`flex items-center justify-center select-none w-full ${className}`}>
      <img
        src={logoSrc}
        alt="Infinite Dimensions Logo"
        className={`object-contain transition-all duration-200 ${
          isCompact ? 'max-h-10 w-auto' : 'max-h-16 w-full'
        }`}
        style={{ objectFit: 'contain' }}
      />
    </div>
  );
};
