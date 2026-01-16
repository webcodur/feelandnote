import React from 'react';
import { IconProps, ICON_COLORS } from './types';

/**
 * GreekChevronIcon (Collapse / Expand)
 * 모티브: 건축물 페디먼트(Pediment) 라인이나 기둥 장식
 */
export const GreekChevronIcon = ({ 
  size = 24, 
  color = ICON_COLORS.GOLD, 
  strokeWidth = 2,
  direction = 'down',
  ...props 
}: IconProps & { direction?: 'up' | 'down' | 'left' | 'right' }) => {
  const rotations: Record<string, string> = {
    up: 'rotate(180deg)',
    down: 'rotate(0deg)',
    left: 'rotate(90deg)',
    right: 'rotate(-90deg)',
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: rotations[direction] || 'rotate(0deg)', transition: 'transform 0.2s ease' }}
      {...props}
    >
      <path d="M4 9L12 15L20 9" />
    </svg>
  );
};
