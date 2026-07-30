'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CircleDashed, Loader2, Search } from 'lucide-react'
import type { CelebContentResearchStatus } from '@feelandnote/shared/constants/celeb-content-research'
import { updateContentResearchStatus } from '@/actions/admin/content-research'

interface Props {
  celebId: string
  currentStatus: CelebContentResearchStatus
  actualContentCount: number
}
const STATUS_BUTTONS: Array<{
  value: CelebContentResearchStatus
  label: string
  title: string
  icon: typeof CircleDashed
  className: string
  activeClassName: string
}> = [
  {
    value: 'open',
    label: '열기',
    title: '아직 없음으로 확정하지 않은 열린 상태',
    icon: CircleDashed,
    className: 'text-slate-300 hover:bg-slate-500/20 hover:text-white',
    activeClassName: 'bg-slate-500/25 text-white',
  },
  {
    value: 'researching',
    label: '조사중',
    title: '현재 콘텐츠 조사를 진행 중',
    icon: Search,
    className: 'text-blue-300 hover:bg-blue-500/20 hover:text-blue-100',
    activeClassName: 'bg-blue-500/25 text-blue-100',
  },
]

export default function ResearchStatusControls({
  celebId,
  currentStatus,
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

  function handleChange(nextStatus: CelebContentResearchStatus) {
    if (pending || nextStatus === currentStatus) return
    setError(null)
    startTransition(async () => {
      try {
        await updateContentResearchStatus(celebId, nextStatus)
        router.refresh()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : '상태 변경에 실패했습니다.')
      }
    })
  }

  return (
    <div className="min-w-[250px]">
      <div className="flex flex-wrap items-center gap-1">
        {STATUS_BUTTONS.map((button) => {
          const Icon = button.icon
          const active = currentStatus === button.value
          return (
            <button
              key={button.value}
              type="button"
              onClick={() => handleChange(button.value)}
              disabled={pending}
              aria-pressed={active}
              title={button.title}
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium disabled:cursor-wait disabled:opacity-50 ${
                active ? button.activeClassName : button.className
              }`}
            >
              {pending && active ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              {button.label}
            </button>
          )
        })}
      </div>
      <p className="mt-1 text-[10px] text-text-tertiary">
        -1 확정은 조사 장부의 네 유형 완료 검사를 거쳐야 합니다.
      </p>
      {error ? <p className="mt-1 text-[11px] text-red-300">{error}</p> : null}
    </div>
  )
}
