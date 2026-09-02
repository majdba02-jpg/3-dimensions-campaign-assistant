import React, { useState, useEffect } from 'react';
import logoDarkBg from '../../assets/logo_dark_bg.png';
import logoLightBg from '../../assets/logo_light_bg.png';
import logoTransparent from '../../assets/logo_transparent.png';

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
  const [imgSrc, setImgSrc] = useState<string>(primarySrc);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setImgSrc(isDark ? logoDarkBg : logoLightBg);
    setHasFailed(false);
  }, [isDark]);

  const handleError = () => {
    if (imgSrc === logoDarkBg || imgSrc === logoLightBg) {
      setImgSrc(logoTransparent);
    } else {
      setHasFailed(true);
    }
  };

  if (hasFailed) {
    return (
      <div className={`flex items-center gap-2.5 select-none ${className}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#172DC3] to-[#CB19C2] flex items-center justify-center text-white font-black text-sm shadow-md shadow-[#160857]/40 border border-white/20">
          3D
        </div>
        {!isCompact && (
          <div className="flex flex-col text-left">
            <span className="font-black text-sm tracking-tight text-white leading-none">
              3 Dimensions
            </span>
            <span className="text-[10px] text-slate-300 font-semibold tracking-wider uppercase mt-0.5">
              3D Printing Studio
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center select-none ${className}`}>
      <img
        src={imgSrc}
        alt="3 Dimensions"
        onError={handleError}
        className={`object-contain transition-all duration-200 ${
          isCompact ? 'max-h-9 w-auto' : 'max-h-12 w-auto'
        }`}
      />
    </div>
  );
};
