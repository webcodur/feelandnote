'use client'

import { ReactNode } from 'react'
import { AlertTriangle, Trash2, Info, CheckCircle, LucideIcon } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

type DialogVariant = 'danger' | 'warning' | 'info' | 'success'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: DialogVariant
  loading?: boolean
}

const variantConfig: Record<
  DialogVariant,
  { icon: LucideIcon; iconColor: string; iconBg: string }
> = {
  danger: {
    icon: Trash2,
    iconColor: 'text-red-400',
    iconBg: 'bg-red-500/10',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-400',
    iconBg: 'bg-yellow-500/10',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-400',
    iconBg: 'bg-green-500/10',
  },
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  children,
  confirmLabel = '확인',
  cancelLabel = '취소',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <div className="flex flex-col items-center text-center">
        <div className={`p-4 rounded-full ${config.iconBg} mb-4`}>
          <Icon className={`w-8 h-8 ${config.iconColor}`} />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-text-secondary mb-4">{description}</p>
        )}
        {children}
        <div className="flex items-center gap-3 w-full mt-6">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                처리 중...
              </div>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
