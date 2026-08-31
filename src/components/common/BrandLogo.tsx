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
    xs: { icon: 'w-7 h-7', text: 'text-sm' },
    sm: { icon: 'w-9 h-9', text: 'text-base' },
    md: { icon: 'w-12 h-12', text: 'text-xl' },
    lg: { icon: 'w-16 h-16', text: 'text-2xl' },
    xl: { icon: 'w-24 h-24', text: 'text-4xl' },
  };

  const { icon, text } = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Precision Emblem matching the AxeTask brand vector */}
      <div className={`relative ${icon} shrink-0 flex items-center justify-center`}>
        <svg
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_2px_12px_rgba(37,99,235,0.3)]"
        >
          {/* Top flourish loop */}
          <path
            d="M78 18 C78 18 86 42 102 50 C96 50 93 36 100 42"
            stroke="#2563EB"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Calligraphic double loop 'A' ribbon with long dynamic diagonal tail */}
          <path
            d="M80 22 C76 36 58 38 58 55 C58 68 76 64 84 52 C74 66 48 66 44 82 C40 98 64 104 78 82 L108 126"
            stroke="#2563EB"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Integrated Document Checklist Badge */}
          <g transform="translate(86, 56)">
            {/* Document sheet */}
            <rect
              x="0"
              y="0"
              width="46"
              height="58"
              rx="8"
              fill="#090D16"
              stroke="#2563EB"
              strokeWidth="5"
            />

            {/* Circular Checkmark Badge at top right */}
            <circle
              cx="41"
              cy="5"
              r="12"
              fill="#2563EB"
            />
            <path
              d="M36 5 L40 9 L47 2"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Item 1: Checkbox + Line */}
            <rect x="7" y="14" width="6" height="6" rx="1.5" fill="none" stroke="#2563EB" strokeWidth="2.5" />
            <line x1="17" y1="17" x2="38" y2="17" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />

            {/* Item 2: Checkbox + Line */}
            <rect x="7" y="26" width="6" height="6" rx="1.5" fill="none" stroke="#2563EB" strokeWidth="2.5" />
            <line x1="17" y1="29" x2="38" y2="29" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />

            {/* Item 3: Checkbox + Line */}
            <rect x="7" y="38" width="6" height="6" rx="1.5" fill="none" stroke="#2563EB" strokeWidth="2.5" />
            <line x1="17" y1="41" x2="38" y2="41" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
          </g>
        </svg>
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

