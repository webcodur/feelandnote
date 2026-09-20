'use client'

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { Check, Copy, ImageIcon, Loader2, Star, Zap } from 'lucide-react'
import type { Member } from '@/actions/admin/members'
import {
  enqueueCelebAvatarBackgroundRemovals,
  getCelebImageProcessingJobs,
} from '@/actions/admin/celeb-nobg'
import type { ImageProcessingJob } from '@/lib/image-processing/types'
import PersistedCelebAvatarEditor from '@/components/celeb/avatar/PersistedCelebAvatarEditor'
import PersistedCelebPortraitEditor from '@/components/celeb/portrait/PersistedCelebPortraitEditor'
import PersistedCelebAwakenedImageEditor from '@/components/celeb/awakened/PersistedCelebAwakenedImageEditor'
import CelebAvatarNobgButton from '@/components/celeb/avatar/CelebAvatarNobgButton'
import { useToast } from '@/contexts/ToastContext'
import NobgBatchBar from './NobgBatchBar'
import QuickImageBar from './QuickImageBar'
import { useQuickImageInbox, type ImageSlot, type ImageTarget } from './useQuickImageInbox'

/** 숫자키와 자리의 대응. 자판 배열과 무관하게 물리 키(code)로 본다. */
const SLOT_KEYS: Record<string, ImageSlot> = {
  Digit1: 'avatar',
  Digit2: 'portrait',
  Digit3: 'awakened',
  Numpad1: 'avatar',
  Numpad2: 'portrait',
  Numpad3: 'awakened',
}

/**
 * 화면에 가장 크게 보이는 행을 고른다. 본문은 창이 아니라 레이아웃의 스크롤 칸이
 * 굴러가므로, 그 칸의 위아래 경계와 겹치는 높이로 잰다.
 */
function findMostVisibleCelebId(rows: Map<string, HTMLElement>): string | null {
  const container = document.querySelector('main')
  const bounds = container?.getBoundingClientRect()
  const top = bounds?.top ?? 0
  const bottom = bounds?.bottom ?? window.innerHeight

  let bestId: string | null = null
  let bestHeight = 0
  for (const [celebId, element] of rows) {
    const rect = element.getBoundingClientRect()
    const visible = Math.min(rect.bottom, bottom) - Math.max(rect.top, top)
    if (visible > bestHeight) {
      bestHeight = visible
      bestId = celebId
    }
  }
  return bestHeight > 0 ? bestId : null
}

