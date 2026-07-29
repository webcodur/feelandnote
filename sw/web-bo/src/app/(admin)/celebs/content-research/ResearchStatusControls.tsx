'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CircleDashed, Clock3, Loader2, Pause, Search } from 'lucide-react'
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
    value: 'queued',
    label: '큐',
    title: '조사할 가치가 있어 작업 큐에 올림',
    icon: Clock3,
    className: 'text-amber-300 hover:bg-amber-500/20 hover:text-amber-100',
    activeClassName: 'bg-amber-500/25 text-amber-100',
  },
  {
    value: 'researching',
    label: '조사중',
    title: '현재 콘텐츠 조사를 진행 중',
    icon: Search,
    className: 'text-blue-300 hover:bg-blue-500/20 hover:text-blue-100',
    activeClassName: 'bg-blue-500/25 text-blue-100',
  },
  {
    value: 'deferred',
    label: '보류',
    title: '가능성을 닫지 않고 나중으로 보류',
    icon: Pause,
    className: 'text-violet-300 hover:bg-violet-500/20 hover:text-violet-100',
    activeClassName: 'bg-violet-500/25 text-violet-100',
  },
  {
    value: 'confirmed_empty',
    label: '없음 확정',
    title: '정식 조사를 마쳤고 콘텐츠가 없음을 확인함',
    icon: Check,
    className: 'text-rose-300 hover:bg-rose-500/20 hover:text-rose-100',
    activeClassName: 'bg-rose-500/25 text-rose-100',
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
    if (
      nextStatus === 'confirmed_empty' &&
      !window.confirm(
        '정식 조사를 끝냈고 콘텐츠가 하나도 없음을 확인했습니까?\n단순 선별이나 검색 1회만으로는 확정하지 않습니다.'
      )
    ) {
      return
    }

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
      {error ? <p className="mt-1 text-[11px] text-red-300">{error}</p> : null}
    </div>
  )
}
