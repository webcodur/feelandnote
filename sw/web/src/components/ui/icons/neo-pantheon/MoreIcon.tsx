import React from 'react';
import { IconProps, ICON_COLORS } from './types';

/**
 * MoreIcon (Architecture Ornament)
 * 모티브: 장식용 아칸서스 잎 또는 건축물 문양
 */
export const MoreIcon = ({ 
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
    {/* 중앙 장식 포인트 */}
    <circle cx="12" cy="12" r="2" fill={color} />
    {/* 좌우 장식 라인 (건축적 문양) */}
    <path d="M4 12H8" />
    <path d="M16 12H20" />
    <path d="M12 4V8" />
    <path d="M12 16V20" />
    {/* 대각선 장식 */}
    <path d="M7 7L9 9" />
    <path d="M15 15L17 17" />
    <path d="M17 7L15 9" />
    <path d="M9 15L7 17" />
  </svg>
);
