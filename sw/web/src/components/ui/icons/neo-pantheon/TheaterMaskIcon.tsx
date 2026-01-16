import React from 'react';
import { IconProps, ICON_COLORS } from './types';

/**
 * Theater Mask Icon (Film / Video)
 * 모티브: 그리스 비극/희극 가면
 */
export const TheaterMaskIcon = ({ 
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
    {/* 얼굴 윤곽 */}
    <path d="M12 21C16.4183 21 20 17.4183 20 13V7C20 4.23858 17.7614 2 15 2H9C6.23858 2 4 4.23858 4 7V13C4 17.4183 7.58172 21 12 21Z" />
    {/* 눈 (아치형) */}
    <path d="M8 9C8 9 9 7 10 7C11 7 12 9 12 9" />
    <path d="M12 9C12 9 13 7 14 7C15 7 16 9 16 9" />
    {/* 입 (비극의 벌어진 입) */}
    <path d="M9 15C9 15 10 17 12 17C14 17 15 15 15 15H9Z" fill={color} />
  </svg>
);
