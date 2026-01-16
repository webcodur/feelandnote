import React from 'react';
import { IconProps, ICON_COLORS } from './types';

/**
 * TempleBellIcon (Notifications)
 * 모티브: 고대 신전의 종
 */
export const TempleBellIcon = ({ 
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
    {/* 종 본체 */}
    <path d="M18 8C18 4.68629 15.3137 2 12 2C8.68629 2 6 4.68629 6 8V11C6 11 4 13 4 15V17H20V15C20 13 18 11 18 11V8Z" />
    {/* 종 하단 유선형 라인 (장식) */}
    <path d="M4 17H20" />
    {/* 종추 (Clapper) */}
    <path d="M10 20C10 21.1046 10.8954 22 12 22C13.1046 22 14 21.1046 14 20" />
  </svg>
);
