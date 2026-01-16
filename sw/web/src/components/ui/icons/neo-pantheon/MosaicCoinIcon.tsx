import React from 'react';
import { IconProps, ICON_COLORS } from './types';

/**
 * Mosaic Coin Icon (Game)
 * 모티브: 고대 로마 동전 (오레우스/데나리우스)
 */
export const MosaicCoinIcon = ({ 
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
    {/* 동전 테두리 */}
    <circle cx="12" cy="12" r="10" />
    {/* 내부 점선 테두리 (모자이크 느낌) */}
    <circle cx="12" cy="12" r="7" strokeDasharray="2 2" />
    {/* 중앙 황제/영웅 문양 (단순화된 실루엣) */}
    <path d="M12 8C10.5 8 9 9.5 9 11C9 12.5 10.5 14 12 14" />
    <path d="M12 14V16" />
    <path d="M10 16H14" />
    {/* 월계수 가지 (동전 내부 장식) */}
    <path d="M15 9L17 7" />
    <path d="M15 11L17 10" />
  </svg>
);
