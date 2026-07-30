'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Eye, EyeOff, ShieldCheck, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import {
  deleteReportTarget,
  setReportTargetHidden,
  suspendReportedUser,
  unsuspendReportedUser,
} from '@/actions/admin/reports/moderation'

type ActionKey = 'hide' | 'restore' | 'delete' | 'suspend' | 'unsuspend'

interface TargetModerationActionsProps {
  reportId: string
  found: boolean
  hidden: boolean
  hideLabel: string | null
  restoreLabel: string | null
  deletable: boolean
  deleteBlockedReason: string | null
  targetUserId: string | null
  targetUserName: string
  targetUserSuspended: boolean
}

interface ActionButton {
  key: ActionKey
  variant: 'secondary' | 'danger'
  icon: ReactNode
  label: string
}

const DIALOG: Record<
  ActionKey,
  { title: string; description: string; confirmLabel: string; variant: 'danger' | 'warning' }
> = {
  hide: {
    title: '이 글을 감출까요',
    description: '다른 사용자에게 보이지 않게 됩니다. 나중에 다시 보이게 할 수 있습니다.',
    confirmLabel: '감추기',
    variant: 'warning',
  },
  restore: {
    title: '다시 보이게 할까요',
    description: '모든 사용자에게 다시 보입니다. 공개 범위는 전체 공개로 되돌아갑니다.',
    confirmLabel: '다시 보이기',
    variant: 'warning',
  },
  delete: {
    title: '정말 지울까요',
    description: '지운 글은 되돌릴 수 없습니다. 감추기로 충분한지 한 번 더 생각해주세요.',
    confirmLabel: '영구 삭제',
    variant: 'danger',
  },
  suspend: {
    title: '이 계정을 정지할까요',
    description: '정지하면 이 사람은 서비스를 이용할 수 없습니다. 사유는 기록으로 남습니다.',
    confirmLabel: '정지',
    variant: 'danger',
  },
  unsuspend: {
    title: '정지를 풀까요',
    description: '이 사람이 다시 서비스를 이용할 수 있게 됩니다.',
    confirmLabel: '정지 해제',
    variant: 'warning',
  },
}

const ICON = 'w-4 h-4'

export default function TargetModerationActions(props: TargetModerationActionsProps) {
  const router = useRouter()
  const [open, setOpen] = useState<ActionKey | null>(null)
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const { reportId, targetUserId } = props

  const run = async (key: ActionKey) => {
    if (key === 'suspend' && reason.trim().length === 0) {
      setError('정지 사유를 입력해주세요')
      return
    }

    setLoading(true)
    setError('')
    try {
      if (key === 'hide') await setReportTargetHidden(reportId, true)
      if (key === 'restore') await setReportTargetHidden(reportId, false)
      if (key === 'delete') await deleteReportTarget(reportId)
      if (key === 'suspend' && targetUserId)
        await suspendReportedUser(reportId, targetUserId, reason)
      if (key === 'unsuspend' && targetUserId) await unsuspendReportedUser(reportId, targetUserId)
      setOpen(null)
      setReason('')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '조치에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const candidates: (ActionButton | null)[] = [
    props.found && props.hideLabel && !props.hidden
      ? { key: 'hide', variant: 'secondary', icon: <EyeOff className={ICON} />, label: props.hideLabel }
      : null,
    props.found && props.restoreLabel && props.hidden
      ? { key: 'restore', variant: 'secondary', icon: <Eye className={ICON} />, label: props.restoreLabel }
      : null,
    props.found && props.deletable
      ? { key: 'delete', variant: 'danger', icon: <Trash2 className={ICON} />, label: '영구 삭제' }
      : null,
    targetUserId && !props.targetUserSuspended
      ? { key: 'suspend', variant: 'danger', icon: <Ban className={ICON} />, label: '작성자 계정 정지' }
      : null,
    targetUserId && props.targetUserSuspended
      ? { key: 'unsuspend', variant: 'secondary', icon: <ShieldCheck className={ICON} />, label: '정지 해제' }
      : null,
  ]

  const buttons = candidates.filter((button): button is ActionButton => button !== null)

  const notes = [
    !props.found ? '원문이 남아 있지 않아 감추기·삭제는 할 수 없습니다.' : null,
    props.found && !props.hideLabel
      ? '이 종류의 글은 감추는 기능이 없어 삭제로만 처리할 수 있습니다.'
      : null,
    props.found && !props.deletable ? props.deleteBlockedReason : null,
    !targetUserId
      ? '이 신고에는 대상 작성자가 기록되지 않아 계정 제재를 여기서 실행할 수 없습니다. 작성자 이름을 눌러 그 사람의 관리 화면에서 처리해주세요.'
      : null,
  ].filter((note): note is string => typeof note === 'string')

  const dialog = open ? DIALOG[open] : null
  const needsReason = open === 'suspend'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {buttons.map((button) => (
          <Button
            key={button.key}
            variant={button.variant}
            onClick={() => {
              setError('')
              setOpen(button.key)
            }}
            disabled={loading}
          >
            {button.icon}
            {button.label}
          </Button>
        ))}
      </div>

      {notes.map((note) => (
        <p key={note} className="text-sm text-text-dim">
          {note}
        </p>
      ))}

      {!open && error && <p className="text-sm text-danger-text">{error}</p>}

      {dialog && (
        <ConfirmDialog
          isOpen
          onClose={() => setOpen(null)}
          onConfirm={() => open && run(open)}
          title={dialog.title}
          description={
            needsReason ? `${props.targetUserName} · ${dialog.description}` : dialog.description
          }
          confirmLabel={dialog.confirmLabel}
          variant={dialog.variant}
          loading={loading}
        >
          <div className="w-full space-y-2">
            {needsReason && (
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="정지 사유를 입력하세요"
                rows={3}
                className="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-secondary resize-none focus:border-accent focus:outline-none"
              />
            )}
            {error && <p className="text-sm text-danger-text">{error}</p>}
          </div>
        </ConfirmDialog>
      )}
    </div>
  )
}
