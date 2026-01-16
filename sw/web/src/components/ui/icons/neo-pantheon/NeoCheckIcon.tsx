import React from 'react';
import { IconProps, ICON_COLORS } from './types';

/**
 * NeoCheckIcon (Success / Selection)
 * 모티브: 금화 위 등에 새겨진 승리의 표시 (Checkmark)
 */
export const NeoCheckIcon = ({ 
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
    {/* 체크 표시 (정원이나 방패 형태 내부) */}
    <circle cx="12" cy="12" r="10" opacity="0.2" fill={color} stroke="none" />
    <path d="M7 12L10 15L17 8" />
  </svg>
);
