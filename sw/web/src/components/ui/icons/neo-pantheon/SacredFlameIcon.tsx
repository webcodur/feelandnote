import React from 'react';
import { IconProps, ICON_COLORS } from './types';

/**
 * SacredFlameIcon (Likes / Favorites)
 * 모티브: 신전의 성화 (Vesta's Flame)
 */
export const SacredFlameIcon = ({ 
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
    {/* 화로 (Brazier) */}
    <path d="M6 19H18L19 21H5L6 19Z" />
    <path d="M12 19V21" />
    {/* 불꽃 (Flame) */}
    <path d="M12 3C12 3 7 7 7 12C7 15.3137 9.23858 18 12 18C14.7614 18 17 15.3137 17 12C17 7 12 3 12 3Z" fill={color} />
    <path d="M12 7C12 7 10 9 10 12C10 14.2091 10.8954 16 12 16C13.1046 16 14 14.2091 14 12C14 9 12 7 12 7Z" fill={ICON_COLORS.WHITE} stroke="none" />
  </svg>
);
