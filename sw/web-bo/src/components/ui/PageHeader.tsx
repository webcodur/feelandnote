import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  badge?: ReactNode
  actions?: ReactNode
}

export default function PageHeader({
  title,
  description,
  badge,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
