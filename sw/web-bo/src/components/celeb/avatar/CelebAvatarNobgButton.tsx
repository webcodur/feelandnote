'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock3, Loader2, ScanLine } from 'lucide-react'
import {
  enqueueCelebAvatarBackgroundRemoval,
  getCelebActiveImageProcessingJobs,
  getCelebImageProcessingJobs,
} from '@/actions/admin/celeb-nobg'
import type { ImageProcessingJob } from '@/lib/image-processing/types'
import { useToast } from '@/contexts/ToastContext'
import { nobgQueuedMessage, nobgQueueFailureMessage } from './nobgJobNotice'

interface Props {
  celebId: string
  name?: string | null
  avatarUrl?: string | null
  disabled?: boolean
  job?: ImageProcessingJob | null
  poll?: boolean
  /** 일괄 처리처럼 결과를 한 번에 요약해 알릴 때 개별 완료 알림을 끈다. */
  quiet?: boolean
  className?: string
  onJobChange?: (job: ImageProcessingJob) => void
  onCompleted?: (url: string) => void
}

export default function CelebAvatarNobgButton({
  celebId,
  name,
  avatarUrl,
  disabled = false,
  job,
  poll = true,
  quiet = false,
  className = '',
  onJobChange,
  onCompleted,
}: Props) {
  const { showToast } = useToast()
  const controlled = job !== undefined
  const [localJob, setLocalJob] = useState<ImageProcessingJob | null>(job ?? null)
  const [reframe, setReframe] = useState(true)
  const currentJob = controlled ? job ?? null : localJob
  const notifiedJobId = useRef<string | null>(null)
  const label = name?.trim() || '인물'
  const active = currentJob?.status === 'queued' || currentJob?.status === 'running'
  const activeJobId = poll && active ? currentJob.id : null

  const updateJob = useCallback((next: ImageProcessingJob) => {
    if (!controlled) setLocalJob(next)
    onJobChange?.(next)
  }, [controlled, onJobChange])

  useEffect(() => {
    if (controlled) return
    let cancelled = false
    void getCelebActiveImageProcessingJobs([celebId])
      .then((jobs) => {
        const activeJob = jobs[celebId]
        if (!cancelled && activeJob) setLocalJob(activeJob)
      })
      .catch((error) => console.error('nobg 작업 복구 실패:', error))
    return () => { cancelled = true }
  }, [celebId, controlled])

  useEffect(() => {
    if (!activeJobId) return
    const jobId = activeJobId
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function pollJob() {
      try {
        const [latest] = await getCelebImageProcessingJobs([jobId])
        if (cancelled || !latest) return
        updateJob(latest)
        if (latest.status === 'queued' || latest.status === 'running') {
          timer = setTimeout(pollJob, 1000)
        }
      } catch (error) {
        console.error('nobg 작업 상태 확인 실패:', error)
        if (!cancelled) timer = setTimeout(pollJob, 2000)
      }
    }

    timer = setTimeout(pollJob, 500)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [activeJobId, updateJob])

  useEffect(() => {
    if (!currentJob || notifiedJobId.current === currentJob.id) return
    if (currentJob.status === 'done' && currentJob.resultUrl) {
      notifiedJobId.current = currentJob.id
      onCompleted?.(currentJob.resultUrl)
      if (!quiet) showToast('success', currentJob.type === 'nobg-avatar-only'
        ? `${label} 아바타의 구도를 유지하고 배경만 제거했습니다.`
        : `${label} 아바타의 배경 제거와 reframe을 마쳤습니다.`)
    } else if (currentJob.status === 'error') {
      notifiedJobId.current = currentJob.id
      if (!quiet) showToast('error', currentJob.error || 'nobg 처리에 실패했습니다.')
    }
  }, [currentJob, label, onCompleted, quiet, showToast])

  async function handleNobg() {
    if (!avatarUrl || disabled || active) return
    try {
      const next = await enqueueCelebAvatarBackgroundRemoval(celebId, reframe)
      updateJob(next)
      showToast('success', nobgQueuedMessage(label, next))
    } catch (error) {
      console.error('nobg 작업 접수 실패:', error)
      showToast('error', nobgQueueFailureMessage(error))
    }
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-text-secondary hover:text-text-primary">
        <input type="checkbox" checked={reframe} disabled={active || disabled} onChange={(event) => setReframe(event.target.checked)} className="cursor-pointer accent-accent" />
        reframe도 실행 (끄면 nobg만)
      </label>
      <button
        type="button"
        disabled={!avatarUrl || disabled || active}
        onClick={handleNobg}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs font-semibold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
        title={disabled ? '아바타 변경사항을 먼저 저장하세요.' : reframe ? 'nobg 배경 제거 후 reframe으로 최종 구도 맞춤' : '현재 구도를 유지하고 nobg로 배경만 제거'}
      >
        {currentJob?.status === 'running' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : currentJob?.status === 'queued' ? (
          <Clock3 className="h-4 w-4" />
        ) : (
          <ScanLine className="h-4 w-4" />
        )}
        {currentJob?.status === 'running'
          ? currentJob.progress || '배경 제거 처리 중…'
          : currentJob?.status === 'queued'
            ? `대기 ${currentJob.queuePosition}번째`
            : reframe ? 'nobg + reframe' : 'nobg만'}
      </button>
    </div>
  )
}
