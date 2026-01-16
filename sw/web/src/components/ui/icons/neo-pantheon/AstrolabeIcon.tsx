import React from 'react';
import { IconProps, ICON_COLORS } from './types';

/**
 * Astrolabe Icon (Explore / Compass)
 * 모티브: 아스트랄라베 (고대 천체 관측 기구)
 */
export const AstrolabeIcon = ({ 
  size = 24, 
  color = ICON_COLORS.GOLD, 
  strokeWidth = 2,
  ...props 
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* 외부 원 */}
    <circle cx="12" cy="12" r="10" />
    {/* 내부 격자/라인 (천체 경로) */}
    <path d="M12 2V22" />
    <path d="M2 12H22" />
    <circle cx="12" cy="12" r="4" />
    {/* 아스트랄라베 바늘 (Alidada) */}
    <path d="M19 5L5 19" strokeWidth={strokeWidth + 1} />
    {/* 장식용 포인트 */}
    <circle cx="12" cy="12" r="1" fill={color} stroke="none" />
  </svg>
);
