import React from 'react';
import { IconProps, ICON_COLORS } from './types';

/**
 * CogsIcon (Settings)
 * 모티브: 안티키티라 매커니즘 (고대 그리스 기어)
 */
export const CogsIcon = ({ 
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
    {/* 중앙 큰 기어 */}
    <circle cx="12" cy="12" r="4" />
    {/* 기어의 이 (Teeth) */}
    <path d="M12 2V5" />
    <path d="M12 19V22" />
    <path d="M2 12H5" />
    <path d="M19 12H22" />
    <path d="M5 5L7 7" />
    <path d="M17 17L19 19" />
    <path d="M19 5L17 7" />
    <path d="M7 17L5 19" />
    {/* 내부 장식 (기하학적 문양) */}
    <path d="M10 12L12 10L14 12L12 14L10 12Z" />
  </svg>
);
