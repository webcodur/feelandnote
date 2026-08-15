'use client'

import type { FactionScript } from '@/lib/faction-types'

type TimingKey = 'introSec' | 'outroHoldSec' | 'groupSec' | 'clusterSec' | 'captionIdHoldSec' | 'endHoldSec' | 'endFadeSec'

type TimingField = {
  key: TimingKey
  label: string
  placeholder: string
  min: number
  max?: number
  step: number
  title: string
}

const TIMING_FIELDS: TimingField[] = [
  { key: 'introSec', label: '시작 화면', placeholder: '2.5', min: 1, max: 12, step: 0.5, title: '영상 도입 화면이 유지되는 시간' },
  { key: 'outroHoldSec', label: '종료 화면', placeholder: '2.5', min: 0, step: 0.5, title: '영상 끝 화면이 유지되는 시간' },
  { key: 'groupSec', label: '로고 타이틀', placeholder: '4', min: 0.5, max: 8, step: 0.1, title: '세력 로고 타이틀 카드 재생 시간' },
  { key: 'clusterSec', label: '그룹명', placeholder: '자동', min: 0.5, max: 8, step: 0.1, title: '그룹샷과 그룹명이 표시되는 시간' },
  { key: 'captionIdHoldSec', label: '이름', placeholder: '1', min: 0, max: 6, step: 0.1, title: '자막형에서 이름만 먼저 보이는 시간' },
  { key: 'endHoldSec', label: '대사 후 대기', placeholder: '4', min: 0, step: 0.5, title: '마지막 대사 뒤 화면을 유지하는 시간' },
  { key: 'endFadeSec', label: '암전', placeholder: '3', min: 0, step: 0.5, title: '영상 끝에서 검정으로 어두워지는 시간' },
]

type Props = {
  script: FactionScript
  onChange: (patch: Partial<FactionScript>) => void
}

export function FactionTimingSettings({ script, onChange }: Props) {
  const configuredCount = TIMING_FIELDS.filter(field => script[field.key] != null).length

  return (
    <details className="group rounded-xl border border-border bg-bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-bg-hover">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-accent">세부 설정</p>
          <h2 className="mt-1 text-base font-bold text-text-primary">화면별 재생시간</h2>
        </div>
        <span className="rounded-md bg-bg-secondary px-2 py-1 text-xs font-semibold text-text-secondary">
          {configuredCount > 0 ? `${configuredCount}개 직접 설정` : '기본값 사용'}
        </span>
        <span aria-hidden="true" className="text-text-tertiary group-open:rotate-180">⌄</span>
      </summary>

      <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2 xl:grid-cols-4">
        {TIMING_FIELDS.map(field => (
          <label key={field.key} className="space-y-1.5" title={field.title}>
            <span className="text-sm font-semibold text-text-secondary">{field.label}</span>
            <span className="flex items-center gap-2">
              <input
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                placeholder={field.placeholder}
                value={script[field.key] ?? ''}
                onChange={event => {
                  const next = event.target.value === '' ? undefined : Number(event.target.value)
                  onChange({ [field.key]: next != null && Number.isFinite(next) ? next : undefined })
                }}
                className="min-w-0 flex-1 rounded-lg border border-border bg-bg-main px-3 py-2 font-mono text-sm text-text-primary focus:border-accent focus:outline-none"
              />
              <span className="text-sm text-text-tertiary">초</span>
            </span>
          </label>
        ))}
        <p className="self-end text-sm leading-relaxed text-text-secondary sm:col-span-2 xl:col-span-1">
          비운 값은 렌더러의 기본 시간을 사용합니다.
        </p>
      </div>
    </details>
  )
}
