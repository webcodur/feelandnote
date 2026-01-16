import React from 'react';
import { IconProps, ICON_COLORS } from './types';

/**
 * Laurel Icon (Award / Achievements)
 * 모티브: 월계수 관 (Laurel Wreath)
 */
export const LaurelIcon = ({ 
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
    {/* 왼쪽 줄기 및 잎 */}
    <path d="M10 21C7 21 4 18 4 12C4 8 6 4 6 4" />
    <path d="M4 12L2 10" />
    <path d="M4 15L2 14" />
    <path d="M4 9L2 7" />
    
    {/* 오른쪽 줄기 및 잎 */}
    <path d="M14 21C17 21 20 18 20 12C20 8 18 4 18 4" />
    <path d="M20 12L22 10" />
    <path d="M20 15L22 14" />
    <path d="M20 9L22 7" />

    {/* 중앙 별 (성취 상징) */}
    <path d="M12 7L13.5 10H16.5L14 12L15 15L12 13.5L9 15L10 12L7.5 10H10.5L12 7Z" fill={color} stroke="none" />
  </svg>
);
