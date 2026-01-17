import { ReactNode } from 'react'
import { LucideIcon, Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title?: string
  description?: string
  action?: ReactNode
  className?: string
}

export default function EmptyState({
  icon: Icon = Inbox,
  title = '데이터가 없습니다',
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="p-4 rounded-full bg-bg-secondary mb-4">
        <Icon className="w-8 h-8 text-text-secondary" />
      </div>
      <p className="text-base font-medium text-text-primary mb-1">{title}</p>
      {description && (
        <p className="text-sm text-text-secondary mb-4">{description}</p>
      )}
      {action}
    </div>
  )
}
