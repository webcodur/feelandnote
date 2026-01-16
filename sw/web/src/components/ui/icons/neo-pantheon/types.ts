import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  strokeWidth?: number;
}

export const ICON_COLORS = {
  GOLD: '#d4af37',
  DIM_GOLD: '#8a732a',
  WHITE: '#e0e0e0',
} as const;
