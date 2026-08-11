'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, CircleDashed, Loader2 } from 'lucide-react'
import { setContentResearchConfirmedEmpty } from '@/actions/admin/content-research'

interface Props {
  celebId: string
  confirmedEmptyAt: string | null
  actualContentCount: number
}

export default function ConfirmedEmptyControls({
  celebId,
  confirmedEmptyAt,
  actualContentCount,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (actualContentCount > 0) {
    return (
      <span className="text-xs font-medium text-emerald-300">
        실측 {actualContentCount}개
      </span>
    )
  }

  const confirmed = Boolean(confirmedEmptyAt)

  function handleChange() {
    if (pending) return
    setError(null)
    startTransition(async () => {
      try {
        await setContentResearchConfirmedEmpty(celebId, !confirmed)
        router.refresh()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : '0건 확정 변경에 실패했습니다.')
      }
    })
  }

  const Icon = confirmed ? CircleDashed : CheckCircle2

  return (
    <div>
      <button
        type="button"
        onClick={handleChange}
        disabled={pending}
        aria-pressed={confirmed}
        title={confirmed ? '0건 확정을 해제해 다시 조사 대상으로 둡니다.' : '네 유형 조사 결과 0건임을 확정합니다.'}
        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium disabled:cursor-wait disabled:opacity-50 ${
          confirmed
            ? 'bg-slate-500/20 text-slate-200 hover:bg-slate-500/30 hover:text-white'
            : 'bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 hover:text-rose-100'
        }`}
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
        {confirmed ? '확정 해제' : '-1 확정'}
      </button>
      {error ? <p className="mt-1 text-[11px] text-red-300">{error}</p> : null}
    </div>
  )
}
