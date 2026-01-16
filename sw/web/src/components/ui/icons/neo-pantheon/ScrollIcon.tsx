import React from 'react';
import { IconProps, ICON_COLORS } from './types';

/**
 * Scroll Icon (Book)
 * 모티브: 고대 파피루스/양피지 두루마리
 */
export const ScrollIcon = ({ 
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
    {/* 중앙 본체 */}
    <rect x="4" y="4" width="16" height="16" rx="1" />
    {/* 왼쪽 스크롤 장식 */}
    <path d="M4 4C2 4 2 8 4 8" />
    <path d="M4 16C2 16 2 20 4 20" />
    {/* 오른쪽 스크롤 장식 */}
    <path d="M20 4C22 4 22 8 20 8" />
    <path d="M20 16C22 16 22 20 20 20" />
    {/* 내부 텍스트 라인 (문자 상징) */}
    <path d="M8 8H16" />
    <path d="M8 12H16" />
    <path d="M8 16H12" />
  </svg>
);
