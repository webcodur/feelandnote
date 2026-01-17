import Image from 'next/image'
import { User, LucideIcon } from 'lucide-react'

interface AvatarProps {
  src?: string | null
  alt?: string
  name?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  icon?: LucideIcon
  className?: string
}

const sizeStyles = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
}

const iconSizes = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function Avatar({
  src,
  alt = '',
  name,
  size = 'md',
  icon: Icon = User,
  className = '',
}: AvatarProps) {
  const hasImage = !!src
  const hasName = !!name

  return (
    <div
      className={`relative rounded-full bg-accent/20 flex items-center justify-center overflow-hidden flex-shrink-0 ${sizeStyles[size]} ${className}`}
    >
      {hasImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          className="object-cover"
        />
      ) : hasName ? (
        <span className="font-medium text-accent">{getInitials(name)}</span>
      ) : (
        <Icon className={`text-accent ${iconSizes[size]}`} />
      )}
    </div>
  )
}
