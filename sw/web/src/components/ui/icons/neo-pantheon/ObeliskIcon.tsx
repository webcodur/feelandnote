import React from 'react';
import { IconProps, ICON_COLORS } from './types';

/**
 * ObeliskIcon (Stats / Leaderboard)
 * 모티브: 오벨리스크 (고대 이집트/로마 기념비)
 */
export const ObeliskIcon = ({ 
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
    {/* 메인 오벨리스크 (피라미드 꼭대기 포함) */}
    <path d="M12 2L15 5V19H9V5L12 2Z" />
    {/* 받침대 */}
    <path d="M7 19H17V22H7V19Z" />
    {/* 내부 상형문자/장식 라인 */}
    <path d="M11 8H13" />
    <path d="M11 12H13" />
    <path d="M11 16H13" />
  </svg>
);
