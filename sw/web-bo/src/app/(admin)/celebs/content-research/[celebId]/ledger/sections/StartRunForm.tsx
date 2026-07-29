'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Play } from 'lucide-react'
import { startContentResearchRun } from '@/actions/admin/content-research'
import type { ContentResearchDetail } from '@/actions/admin/content-research-types'
import { Feedback, splitVariants } from '../shared'

export default function StartRunForm({ detail }: { detail: ContentResearchDetail }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      try {
        await startContentResearchRun({
          celebId: detail.profile.id,
          batchKey: String(formData.get('batchKey') ?? ''),
          researcherLabel: String(formData.get('researcherLabel') ?? ''),
          nameVariants: splitVariants(formData.get('nameVariants')),
          homonymNotes: String(formData.get('homonymNotes') ?? ''),
        })
        router.refresh()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : '조사 실행 생성에 실패했습니다.')
      }
    })
  }

  const defaultVariants = [
    detail.profile.nickname,
    detail.profile.nicknameEn,
    detail.profile.slug,
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <section className="overflow-hidden rounded-lg border border-accent/35 bg-bg-card">
      <div className="border-b border-accent/20 bg-accent/5 px-5 py-4">
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-accent" />
          <h2 className="font-semibold text-text-primary">새 전면 조사 시작</h2>
        </div>
        <p className="mt-1 text-xs leading-5 text-text-secondary">
          실행을 만들면 BOOK·VIDEO·GAME·MUSIC 네 장부가 자동 생성되고 프로필은
          조사 중 상태가 됩니다.
        </p>
      </div>

      <form action={handleSubmit} className="grid gap-4 p-5 lg:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-text-secondary">배치 키</span>
          <input
            name="batchKey"
            required
            defaultValue="active-light-full-research-20260729"
            className="w-full rounded border border-border bg-bg-secondary px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-accent"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-text-secondary">조사자·실행 주체</span>
          <input
            name="researcherLabel"
            required
            placeholder="예: Codex / 운영자 이름"
            className="w-full rounded border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-text-secondary">
            검색한 이름·표기 변형
          </span>
          <textarea
            name="nameVariants"
            required
            rows={5}
            defaultValue={defaultVariants}
            className="w-full rounded border border-border bg-bg-secondary px-3 py-2 font-mono text-sm leading-6 text-text-primary outline-none focus:border-accent"
          />
          <span className="block text-[11px] text-text-tertiary">
            쉼표 또는 줄바꿈으로 구분
          </span>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-text-secondary">동명이인 차단 메모</span>
          <textarea
            name="homonymNotes"
            rows={5}
            placeholder="직군·생몰·소속·국적 등 배제 기준"
            className="w-full rounded border border-border bg-bg-secondary px-3 py-2 text-sm leading-6 text-text-primary outline-none focus:border-accent"
          />
        </label>
        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent-hover disabled:cursor-wait disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            조사 실행 만들기
          </button>
          <Feedback message={null} error={error} />
        </div>
      </form>
    </section>
  )
}
