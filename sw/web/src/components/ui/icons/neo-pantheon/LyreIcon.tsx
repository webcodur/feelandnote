import React from 'react';
import { IconProps, ICON_COLORS } from './types';

/**
 * Lyre Icon (Music)
 * 모티브: 리라 (고대 그리스 현악기)
 */
export const LyreIcon = ({ 
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
    {/* 하단 몸체 (U자형) */}
    <path d="M7 3C7 3 5 5 5 10C5 15 8 19 12 19C16 19 19 15 19 10C19 5 17 3 17 3" />
    {/* 상단 가로바 */}
    <path d="M5 6H19" />
    {/* 현 (Strings) */}
    <path d="M9 6V18.5" />
    <path d="M12 6V19" />
    <path d="M15 6V18.5" />
    {/* 장식용 노브 */}
    <circle cx="5" cy="6" r="1" fill={color} />
    <circle cx="19" cy="6" r="1" fill={color} />
  </svg>
);