export default function CelebImageGrid({
  celebs,
  imageProcessingJobs,
}: {
  celebs: Member[]
  imageProcessingJobs: Record<string, ImageProcessingJob>
}) {
  const { showToast } = useToast()
  const [jobsByCeleb, setJobsByCeleb] = useState(imageProcessingJobs)
  // 받을 자리 = 행 + 종류. 행은 스크롤을 따라가고, 종류는 숫자키·타일 클릭이 정한다.
  // 타일을 직접 누르면 그 행에 잠깐 묶어 두고, 목록을 굴리면 다시 화면을 따라간다.
  const [targetSlot, setTargetSlot] = useState<ImageSlot>('avatar')
  const [pinnedCelebId, setPinnedCelebId] = useState<string | null>(null)
  const [visibleCelebId, setVisibleCelebId] = useState<string | null>(null)
  const rowsRef = useRef(new Map<string, HTMLElement>())
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(celebs.map((celeb) => [celeb.id, celeb.avatar_url ?? null]))
  )
  const [portraitUrls, setPortraitUrls] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(celebs.map((celeb) => [celeb.id, celeb.portrait_url ?? null]))
  )
  const [awakenedImageUrls, setAwakenedImageUrls] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(celebs.map((celeb) => [celeb.id, celeb.awakened_image_url ?? null]))
  )
  const [quickImageOn, setQuickImageOn] = useState(true)
  const [batchCelebIds, setBatchCelebIds] = useState<string[]>([])
  const [batchSubmitting, setBatchSubmitting] = useState(false)

  const targetCelebId = pinnedCelebId ?? visibleCelebId
  const target: ImageTarget | null = targetCelebId
    ? { celebId: targetCelebId, slot: targetSlot }
    : null
  // 사진이 도착한 순간의 자리를 답한다. 화면이 그 사이 굴러갔어도 지금 보이는 행으로 간다.
  const resolveTarget = useCallback((): ImageTarget | null => {
    const celebId = pinnedCelebId ?? findMostVisibleCelebId(rowsRef.current)
    return celebId ? { celebId, slot: targetSlot } : null
  }, [pinnedCelebId, targetSlot])
  const { incoming, clearIncoming } = useQuickImageInbox({
    resolveTarget,
    enabled: quickImageOn,
  })

  // 목록을 굴리면 받을 행이 따라 움직인다. 타일을 눌러 묶어 둔 것도 이때 풀린다.
  useEffect(() => {
    const container = document.querySelector('main')
    let frame = 0

    function measure() {
      frame = 0
      setVisibleCelebId(findMostVisibleCelebId(rowsRef.current))
    }
    function schedule() {
      setPinnedCelebId(null)
      if (frame) return
      frame = requestAnimationFrame(measure)
    }

    measure()
    container?.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      container?.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [celebs])

  // 1·2·3으로 받을 자리의 종류를 고른다. 글자를 치는 중에는 듣지 않는다.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (event.repeat || event.isComposing) return
      const slot = SLOT_KEYS[event.code]
      if (!slot) return
      const element = event.target as HTMLElement | null
      if (element?.closest('input, textarea, select, [contenteditable="true"]')) return

      event.preventDefault()
      setTargetSlot(slot)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  // 얼굴 사진이 있고 지금 처리 중이 아닌 인물만 일괄 대상이다.
  const nobgTargets = celebs.filter((celeb) => {
    if (!avatarUrls[celeb.id]) return false
    const status = jobsByCeleb[celeb.id]?.status
    return status !== 'queued' && status !== 'running'
  })
  const batchSet = new Set(batchCelebIds)
  const batchStats = batchCelebIds.reduce(
    (totals, celebId) => {
      const status = jobsByCeleb[celebId]?.status
      if (status === 'done') totals.done += 1
      else if (status === 'error') totals.error += 1
      else totals.running += 1
      return totals
    },
    { running: 0, done: 0, error: 0 }
  )
  const activeJobIds = Object.values(jobsByCeleb)
    .filter((job) => job.status === 'queued' || job.status === 'running')
    .map((job) => job.id)
    .sort()
  const activeJobKey = activeJobIds.join(',')

  useEffect(() => {
    if (!activeJobKey) return
    const jobIds = activeJobKey.split(',')
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function pollJobs() {
      try {
        const latestJobs = await getCelebImageProcessingJobs(jobIds)
        if (cancelled) return
        setJobsByCeleb((current) => {
          const next = { ...current }
          for (const job of latestJobs) next[job.celebId] = job
          return next
        })
        setAvatarUrls((current) => {
          let next = current
          for (const job of latestJobs) {
            if (job.status !== 'done' || !job.resultUrl || current[job.celebId] === job.resultUrl) continue
            if (next === current) next = { ...current }
            next[job.celebId] = job.resultUrl
          }
          return next
        })
        timer = setTimeout(pollJobs, 1000)
      } catch (error) {
        console.error('이미지 작업 상태 확인 실패:', error)
        if (!cancelled) timer = setTimeout(pollJobs, 2000)
      }
    }

    timer = setTimeout(pollJobs, 500)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [activeJobKey])

  // 일괄 처리는 인물별로 알리지 않고 다 끝났을 때 한 번만 알린다.
  useEffect(() => {
    if (batchCelebIds.length === 0 || batchStats.running > 0) return
    showToast(
      batchStats.error > 0 ? 'error' : 'success',
      batchStats.error > 0
        ? `배경 제거 ${batchStats.done}명 완료, ${batchStats.error}명 실패했습니다.`
        : `${batchStats.done}명의 배경 제거를 마쳤습니다.`
    )
    setBatchCelebIds([])
  }, [batchCelebIds.length, batchStats.running, batchStats.done, batchStats.error, showToast])

  async function handleRunAllNobg() {
    if (batchSubmitting || nobgTargets.length === 0) return
    const confirmed = window.confirm(
      `목록에 보이는 ${nobgTargets.length}명의 얼굴 사진 배경을 제거합니다.
결과가 기존 얼굴 사진을 덮어씁니다. 진행할까요?`
    )
    if (!confirmed) return

    setBatchSubmitting(true)
    try {
      const jobs = await enqueueCelebAvatarBackgroundRemovals(nobgTargets.map((celeb) => celeb.id))
      setJobsByCeleb((current) => {
        const next = { ...current }
        for (const job of jobs) next[job.celebId] = job
        return next
      })
      setBatchCelebIds(jobs.map((job) => job.celebId))
      showToast('success', `${jobs.length}명을 nobg 대기열에 넣었습니다.`)
    } catch (error) {
      console.error('nobg 일괄 접수 실패:', error)
      showToast('error', error instanceof Error ? error.message : 'nobg 일괄 작업을 접수하지 못했습니다.')
    } finally {
      setBatchSubmitting(false)
    }
  }

  if (celebs.length === 0) {
    return <div className="px-4 py-16 text-center text-sm text-text-secondary">셀럽이 없습니다.</div>
  }

  return (
    <>
      <QuickImageBar
        on={quickImageOn}
        editing={incoming !== null}
        targetName={celebs.find((celeb) => celeb.id === target?.celebId)?.nickname?.trim() || null}
        targetSlot={target ? target.slot : null}
        onToggle={() => setQuickImageOn((current) => !current)}
      />
      <NobgBatchBar
        targetCount={nobgTargets.length}
        runningCount={batchStats.running}
        doneCount={batchStats.done}
        errorCount={batchStats.error}
        submitting={batchSubmitting}
        onRun={handleRunAllNobg}
      />
      <div className="grid grid-cols-1 gap-px bg-border">
      {celebs.map((celeb) => (
        <CelebImageCard
          key={celeb.id}
          celeb={celeb}
          avatarUrl={avatarUrls[celeb.id] ?? null}
          portraitUrl={portraitUrls[celeb.id] ?? null}
          awakenedImageUrl={awakenedImageUrls[celeb.id] ?? null}
          imageJob={jobsByCeleb[celeb.id] ?? null}
          quietJobNotice={batchSet.has(celeb.id)}
          targeted={target?.celebId === celeb.id}
          targetSlot={target?.celebId === celeb.id ? target.slot : null}
          incomingSlot={incoming?.celebId === celeb.id ? incoming.slot : null}
          incomingFile={incoming?.celebId === celeb.id ? incoming.file : null}
          onIncomingDone={clearIncoming}
          registerRow={(element) => {
            if (element) rowsRef.current.set(celeb.id, element)
            else rowsRef.current.delete(celeb.id)
          }}
          onAvatarUrlChange={(url) => setAvatarUrls((current) => ({
            ...current,
            [celeb.id]: url,
          }))}
          onPortraitUrlChange={(url) => setPortraitUrls((current) => ({
            ...current,
            [celeb.id]: url,
          }))}
          onAwakenedImageUrlChange={(url) => setAwakenedImageUrls((current) => ({
            ...current,
            [celeb.id]: url,
          }))}
          onImageJobChange={(job) => setJobsByCeleb((current) => ({
            ...current,
            [celeb.id]: job,
          }))}
          onSelectSlot={(slot) => {
            setTargetSlot(slot)
            setPinnedCelebId(celeb.id)
          }}
        />
      ))}
      </div>
    </>
  )
}

function CelebImageCard({
  celeb,
  avatarUrl,
  portraitUrl,
  awakenedImageUrl,
  imageJob,
  quietJobNotice,
  targeted,
  targetSlot,
  incomingSlot,
  incomingFile,
  onIncomingDone,
  registerRow,
  onAvatarUrlChange,
  onPortraitUrlChange,
  onAwakenedImageUrlChange,
  onImageJobChange,
  onSelectSlot,
}: {
  celeb: Member
  avatarUrl: string | null
  portraitUrl: string | null
  awakenedImageUrl: string | null
  imageJob: ImageProcessingJob | null
  quietJobNotice: boolean
  /** 지금 사진을 받을 행이다. */
  targeted: boolean
  targetSlot: ImageSlot | null
  incomingSlot: ImageSlot | null
  incomingFile: File | null
  onIncomingDone: () => void
  registerRow: (element: HTMLElement | null) => void
  onAvatarUrlChange: (url: string | null) => void
  onPortraitUrlChange: (url: string | null) => void
  onAwakenedImageUrlChange: (url: string | null) => void
  onImageJobChange: (job: ImageProcessingJob) => void
  onSelectSlot: (slot: ImageSlot) => void
}) {
  const { showToast } = useToast()
  const [copied, setCopied] = useState(false)
  const name = celeb.nickname?.trim() || '이름 없음'
  const title = celeb.title?.trim()
  const bio = celeb.bio?.trim()

  async function handleCopyName() {
    try {
      await navigator.clipboard.writeText(name)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error('이름 복사 실패:', error)
      showToast('error', '이름을 복사하지 못했습니다.')
    }
  }

  return (
    <article
      ref={registerRow}
      className={`relative min-w-0 overflow-x-auto p-4 md:p-5 ${
        targeted ? 'bg-accent/[0.06] ring-2 ring-inset ring-accent/60' : 'bg-bg-card'
      }`}
    >
      {targeted && (
        <span className="pointer-events-none absolute right-3 top-3 rounded-md bg-accent px-2 py-0.5 text-[11px] font-bold text-white">
          받을 자리
        </span>
      )}
      <div className="mb-4 flex min-w-[520px] items-start gap-3 border-b border-border pb-3">
        <div className="flex min-w-0 shrink-0 items-center gap-1">
          {celeb.slug ? (
            <Link
              href={`/celebs/${celeb.slug}`}
              className="max-w-[190px] truncate text-xl font-bold text-text-primary hover:text-accent"
            >
              {name}
            </Link>
          ) : (
            <h2 className="max-w-[190px] truncate text-xl font-bold text-red-400">{name}</h2>
          )}
          <button
            type="button"
            onClick={handleCopyName}
            aria-label={`${name} 이름 복사`}
            title="이름 복사"
            className="shrink-0 rounded-md p-1.5 text-text-tertiary hover:bg-white/5 hover:text-accent"
          >
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        {(title || bio) && (
          <div className="min-w-0 flex-1 pt-0.5">
            {title && (
              <p className="truncate text-xs font-semibold text-accent" title={title}>{title}</p>
            )}
            {bio && (
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-text-secondary" title={bio}>{bio}</p>
            )}
          </div>
        )}
      </div>

      <div className="grid min-w-[816px] grid-cols-[280px_224px_280px] items-start gap-4">
        <figure className="w-[280px]">
          <ImageCaption label="아바타" imageUrl={avatarUrl} name={name} />
          <PersistedCelebAvatarEditor
            celebId={celeb.id}
            avatarUrl={avatarUrl}
            name={celeb.nickname}
            onSaved={onAvatarUrlChange}
            onBackgroundRemovalQueued={onImageJobChange}
            refreshAfterSave={false}
            openOnClick
            pasteActive={targetSlot === 'avatar'}
            incomingFile={incomingSlot === 'avatar' ? incomingFile : null}
            onIncomingDone={onIncomingDone}
            onActivate={() => onSelectSlot('avatar')}
            className="h-[280px] w-[280px] shrink-0 rounded-xl"
            previewClassName="h-[280px] w-[280px] rounded-xl border border-border hover:border-accent"
            empty={<Star className="h-10 w-10 text-text-tertiary" />}
          />
          <CelebAvatarNobgButton
            celebId={celeb.id}
            name={celeb.nickname}
            avatarUrl={avatarUrl}
            job={imageJob}
            poll={false}
            quiet={quietJobNotice}
            onJobChange={onImageJobChange}
            onCompleted={onAvatarUrlChange}
            className="mt-2 w-full"
          />
        </figure>

        <figure className="w-[224px]">
          <ImageCaption label="대표 사진" imageUrl={portraitUrl} name={name} />
          <PersistedCelebPortraitEditor
            celebId={celeb.id}
            portraitUrl={portraitUrl}
            name={celeb.nickname}
            onSaved={onPortraitUrlChange}
            refreshAfterSave={false}
            openOnClick
            pasteActive={targetSlot === 'portrait'}
            incomingFile={incomingSlot === 'portrait' ? incomingFile : null}
            onIncomingDone={onIncomingDone}
            onActivate={() => onSelectSlot('portrait')}
            className="group/portrait relative h-[280px] w-[224px] shrink-0 overflow-hidden rounded-xl border border-border bg-bg-secondary hover:border-accent data-[dragging=true]:border-accent data-[dragging=true]:bg-accent/10 data-[dragging=true]:ring-2 data-[dragging=true]:ring-accent/30"
            empty={<ImageIcon className="h-10 w-10 text-text-tertiary" />}
          />
        </figure>

        <figure className="w-[280px]">
          <ImageCaption label="각성 이미지" imageUrl={awakenedImageUrl} name={name} />
          <PersistedCelebAwakenedImageEditor
            celebId={celeb.id}
            awakenedImageUrl={awakenedImageUrl}
            name={celeb.nickname}
            onSaved={onAwakenedImageUrlChange}
            refreshAfterSave={false}
            openOnClick
            pasteActive={targetSlot === 'awakened'}
            incomingFile={incomingSlot === 'awakened' ? incomingFile : null}
            onIncomingDone={onIncomingDone}
            onActivate={() => onSelectSlot('awakened')}
            className="group/portrait relative h-[280px] w-[280px] shrink-0 overflow-hidden rounded-xl border border-amber-500/30 bg-bg-secondary hover:border-amber-300 data-[dragging=true]:border-amber-300 data-[dragging=true]:bg-amber-500/10 data-[dragging=true]:ring-2 data-[dragging=true]:ring-amber-400/30"
            empty={<Zap className="h-10 w-10 text-amber-400/55" />}
          />
        </figure>
      </div>
    </article>
  )
}

function ImageCaption({
  label,
  imageUrl,
  name,
}: {
  label: '아바타' | '대표 사진' | '각성 이미지'
  imageUrl?: string | null
  name: string
}) {
  const { showToast } = useToast()
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleCopyImage(event: MouseEvent<HTMLButtonElement>) {
    if (!imageUrl || copying) return
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      showToast('error', '이 브라우저는 이미지 클립보드 복사를 지원하지 않습니다.')
      return
    }

    setCopying(true)
    try {
      const renderedImage = event.currentTarget.closest('figure')?.querySelector('img')
      const pngPromise = renderedImage?.complete && renderedImage.naturalWidth > 0
        ? convertRenderedImageToPng(renderedImage).catch(() => fetchClipboardImage(imageUrl).then(convertImageToPng))
        : fetchClipboardImage(imageUrl).then(convertImageToPng)
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngPromise }),
      ])
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error(`${label} 이미지 복사 실패:`, error)
      showToast('error', `${label} 이미지를 복사하지 못했습니다.`)
    } finally {
      setCopying(false)
    }
  }

  return (
    <figcaption className="mb-2 flex h-7 items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
      {label}
      <button
        type="button"
        disabled={!imageUrl || copying}
        onClick={handleCopyImage}
        aria-label={`${name} ${label} 이미지 클립보드에 복사`}
        title={`${label} 이미지 복사`}
        className="rounded-md p-1.5 text-text-tertiary hover:bg-white/5 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
      >
        {copying
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : copied
            ? <Check className="h-4 w-4 text-green-400" />
            : <Copy className="h-4 w-4" />}
      </button>
    </figcaption>
  )
}

async function fetchClipboardImage(url: string): Promise<Blob> {
  const response = await fetch(`/api/admin/image-clipboard?url=${encodeURIComponent(url)}`, {
    cache: 'no-store',
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(payload?.error || `이미지 조회 실패: HTTP ${response.status}`)
  }
  return response.blob()
}

async function convertRenderedImageToPng(image: HTMLImageElement): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('이미지 변환 캔버스를 만들지 못했습니다.')
  context.drawImage(image, 0, 0)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('PNG 변환 결과가 비어 있습니다.'))
    }, 'image/png')
  })
}

async function convertImageToPng(source: Blob): Promise<Blob> {
  if (source.type === 'image/png') return source

  const objectUrl = URL.createObjectURL(source)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('이미지를 PNG로 변환하지 못했습니다.'))
      element.src = objectUrl
    })
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('이미지 변환 캔버스를 만들지 못했습니다.')
    context.drawImage(image, 0, 0)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('PNG 변환 결과가 비어 있습니다.'))
      }, 'image/png')
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
