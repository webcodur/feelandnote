import React from 'react';
import { IconProps, ICON_COLORS } from './types';

/**
 * LyreSilentIcon (Sound Off)
 * 모티브: 현이 끊어지거나 X 표시가 된 리라
 */
export const LyreSilentIcon = ({ 
  size = 24, 
  color = ICON_COLORS.DIM_GOLD, 
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
    <path d="M7 3C7 3 5 5 5 10C5 15 8 19 12 19C16 19 19 15 19 10C19 5 17 3 17 3" opacity="0.5" />
    {/* X 표시 (뮤트 상징) */}
    <path d="M19 16L23 20" />
    <path d="M23 16L19 20" />
    {/* 상단 가로바 */}
    <path d="M5 6H19" opacity="0.5" />
    {/* 끊어진 현 표현 */}
    <path d="M9 6V11" strokeDasharray="2 2" />
    <path d="M12 6V10" strokeDasharray="2 2" />
    <path d="M15 6V12" strokeDasharray="2 2" />
  </svg>
);
