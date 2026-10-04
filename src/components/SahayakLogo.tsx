import React, { useState } from 'react';

interface SahayakLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  textColor?: string;
}

export const SahayakLogo: React.FC<SahayakLogoProps> = ({
  className = 'w-10 h-10',
  size,
  showText = false,
  textColor = 'text-slate-950',
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div className={`inline-flex items-center gap-2.5 ${showText ? '' : 'shrink-0'}`}>
      {!imageError ? (
        <img
          src="/logosahayak.png"
          alt="SAHAYAK"
          className={`${className} object-contain`}
          style={size ? { width: size, height: size } : undefined}
          onError={() => setImageError(true)}
        />
      ) : (
        <svg
          viewBox="0 0 500 500"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={size ? { width: size, height: size } : undefined}
        >
          <g>
            {/* Magnifier Handle */}
            <path
              d="M320 280 L400 360"
              stroke="currentColor"
              strokeWidth="38"
              strokeLinecap="round"
              className="text-red-700"
            />
            <circle
              cx="400"
              cy="360"
              r="16"
              className="fill-red-700"
            />

            {/* Target & Outer Ring */}
            <circle
              cx="220"
              cy="185"
              r="135"
              stroke="currentColor"
              strokeWidth="28"
              fill="none"
              className="text-red-700"
            />

            {/* Upper Left Arc Track */}
            <path
              d="M135 185 A 85 85 0 0 1 220 100"
              stroke="currentColor"
              strokeWidth="16"
              strokeLinecap="round"
              fill="none"
              className="text-red-700"
            />

            {/* Location Pin */}
            <path
              d="M220 110 C185 110 158 138 158 174 C158 218 220 270 220 270 C220 270 282 218 282 174 C282 138 255 110 220 110 Z"
              className="fill-red-700"
            />
            {/* Inner Pin cutout */}
            <circle cx="220" cy="168" r="26" fill="white" />

            {/* Dynamic Swoosh curve */}
            <path
              d="M105 235 C100 190 145 130 185 105 C225 80 285 85 330 110"
              stroke="currentColor"
              strokeWidth="18"
              strokeLinecap="round"
              fill="none"
              className="text-red-700"
            />

            {/* Star at end of trajectory */}
            <polygon
              points="335,85 342,100 358,102 346,114 350,130 335,121 320,130 324,114 312,102 328,100"
              className="fill-red-700"
            />
          </g>
        </svg>
      )}

      {showText && (
        <div className="flex flex-col">
          <span className={`text-xl font-black tracking-wider uppercase font-sans ${textColor}`}>
            SAHAYAK
          </span>
        </div>
      )}
    </div>
  );
};
