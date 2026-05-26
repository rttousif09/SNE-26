import React from 'react';

interface SNLogoProps {
  className?: string;
  size?: number;
}

export const SNLogo: React.FC<SNLogoProps> = ({ className = '', size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      {/* 1. THREE HIGH-RISE BUILDINGS (3D Isomorphic Flat Vector Style) */}
      {/* Left Tower */}
      <polygon
        points="22,46 38,34 38,88 22,94"
        fill="#0284c7"
      />
      <polygon
        points="38,34 45,38 45,84 38,88"
        fill="#0369a1"
        opacity="0.85"
      />

      {/* Middle Tower (Tallest, Back-Center) */}
      <polygon
        points="38,18 60,5 60,86 38,86"
        fill="#0ea5e9"
      />
      <polygon
        points="60,5 68,10 68,80 60,86"
        fill="#0284c7"
        opacity="0.9"
      />

      {/* Right Tower */}
      <polygon
        points="68,36 82,42 82,92 68,86"
        fill="#0369a1"
      />
      <polygon
        points="82,42 88,45 88,88 82,92"
        fill="#1e3a8a"
        opacity="0.8"
      />

      {/* 2. DYNAMIC ORANGE SWOOSH / CURVE (Bottom-left to Top-right sweep) */}
      <path
        d="M 12 110 C 25 82, 60 72, 110 40 C 95 80, 50 98, 12 110 Z"
        fill="#f97316"
      />

      {/* 3. CENTER WHITE GLOW EMERALD CIRCULAR SHIELD */}
      <circle
        cx="54"
        cy="56"
        r="24"
        stroke="#ffffff"
        strokeWidth="3.5"
        fill="#002f6c"
        fillOpacity="0.45"
      />

      {/* 4. EMBLEM "SN" TEXT - Slanted italic, bold, centered */}
      <text
        x="54"
        y="62"
        textAnchor="middle"
        fill="#ffffff"
        fontFamily="sans-serif"
        fontSize="17"
        fontWeight="900"
        fontStyle="italic"
        letterSpacing="-0.5"
      >
        SN
      </text>
    </svg>
  );
};
