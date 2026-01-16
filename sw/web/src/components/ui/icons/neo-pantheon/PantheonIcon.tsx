import React from 'react';
import { IconProps, ICON_COLORS } from './types';

/**
 * Pantheon Icon (Home)
 * 모티브: 고대 그리스/로마 신전 정면 (Parthenon style)
 */
export const PantheonIcon = ({ 
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
    {/* 페디먼트 (지붕 상단 삼각형) */}
    <path d="M2 9L12 2L22 9" />
    {/* 엔터블러처 (지붕 하단 수평선) */}
    <path d="M3 9H21" />
    {/* 기둥 (Pillars) */}
    <path d="M6 9V19" />
    <path d="M10 9V19" />
    <path d="M14 9V19" />
    <path d="M18 9V19" />
    {/* 스테레오 베이트 (바닥 계단) */}
    <path d="M2 19H22" />
    <path d="M1 22H23" />
  </svg>
);
