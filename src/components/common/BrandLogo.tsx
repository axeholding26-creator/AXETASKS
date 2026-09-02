import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ 
  className = '', 
  size = 'md', 
  withText = false 
}) => {
  const sizeMap = {
    xs: { icon: 'w-10 h-10', text: 'text-base' },
    sm: { icon: 'w-14 h-14', text: 'text-lg' },
    md: { icon: 'w-16 h-16', text: 'text-2xl' },
    lg: { icon: 'w-24 h-24', text: 'text-3xl' },
    xl: { icon: 'w-32 h-32', text: 'text-5xl' },
  };

  const { icon, text } = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Brand Image Logo (axetask.png) */}
      <div className={`relative ${icon} shrink-0 flex items-center justify-center`}>
        <img
          src="/axetask.png"
          alt="AxeTask Logo"
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain filter drop-shadow-[0_2px_12px_rgba(37,99,235,0.35)] transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            // Fallback to SVG if image fails to load
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>

      {withText && (
        <div className="flex flex-col justify-center">
          <div className={`font-mono font-black tracking-tight flex items-center leading-none ${text}`}>
            <span className="text-white">Axe</span>
            <span className="text-[#2563EB]">Task</span>
          </div>
          <span className="text-[9px] font-mono uppercase tracking-widest text-[#60A5FA]/80 font-bold mt-0.5">
            Enterprise OS
          </span>
        </div>
      )}
    </div>
  );
};


