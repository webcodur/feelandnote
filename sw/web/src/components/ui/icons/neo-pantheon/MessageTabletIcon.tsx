import React from 'react';
import { IconProps, ICON_COLORS } from './types';

/**
 * MessageTabletIcon (Guestbook)
 * 모티브: 점토판/석판에 새겨진 글자 (Clay Tablet)
 */
export const MessageTabletIcon = ({ 
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
    {/* 점토판 바깥 윤곽 (약간 불규칙한 느낌의 직사각형) */}
    <path d="M4 3H18L20 5V19L18 21H4L6 19V5L4 3Z" />
    {/* 새겨진 글자 라인들 (쐐기 문자 느낌) */}
    <path d="M9 7H15" />
    <path d="M9 11H13" />
    <path d="M9 15H11" />
    {/* 점토판 질감 장식 */}
    <circle cx="17" cy="17" r="0.5" fill={color} stroke="none" />
    <circle cx="16" cy="18" r="0.5" fill={color} stroke="none" />
  </svg>
);
