import React from 'react';
import { IconProps, ICON_COLORS } from './types';

/**
 * RomanGateIcon (Logout / Exit)
 * 모티브: 로마식 아치형 성문
 */
export const RomanGateIcon = ({ 
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
    {/* 아치 프레임 */}
    <path d="M4 21V10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10V21" />
    {/* 문 (열린 상태) */}
    <path d="M12 21V11" />
    <path d="M4 21H20" />
    {/* 나가는 화살표 */}
    <path d="M15 16L18 13L15 10" />
    <path d="M10 13H18" />
  </svg>
);
