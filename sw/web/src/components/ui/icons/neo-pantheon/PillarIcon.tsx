import React from 'react';
import { IconProps, ICON_COLORS } from './types';

/**
 * Pillar Icon (Library / Archive / Records)
 * 모티브: 도리스/이오니아식 기둥
 */
export const PillarIcon = ({ 
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
    {/* 주두 (Capital) */}
    <path d="M5 3H19C19 3 19 5 17 5H7C5 5 5 3 5 3Z" fill={color} />
    <path d="M4 6H20" />
    {/* 주신 (Shaft) - 세로 홈(Fluting) 표현 */}
    <path d="M7 6V18" />
    <path d="M12 6V18" />
    <path d="M17 6V18" />
    {/* 주초 (Base) */}
    <path d="M4 18H20" />
    <path d="M3 21H21" />
  </svg>
);
