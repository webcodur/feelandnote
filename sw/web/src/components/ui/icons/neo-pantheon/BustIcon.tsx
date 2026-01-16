import React from 'react';
import { IconProps, ICON_COLORS } from './types';

/**
 * Bust Icon (User / Profile)
 * 모티브: 대리석 조각상 흉상 (Bust)
 */
export const BustIcon = ({ 
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
    {/* 머리 (타원형) */}
    <ellipse cx="12" cy="7" rx="4" ry="5" />
    {/* 어깨 및 가슴 (흉상 받침대 느낌) */}
    <path d="M6 21C6 17 9 14 12 14C15 14 18 17 18 21" />
    {/* 받침대 기둥 */}
    <path d="M10 21V22H14V21" />
  </svg>
);
