'use client'

import { useEffect, useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { Check, Copy, ImageIcon, Loader2, Star } from 'lucide-react'
import type { Member } from '@/actions/admin/members'
import {
  enqueueCelebAvatarBackgroundRemovals,
  getCelebImageProcessingJobs,
} from '@/actions/admin/celeb-nobg'
import type { ImageProcessingJob } from '@/lib/image-processing/types'
import PersistedCelebAvatarEditor from '@/components/celeb/avatar/PersistedCelebAvatarEditor'
import PersistedCelebPortraitEditor from '@/components/celeb/portrait/PersistedCelebPortraitEditor'
import CelebAvatarNobgButton from '@/components/celeb/avatar/CelebAvatarNobgButton'
import { useToast } from '@/contexts/ToastContext'
import NobgBatchBar from './NobgBatchBar'
import QuickImageBar from './QuickImageBar'
import { useQuickImageInbox, type ImageSlot } from './useQuickImageInbox'

export default function CelebImageGrid({
  celebs,
  imageProcessingJobs,
}: {
  celebs: Member[]
  imageProcessingJobs: Record<string, ImageProcessingJob>
}) {
  const { showToast } = useToast()
  const [jobsByCeleb, setJobsByCeleb] = useState(imageProcessingJobs)
  const [activeImage, setActiveImage] = useState<{ celebId: string; slot: ImageSlot } | null>(null)
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(celebs.map((celeb) => [celeb.id, celeb.avatar_url ?? null]))
  )
  const [portraitUrls, setPortraitUrls] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(celebs.map((celeb) => [celeb.id, celeb.portrait_url ?? null]))
  )
  const [quickImageOn, setQuickImageOn] = useState(true)
  const [avatarOnly, setAvatarOnly] = useState(false)
  const [batchCelebIds, setBatchCelebIds] = useState<string[]>([])
  const [batchSubmitting, setBatchSubmitting] = useState(false)
  const { nextTarget, incoming, clearIncoming } = useQuickImageInbox({
    celebs,
    avatarUrls,
    portraitUrls,
    avatarOnly,
    enabled: quickImageOn,
  })
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
        avatarOnly={avatarOnly}
        editing={incoming !== null}
        nextName={nextTarget?.celeb.nickname?.trim() || null}
        nextSlot={nextTarget?.slot ?? null}
        onToggle={() => setQuickImageOn((current) => !current)}
        onToggleAvatarOnly={() => setAvatarOnly((current) => !current)}
      />
      <NobgBatchBar
        targetCount={nobgTargets.length}
        runningCount={batchStats.running}
        doneCount={batchStats.done}
        errorCount={batchStats.error}
        submitting={batchSubmitting}
        onRun={handleRunAllNobg}
      />
      <div className="grid grid-cols-1 gap-px bg-border 2xl:grid-cols-2">
      {celebs.map((celeb, index) => (
        <CelebImageCard
          key={celeb.id}
          celeb={celeb}
          avatarUrl={avatarUrls[celeb.id] ?? null}
          portraitUrl={portraitUrls[celeb.id] ?? null}
          imageJob={jobsByCeleb[celeb.id] ?? null}
          quietJobNotice={batchSet.has(celeb.id)}
          activeImageSlot={activeImage?.celebId === celeb.id ? activeImage.slot : null}
          incomingSlot={incoming?.celebId === celeb.id ? incoming.slot : null}
          incomingFile={incoming?.celebId === celeb.id ? incoming.file : null}
          onIncomingDone={clearIncoming}
          highPriority={index < 4}
          onAvatarUrlChange={(url) => setAvatarUrls((current) => ({
            ...current,
            [celeb.id]: url,
          }))}
          onPortraitUrlChange={(url) => setPortraitUrls((current) => ({
            ...current,
            [celeb.id]: url,
          }))}
          onImageJobChange={(job) => setJobsByCeleb((current) => ({
            ...current,
            [celeb.id]: job,
          }))}
          onActivateImage={(slot) => setActiveImage({ celebId: celeb.id, slot })}
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
  imageJob,
  quietJobNotice,
  activeImageSlot,
  incomingSlot,
  incomingFile,
  onIncomingDone,
  highPriority,
  onAvatarUrlChange,
  onPortraitUrlChange,
  onImageJobChange,
  onActivateImage,
}: {
  celeb: Member
  avatarUrl: string | null
  portraitUrl: string | null
  imageJob: ImageProcessingJob | null
  quietJobNotice: boolean
  activeImageSlot: ImageSlot | null
  incomingSlot: ImageSlot | null
  incomingFile: File | null
  onIncomingDone: () => void
  highPriority: boolean
  onAvatarUrlChange: (url: string | null) => void
  onPortraitUrlChange: (url: string | null) => void
  onImageJobChange: (job: ImageProcessingJob) => void
  onActivateImage: (slot: ImageSlot) => void
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
    <article className="min-w-0 overflow-x-auto bg-bg-card p-4 md:p-5">
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

      <div className="grid min-w-[520px] grid-cols-[280px_224px] items-start gap-4">
        <figure className="w-[280px]">
          <ImageCaption label="Avatar" imageUrl={avatarUrl} name={name} />
          <PersistedCelebAvatarEditor
            celebId={celeb.id}
            avatarUrl={avatarUrl}
            name={celeb.nickname}
            onSaved={onAvatarUrlChange}
            refreshAfterSave={false}
            openOnClick
            loadImmediately
            highPriority={highPriority}
            pasteActive={activeImageSlot === 'avatar'}
            incomingFile={incomingSlot === 'avatar' ? incomingFile : null}
            onIncomingDone={onIncomingDone}
            onActivate={() => onActivateImage('avatar')}
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
          <ImageCaption label="Portrait" imageUrl={portraitUrl} name={name} />
          <PersistedCelebPortraitEditor
            celebId={celeb.id}
            portraitUrl={portraitUrl}
            name={celeb.nickname}
            onSaved={onPortraitUrlChange}
            refreshAfterSave={false}
            openOnClick
            loadImmediately
            highPriority={highPriority}
            pasteActive={activeImageSlot === 'portrait'}
            incomingFile={incomingSlot === 'portrait' ? incomingFile : null}
            onIncomingDone={onIncomingDone}
            onActivate={() => onActivateImage('portrait')}
            className="group/portrait relative h-[280px] w-[224px] shrink-0 overflow-hidden rounded-xl border border-border bg-bg-secondary hover:border-accent data-[dragging=true]:border-accent data-[dragging=true]:bg-accent/10 data-[dragging=true]:ring-2 data-[dragging=true]:ring-accent/30"
            empty={<ImageIcon className="h-10 w-10 text-text-tertiary" />}
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
  label: 'Avatar' | 'Portrait'
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
