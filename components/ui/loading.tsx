import React from 'react';

interface LoadingProps {
  text?: string;
  size?: number;
  className?: string;
}

export function Loading({ text, size = 56, className }: LoadingProps) {
  return (
    <div className={`flex flex-col items-center gap-4 ${className ?? ''}`}>
      <svg
        className="animate-spin-slow"
        style={{ width: size, height: size }}
        viewBox="0 0 40 40"
        fill="none"
      >
        {/* 外圈淡色圆环 */}
        <circle
          cx="20"
          cy="20"
          r="17"
          stroke="#eab308"
          strokeWidth="2.5"
          opacity="0.25"
        />
        {/* 雷达扫描线 */}
        <g>
          <line
            x1="20"
            y1="20"
            x2="20"
            y2="5"
            stroke="#eab308"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.85"
            filter="url(#glow)"
          />
        </g>
        {/* 雷达点（可闪烁） */}
        <circle
          cx="32"
          cy="20"
          r="2.2"
          fill="#eab308"
          className="animate-pulse"
          opacity="0.7"
        />
        <defs>
          <filter id="glow" x="-10" y="-10" width="60" height="60">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <style jsx global>{`
        @keyframes spin-slow {
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 1.6s linear infinite;
        }
      `}</style>
    </div>
  );
}
