'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CircleCheck, Loader2 } from 'lucide-react'
import { checkCelebIdentity, type CelebIdentityCheck } from '@/actions/admin/celebs'

/** 다른 이름 입력칸(한 줄에 하나)을 배열로 푼다 */
export function parseAliasLines(value: string): string[] {
  return value.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)
}

export interface CelebIdentityValues {
  nickname: string
  nickname_en: string
  aliases: string
  birth_date: string
  death_date: string
  title: string
  title_en: string
}

interface Props {
  mode: 'create' | 'edit'
  celebId?: string
  values: CelebIdentityValues
  /** 수정 화면에서는 이 값과 달라졌을 때만 검사한다 — 동명이인 목록이 늘 떠 있지 않게 */
  initialValues: CelebIdentityValues
}

const REASON_LABEL: Record<string, string> = {
  qid: '위키데이터 번호',
  dates: '생몰일',
  birth: '생년월일',
  name: '이름',
}
const DEBOUNCE_MS = 600

/**
 * 등록·이름 수정 중에 같은 사람일 수 있는 기존 인물과 이름·수식어 규칙 위반을 미리 보여 준다.
 * 저장할 때 서버가 같은 규칙(@feelandnote/shared/lib/celeb-identity)으로 다시 막는다.
 */
export default function CelebIdentityPanel({ mode, celebId, values, initialValues }: Props) {
  const [result, setResult] = useState<CelebIdentityCheck | null>(null)
  const [checking, setChecking] = useState(false)
  const seq = useRef(0)
  const changed = mode === 'create' || (Object.keys(values) as (keyof CelebIdentityValues)[]).some((key) => values[key] !== initialValues[key])
  const key = JSON.stringify(values)

  useEffect(() => {
    const current = ++seq.current
    if (!changed || !values.nickname.trim()) {
      setResult(null)
      setChecking(false)
      return
    }
    setChecking(true)
    const timer = setTimeout(async () => {
      try {
        const next = await checkCelebIdentity({
          id: celebId,
          nickname: values.nickname,
          nickname_en: values.nickname_en,
          aliases: parseAliasLines(values.aliases),
          birth_date: values.birth_date,
          death_date: values.death_date,
          title: values.title,
          title_en: values.title_en,
        })
        if (current === seq.current) setResult(next)
      } catch {
        if (current === seq.current) setResult(null)
      } finally {
        if (current === seq.current) setChecking(false)
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // values는 key로 비교한다 — 매 렌더 새 객체라 그대로 넣으면 끝없이 돈다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, changed, celebId])

  const slugChanged = mode === 'edit' && values.nickname_en.trim() !== initialValues.nickname_en.trim()
  if (!changed && !slugChanged) return null
  const candidates = result?.candidates ?? []
  const issues = result?.issues ?? []
  const clean = result && !candidates.length && !issues.length

  return (
    <div className="space-y-1.5 rounded-lg border border-border/80 bg-bg-secondary/40 px-3 py-2 text-xs" aria-live="polite">
      {slugChanged && (
        <p className="text-amber-400">
          영문 이름을 바꾸면 주소(slug)가 바뀐다. 옛 주소는 사용자 웹 <code className="font-mono">middleware.ts</code>의
          <code className="font-mono"> LEGACY_CELEB_SLUG_REDIRECTS</code>에 넣어 308로 잇는다.
        </p>
      )}
      {checking && (
        <p className="flex items-center gap-1.5 text-text-secondary"><Loader2 className="h-3 w-3 animate-spin" />같은 사람·규칙 확인 중</p>
      )}
      {!checking && clean && (
        <p className="flex items-center gap-1.5 text-green-400"><CircleCheck className="h-3 w-3" />겹치는 인물·규칙 위반 없음</p>
      )}
      {!checking && candidates.length > 0 && (
        <ul className="space-y-1">
          {candidates.map((candidate) => (
            <li key={candidate.id} className={`flex flex-wrap items-center gap-x-2 ${candidate.strong ? 'text-red-400' : 'text-text-secondary'}`}>
              <span className="font-semibold">{candidate.strong ? '같은 사람 의심' : '이름 겹침'}</span>
              <a
                href={`/celebs/${candidate.slug ?? candidate.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-text-primary underline-offset-2 hover:text-accent hover:underline"
              >
                {candidate.nickname}
              </a>
              <span>{[candidate.title, candidate.lifespan].filter(Boolean).join(' · ')}</span>
              <span className="text-[10px] opacity-80">({candidate.reasons.map((reason) => REASON_LABEL[reason] ?? reason).join('·')} 일치)</span>
            </li>
          ))}
          {candidates.some((candidate) => candidate.strong) && (
            <li className="text-red-400">저장하면 막힌다. 새로 만들지 말고 기존 프로필을 보강한다.</li>
          )}
        </ul>
      )}
      {!checking && issues.length > 0 && (
        <ul className="space-y-1">
          {issues.map((issue) => (
            <li key={`${issue.field}:${issue.message}`} className={`flex items-start gap-1.5 ${issue.level === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span><span className="font-mono">{issue.field}</span> {issue.message}{issue.level === 'error' ? ' — 저장이 막힌다' : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
