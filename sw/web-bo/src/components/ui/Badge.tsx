import { ReactNode } from 'react'

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'pink'
  | 'orange'
  | 'cyan'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  dot?: boolean
  icon?: ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-white/5 text-text-secondary',
  primary: 'bg-accent/10 text-accent',
  success: 'bg-green-500/10 text-green-400',
  warning: 'bg-yellow-500/10 text-yellow-400',
  danger: 'bg-red-500/10 text-red-400',
  info: 'bg-blue-500/10 text-blue-400',
  purple: 'bg-purple-500/10 text-purple-400',
  pink: 'bg-pink-500/10 text-pink-400',
  orange: 'bg-orange-500/10 text-orange-400',
  cyan: 'bg-cyan-500/10 text-cyan-400',
}

const sizeStyles = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-xs',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-text-secondary',
  primary: 'bg-accent',
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  danger: 'bg-red-400',
  info: 'bg-blue-400',
  purple: 'bg-purple-400',
  pink: 'bg-pink-400',
  orange: 'bg-orange-400',
  cyan: 'bg-cyan-400',
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot,
  icon,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-medium ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
      )}
      {icon}
      {children}
    </span>
  )
}
