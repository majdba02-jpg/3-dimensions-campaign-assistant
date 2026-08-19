import React, { useState, useEffect } from 'react';
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
  const primarySrc = isDark ? logoDarkBg : logoLightBg;
  const fallbackSrc = isDark ? '/logo_dark_bg.png' : '/logo_light_bg.png';
  const [imgSrc, setImgSrc] = useState<string>(primarySrc);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setImgSrc(isDark ? logoDarkBg : logoLightBg);
    setErrored(false);
  }, [isDark]);

  const handleError = () => {
    if (!errored) {
      setErrored(true);
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <div className={`flex items-center justify-center select-none ${className}`}>
      <img
        src={imgSrc}
        alt="Infinite Dimensions"
        onError={handleError}
        className={`object-contain transition-all duration-200 ${
          isCompact ? 'max-h-9 w-auto' : 'max-h-12 w-auto'
        }`}
      />
    </div>
  );
};
