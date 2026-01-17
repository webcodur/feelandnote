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
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="text-text-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
