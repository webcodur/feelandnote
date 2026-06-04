'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  buildTitle, buildDescription, calcChapterTimestamps,
  type EpisodeMeta, type YouTubeMeta, type YouTubeLink, type EpisodeForChapters, type BookForDesc,
} from '@feelandnote/shared/lib/youtube-meta'

const BTN = 'px-3 py-1 rounded text-sm font-semibold'
const BTN_PRIMARY = `bg-accent text-bg-main ${BTN} hover:bg-accent-hover`
const BTN_SECONDARY = `bg-bg-card border border-border ${BTN} hover:bg-bg-hover`
const TAG = 'text-sm font-semibold font-bold px-1.5 py-0.5 rounded font-mono'

type VariantInfo = {
  lang: 'ko' | 'en'
  type: 'longform' | 'shorts'
  /** 1-based 일관. longform은 무관(0 사용), shorts는 1, 2, 3 … */
  shortsIndex: number
  /** 매칭 키. e.g. 'ko-longform', 'ko-shorts-1', 'ko-shorts-2' */
  key: string
  video: { exists: boolean; size: number; name: string } | null
  srt: { exists: boolean; name: string } | null
  thumb: { exists: boolean; name: string } | null
}

type ChannelAuth = { authenticated: boolean; expiryDate?: string }

type YouTubeStatus = {
  auth: { ko: ChannelAuth; en: ChannelAuth }
  lineup: EpisodeMeta | null
  variants: VariantInfo[]
  meta: YouTubeMeta | null
}

type EpisodeData = EpisodeForChapters & {
  host: { nickname: string; nickname_en?: string }
  books: BookForDesc[]
  shorts?: Array<{ featuredBookIndex?: number }>
  series?: { part: number; totalParts: number; totalBooks: number; prevEpisode?: string }
}

/**
 * 옵션 2 variant 키 규칙 (1-based 일관):
 * - `${lang}-longform`
 * - `${lang}-shorts-${n}`    (n ≥ 1)
 *
 * 레거시 `${lang}-shorts` (접미사 없음)은 폐기된다.
 */
type VariantKey = string
type MetaEntry = { title: string; description: string; links: YouTubeLink[] }

function parseVariantKey(key: string): { lang: 'ko' | 'en'; type: 'longform' | 'shorts'; shortsIndex: number } {
  const [lang, kind, idxStr] = key.split('-') as [string, string, string | undefined]
  if (kind === 'longform') return { lang: lang as 'ko' | 'en', type: 'longform', shortsIndex: 0 }
  // ko-shorts-1, ko-shorts-2 … (1-based 필수)
  const shortsIndex = parseInt(idxStr ?? '1', 10)
  return { lang: lang as 'ko' | 'en', type: 'shorts', shortsIndex }
}

function buildVariantKeys(epKo: EpisodeData | null, epEn: EpisodeData | null): VariantKey[] {
  const keys: VariantKey[] = []
  if (epKo) {
    keys.push('ko-longform')
    const koShortsCount = epKo.shorts?.length ?? 0
    for (let i = 0; i < koShortsCount; i++) keys.push(`ko-shorts-${i + 1}`)
  }
  if (epEn) {
    keys.push('en-longform')
    const enShortsCount = epEn.shorts?.length ?? 0
    for (let i = 0; i < enShortsCount; i++) keys.push(`en-shorts-${i + 1}`)
  }
  return keys
}

type Props = {
  series: string
  name: string
  post: (url: string, body: unknown) => Promise<void>
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}MB`
  return `${(bytes / 1024).toFixed(0)}KB`
}

export function YouTubePanel({ series, name, post }: Props) {
  const [status, setStatus] = useState<YouTubeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [epKo, setEpKo] = useState<EpisodeData | null>(null)
  const [epEn, setEpEn] = useState<EpisodeData | null>(null)
  const [dryRun, setDryRun] = useState(false)
  const [uploadMsg, setUploadMsg] = useState<string | null>(null)
  const [uploadLog, setUploadLog] = useState<string[] | null>(null)
  const [uploadTaskId, setUploadTaskId] = useState<string | null>(null)
  const [uploadActive, setUploadActive] = useState(false)
  const [openVariant, setOpenVariant] = useState<VariantKey | null>(null)
  const [editMeta, setEditMeta] = useState<Record<VariantKey, MetaEntry>>({} as any)
  const [editingLineup, setEditingLineup] = useState(false)
  const [lineupDraft, setLineupDraft] = useState<EpisodeMeta | null>(null)
  const [saving, setSaving] = useState(false)

  // EN 페이지에서도 base name으로 YouTube API 호출
  // alex-karp-en → alex-karp, alex-karp-2-en → alex-karp-2 (번호 suffix는 보존되어 alt 에피소드 구분)
  const baseName = name.endsWith('-en') ? name.slice(0, -3) : name

  // --- 데이터 로드 ---

  const fetchStatus = useCallback(() => {
    setLoading(true)
    fetch(`/api/${series}/youtube/status?episode=${baseName}`)
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [series, baseName])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  useEffect(() => {
    fetch(`/api/${series}/episodes/${baseName}`)
      .then(r => r.ok ? r.json() : null)
      .then(setEpKo)
      .catch(() => {})
    fetch(`/api/${series}/episodes/${baseName}-en`)
      .then(r => r.ok ? r.json() : null)
      .then(setEpEn)
      .catch(() => {})
  }, [series, baseName])

  // --- 노출 variant 키 (shorts 배열 길이 기반 동적 생성) ---

  const visibleVariantKeys = useMemo<VariantKey[]>(
    () => buildVariantKeys(epKo, epEn),
    [epKo, epEn],
  )

  // --- 자동 생성 값 ---

  const autoGenerated = useMemo(() => {
    const result: Record<VariantKey, MetaEntry> = {}
    const lineupMeta = status?.lineup

    for (const key of visibleVariantKeys) {
      const { lang, type, shortsIndex } = parseVariantKey(key)
      const ep = lang === 'ko' ? epKo : epEn
      if (!ep) continue

      const celebName = lang === 'ko' ? ep.host.nickname : (ep.host.nickname_en ?? ep.host.nickname)
      const isShorts = type === 'shorts'
      // shortsIndex 1-based. 배열 접근 시 -1.
      const shortsCfg = isShorts ? ep.shorts?.[shortsIndex - 1] : undefined
      const shortsBookTitle = isShorts
        ? (shortsCfg?.featuredBookIndex !== undefined
            ? ep.books?.[shortsCfg.featuredBookIndex]?.title
            : ep.books?.[0]?.title)
        : undefined
      // 롱폼 신규 포맷에 필요한 책 수 / 부 번호.
      // 다부 에피소드(series.totalParts > 1)는 totalBooks + part 사용, 단일 부는 books.length.
      const isMultipart = (ep.series?.totalParts ?? 1) > 1
      const longformBookCount = isMultipart ? (ep.series?.totalBooks ?? ep.books.length) : ep.books.length
      const longformPart = isMultipart ? ep.series?.part : undefined
      // lineupMeta 유무와 무관하게 신규 롱폼 포맷은 항상 계산 가능 — 빈 meta 폴백으로 buildTitle 호출.
      const titleMeta = lineupMeta ?? {}
      const title = buildTitle(titleMeta, celebName, lang, isShorts, shortsIndex, shortsBookTitle, longformBookCount, longformPart)

      let chapters: { time: string; label: string }[] | undefined
      if (!isShorts) {
        try { chapters = calcChapterTimestamps(ep, lang) } catch { /* fallback */ }
      }

      const featuredBookIndex = isShorts ? (shortsCfg?.featuredBookIndex ?? 0) : undefined
      const description = buildDescription(celebName, ep.books, lang, isShorts, chapters, undefined, baseName, shortsIndex, featuredBookIndex)
      result[key] = { title, description, links: [] }
    }
    return result
  }, [status?.lineup, epKo, epEn, visibleVariantKeys, baseName])

  // editMeta 초기화: meta 있으면 override, 없으면 autoGenerated
  useEffect(() => {
    const merged: Record<VariantKey, MetaEntry> = {}
    for (const key of visibleVariantKeys) {
      const auto = autoGenerated[key]
      const saved = status?.meta?.[key]
      merged[key] = {
        title: saved?.title ?? auto?.title ?? '',
        description: saved?.description ?? auto?.description ?? '',
        links: saved?.links ?? [],
      }
    }
    setEditMeta(merged)
  }, [autoGenerated, status?.meta, visibleVariantKeys])

  // --- 이벤트 핸들러 ---

  const saveMeta = async () => {
    await fetch(`/api/${series}/youtube/meta?episode=${baseName}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editMeta),
    })
  }

  const handleUpload = async (lang?: string, type?: string, shortsIndex?: number, bookIndex?: number) => {
    // shortsIndex 1-based. 단일 쇼츠(1)이면 레이블 숫자 생략.
    const idxLabel = (type === 'shorts' && shortsIndex != null && shortsIndex > 1) ? ` #${shortsIndex}` : ''
    const soloLabel = (type === 'solo' && typeof bookIndex === 'number') ? ` B${String(bookIndex + 1).padStart(2, '0')}` : ''
    const label = [lang?.toUpperCase(), type].filter(Boolean).join(' ') + idxLabel + soloLabel || '전체'
    setUploadMsg(`${label} 메타 저장 중...`)
    setUploadLog(null)

    // 업로드 전 메타 자동 저장
    await saveMeta()

    setUploadMsg(`${label} ${dryRun ? '드라이런' : '업로드'} 요청 중...`)

    const res = await fetch(`/api/${series}/youtube/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episode: baseName, lang, type, shortsIndex, bookIndex, dry: dryRun }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      setUploadMsg(`실패: ${err.error ?? res.statusText}`)
      return
    }

    const { taskId } = await res.json()
    setUploadTaskId(taskId)
    setUploadActive(true)
    setUploadMsg(`${label} ${dryRun ? '드라이런' : '업로드'} 진행 중...`)

    // 태스크 직접 폴링
    const poll = setInterval(async () => {
      try {
        const tr = await fetch(`/api/tasks/${taskId}`)
        if (!tr.ok) return
        const task = await tr.json()
        setUploadLog(task.log?.slice(-20) ?? [])
        if (task.status !== 'running' && task.status !== 'queued') {
          clearInterval(poll)
          setUploadActive(false)
          setUploadTaskId(null)
          if (task.status === 'done') setUploadMsg(`${label} ${dryRun ? '드라이런' : '업로드'} 완료`)
          else if (task.status === 'cancelled') setUploadMsg(`${label} 업로드 중단됨`)
          else setUploadMsg(`${label} 오류 발생`)
        }
      } catch { /* ignore */ }
    }, 1500)
  }

  const handleCancelUpload = async () => {
    if (!uploadTaskId) return
    await fetch(`/api/${series}/youtube/upload?taskId=${uploadTaskId}`, { method: 'DELETE' })
  }

  const handleSaveMeta = async () => {
    setSaving(true)
    try {
      await saveMeta()
      fetchStatus()
    } finally { setSaving(false) }
  }

  const handleDbSync = async () => {
    setUploadMsg('DB 투입 중...')
    setUploadLog(null)
    try {
      const res = await fetch(`/api/${series}/youtube/db-sync?episode=${baseName}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setUploadMsg(`DB 투입 실패: ${data.error ?? res.statusText}`)
        return
      }
      setUploadMsg(`DB 투입 완료: ${data.slug} (${data.variantCount}개 variant)`)
    } catch (e) {
      setUploadMsg(`DB 투입 오류: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const handleResetVariant = (key: VariantKey) => {
    const auto = autoGenerated[key]
    if (!auto) return
    setEditMeta(prev => ({ ...prev, [key]: { ...auto } }))
  }

  const handleSaveLineup = async () => {
    if (!lineupDraft) return
    setSaving(true)
    try {
      await fetch(`/api/${series}/youtube/lineup?episode=${baseName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lineupDraft),
      })
      setEditingLineup(false)
      fetchStatus()
    } finally { setSaving(false) }
  }

  const updateMeta = (key: VariantKey, field: 'title' | 'description', value: string) => {
    setEditMeta(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  // --- 렌더링 ---

  if (loading) return <div className="text-text-secondary text-sm">로딩...</div>
  if (!status) return <div className="text-error-text text-sm">상태 조회 실패</div>

  const { auth, lineup, variants } = status
  const disabled = !auth.ko.authenticated && !auth.en.authenticated
  const hasUploads = Boolean(lineup?.uploads && Object.keys(lineup.uploads).length > 0)

  return (
    <div className="space-y-4">
      {/* 인증 + 편성 정보 */}
      <LineupHeader
        auth={auth}
        lineup={lineup}
        editing={editingLineup}
        draft={lineupDraft}
        onEdit={() => {
          setEditingLineup(true)
          setLineupDraft(
            lineup
              ? {
                  ...lineup,
                  shortsRelation: { ko: lineup.shortsRelation?.ko ?? '', en: lineup.shortsRelation?.en ?? '' },
                }
              : { shortsRelation: { ko: '', en: '' } }
          )
        }}
        onCancel={() => setEditingLineup(false)}
        onSave={handleSaveLineup}
        onDraftChange={setLineupDraft}
        onRefresh={fetchStatus}
        saving={saving}
      />

      {(!auth.ko.authenticated || !auth.en.authenticated) && (
        <div className="text-sm font-semibold text-error-text space-y-0.5">
          {!auth.ko.authenticated && <p>KO 채널 미인증 — pnpm youtube:auth</p>}
          {!auth.en.authenticated && <p>EN 채널 미인증 — pnpm youtube:auth -- --channel en</p>}
        </div>
      )}

      {/* Variant 아코디언 — visibleVariantKeys 순서 유지 */}
      <div className="space-y-1">
        {visibleVariantKeys.map((key) => {
          const v = variants.find(x => x.key === key)
          if (!v) return null
          const isOpen = openVariant === key
          const meta = editMeta[key]
          const hasOverride = status.meta?.[key] != null

          return (
            <VariantRow
              key={key}
              variant={v}
              series={series}
              name={name}
              isOpen={isOpen}
              meta={meta}
              hasOverride={hasOverride}
              disabled={disabled}
              onToggle={() => setOpenVariant(isOpen ? null : key)}
              onUpdateMeta={(field, value) => updateMeta(key, field, value)}
              onUpdateLinks={(links) => setEditMeta(prev => ({ ...prev, [key]: { ...prev[key], links } }))}
              onReset={() => handleResetVariant(key)}
              onUpload={() => handleUpload(v.lang, v.type, v.shortsIndex)}
            />
          )
        })}
      </div>

      {/* 1권 모드(SOLO) 업로드 — variant 그리드와 별도 박스 */}
      <SoloUploadBox
        epKo={epKo}
        epEn={epEn}
        disabled={disabled}
        onUpload={(lang, bookIndex) => handleUpload(lang, 'solo', undefined, bookIndex)}
      />

      {/* 하단 액션 바 */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <button onClick={handleSaveMeta} disabled={saving} className={`${BTN_SECONDARY} ${saving ? 'opacity-50' : ''}`}>
          메타 저장
        </button>
        <button onClick={() => handleUpload()} disabled={disabled} className={`${BTN_PRIMARY} ${disabled ? 'opacity-30 cursor-default' : ''}`}>
          전체 업로드
        </button>
        <button onClick={() => handleUpload('ko')} disabled={disabled} className={`${BTN_SECONDARY} ${disabled ? 'opacity-30 cursor-default' : ''}`}>
          KO만
        </button>
        <button onClick={() => handleUpload('en')} disabled={disabled} className={`${BTN_SECONDARY} ${disabled ? 'opacity-30 cursor-default' : ''}`}>
          EN만
        </button>
        <button
          onClick={handleDbSync}
          disabled={!hasUploads}
          title="lineup.json의 uploads를 profiles.youtube_videos(DB)에 반영"
          className={`${BTN_SECONDARY} ${!hasUploads ? 'opacity-30 cursor-default' : ''}`}
        >
          DB 투입
        </button>
        <label className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-text-secondary cursor-pointer select-none">
          <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} className="accent-accent" />
          드라이런
        </label>
      </div>
      {uploadMsg && (
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold ${uploadActive ? 'text-accent animate-pulse' : 'text-text-secondary'}`}>{uploadMsg}</p>
          {uploadActive && (
            <button onClick={handleCancelUpload} className="text-sm font-semibold text-red-400 hover:text-red-300 border border-red-400/40 rounded px-1.5 py-0.5">
              중단
            </button>
          )}
        </div>
      )}
      {uploadLog && uploadLog.length > 0 && (
        <pre className="bg-bg-main border border-border rounded p-2 text-sm font-semibold font-bold font-mono text-text-secondary max-h-48 overflow-y-auto whitespace-pre-wrap">
          {uploadLog.join('\n')}
        </pre>
      )}
    </div>
  )
}

// ─── SoloUploadBox ───────────────────────────────────────

/** 1권 모드(SOLO) 영상 업로드 박스. 책별로 ko/en 업로드 버튼 노출.
 *  솔로는 별도 데이터 없이 모든 책에서 자동 변환되므로 책 배열을 그대로 후보로 삼는다. */
function SoloUploadBox({ epKo, epEn, disabled, onUpload }: {
  epKo: EpisodeData | null
  epEn: EpisodeData | null
  disabled: boolean
  onUpload: (lang: 'ko' | 'en', bookIndex: number) => void
}) {
  const koBooks = Array.isArray(epKo?.books) ? epKo!.books! : []
  const enBooks = Array.isArray(epEn?.books) ? epEn!.books! : []
  const count = Math.max(koBooks.length, enBooks.length)
  if (count === 0) return null

  return (
    <div className="space-y-2 p-3 rounded bg-bg-card border border-border">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-accent tracking-widest">SOLO · 1권 모드</span>
        <span className="text-[11px] text-text-dim">{count}권 (책 본문 자동 변환)</span>
      </div>
      <div className="space-y-1">
        {Array.from({ length: count }, (_, idx) => {
          const num = String(idx + 1).padStart(2, '0')
          const koTitle = koBooks[idx]?.title ?? ''
          const enTitle = enBooks[idx]?.title ?? ''
          const hasKo = !!koBooks[idx]
          const hasEn = !!enBooks[idx]
          return (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <span className="font-mono text-text-dim w-10">B{num}</span>
              <span className="flex-1 truncate text-text-secondary" title={koTitle || enTitle}>
                {koTitle || enTitle}
              </span>
              <button
                onClick={() => onUpload('ko', idx)}
                disabled={!hasKo || disabled}
                className={`px-2 py-0.5 text-[11px] rounded border border-border ${(!hasKo || disabled) ? 'opacity-30 cursor-default' : 'hover:bg-bg-hover'}`}
                title={hasKo ? 'KO 채널 업로드' : 'KO 책 없음'}
              >KO</button>
              <button
                onClick={() => onUpload('en', idx)}
                disabled={!hasEn || disabled}
                className={`px-2 py-0.5 text-[11px] rounded border border-border ${(!hasEn || disabled) ? 'opacity-30 cursor-default' : 'hover:bg-bg-hover'}`}
                title={hasEn ? 'EN 채널 업로드' : 'EN 책 없음'}
              >EN</button>
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-text-dim leading-relaxed">
        영상 파일이 렌더링되어 있어야 업로드된다. 렌더는 「렌더」 페이지에서 실행한다.
      </p>
    </div>
  )
}

// ─── LineupHeader ────────────────────────────────────────

function LineupHeader({ auth, lineup, editing, draft, onEdit, onCancel, onSave, onDraftChange, onRefresh, saving }: {
  auth: { ko: ChannelAuth; en: ChannelAuth }
  lineup: EpisodeMeta | null
  editing: boolean
  draft: EpisodeMeta | null
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onDraftChange: (d: EpisodeMeta) => void
  onRefresh: () => void
  saving: boolean
}) {
  if (editing && draft) {
    const relKo = draft.shortsRelation?.ko ?? ''
    const relEn = draft.shortsRelation?.en ?? ''
    return (
      <div className="space-y-2 p-2 rounded bg-bg-main border border-accent/40">
        <div className="flex items-center gap-2 text-sm">
          <label className="text-text-secondary w-24 shrink-0">쇼츠 수식어(KO)</label>
          <input
            value={relKo}
            onChange={e => onDraftChange({ ...draft, shortsRelation: { ko: e.target.value, en: relEn } })}
            placeholder="예: 인생책"
            className="flex-1 bg-bg-card border border-border rounded px-2 py-0.5 text-sm text-text-primary"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-text-secondary w-24 shrink-0">쇼츠 수식어(EN)</label>
          <input
            value={relEn}
            onChange={e => onDraftChange({ ...draft, shortsRelation: { ko: relKo, en: e.target.value } })}
            placeholder="e.g. lifelong favorite"
            className="flex-1 bg-bg-card border border-border rounded px-2 py-0.5 text-sm text-text-primary"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onSave} disabled={saving} className={`${BTN_PRIMARY} text-sm font-semibold ${saving ? 'opacity-50' : ''}`}>저장</button>
          <button onClick={onCancel} className={`${BTN_SECONDARY} text-sm font-semibold`}>취소</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${auth.ko.authenticated ? 'bg-green-500' : 'bg-red-500'}`} />
          KO
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${auth.en.authenticated ? 'bg-green-500' : 'bg-red-500'}`} />
          EN
        </span>
        {lineup ? (
          <>
            <button onClick={onEdit} className="text-text-secondary hover:text-accent text-sm font-semibold">[수정]</button>
          </>
        ) : (
          <>
            <span className="text-warning-text text-sm font-semibold">편성표 미등록</span>
            <button onClick={onEdit} className="text-accent text-sm font-semibold hover:underline">[등록]</button>
          </>
        )}
        <button onClick={onRefresh} className="ml-auto text-text-secondary hover:text-text-primary text-sm font-semibold">새로고침</button>
      </div>
      {lineup && (
        <div className="text-sm font-semibold text-text-secondary space-y-0.5">
          <div>쇼츠 수식어(KO): {lineup.shortsRelation?.ko ?? ''}</div>
          <div>쇼츠 수식어(EN): {lineup.shortsRelation?.en ?? ''}</div>
        </div>
      )}
    </div>
  )
}

// ─── VariantRow ──────────────────────────────────────────

function VariantRow({ variant: v, series, name, isOpen, meta, hasOverride, disabled, onToggle, onUpdateMeta, onUpdateLinks, onReset, onUpload }: {
  variant: VariantInfo
  series: string
  name: string
  isOpen: boolean
  meta: MetaEntry | undefined
  hasOverride: boolean
  disabled: boolean
  onToggle: () => void
  onUpdateMeta: (field: 'title' | 'description', value: string) => void
  onUpdateLinks: (links: YouTubeLink[]) => void
  onReset: () => void
  onUpload: () => void
}) {
  const langLabel = v.lang.toUpperCase()
  const typeLabel = v.type === 'longform'
    ? '롱폼'
    : (v.shortsIndex <= 1 ? '쇼츠' : `쇼츠 ${v.shortsIndex}`)
  const baseName = name.endsWith('-en') ? name.slice(0, -3) : name
  const label = baseName.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')

  return (
    <div className="rounded bg-bg-main border border-border overflow-hidden">
      {/* 접힌 헤더 */}
      <div className="flex items-center gap-3 p-2 hover:bg-bg-hover">
        <div role="button" tabIndex={0} onClick={onToggle} onKeyDown={e => e.key === 'Enter' && onToggle()}
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
          <span className="text-text-secondary text-sm font-semibold w-4">{isOpen ? '▾' : '▸'}</span>
          {/* 썸네일 */}
          <div className="w-12 h-8 rounded bg-bg-card overflow-hidden shrink-0 flex items-center justify-center">
            {v.thumb ? (
              <img src={`/api/${series}/youtube/thumb/${label}/${v.lang.toUpperCase()}/${v.thumb.name}`} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-text-secondary text-sm font-semibold">—</span>
            )}
          </div>
          <span className={`${TAG} ${v.lang === 'ko' ? 'bg-blue-900/40 text-blue-400' : 'bg-purple-900/40 text-purple-400'}`}>
            {langLabel}
          </span>
          <span className="font-semibold text-text-primary text-sm">{typeLabel}</span>
          {v.video ? (
            <span className="text-text-secondary text-sm font-semibold">{formatSize(v.video.size)}</span>
          ) : (
            <span className="text-warning-text text-sm font-semibold">렌더 필요</span>
          )}
          {v.srt && <span className={`${TAG} bg-bg-card text-text-secondary`}>SRT</span>}
          {v.thumb && <span className={`${TAG} bg-bg-card text-text-secondary`}>THUMB</span>}
          {hasOverride && <span className={`${TAG} bg-accent/20 text-accent`}>커스텀</span>}
        </div>
        <button
          onClick={onUpload}
          disabled={disabled || !v.video}
          className={`${BTN_SECONDARY} text-sm font-semibold shrink-0 ${disabled || !v.video ? 'opacity-30 cursor-default' : ''}`}
        >업로드</button>
      </div>

      {/* 펼친 편집 영역 */}
      {isOpen && meta && (
        <div className="px-3 pb-3 space-y-2 border-t border-border">
          <div className="pt-2">
            <label className="text-sm font-semibold font-bold text-text-secondary uppercase tracking-wider">제목</label>
            <input
              value={meta.title}
              onChange={e => onUpdateMeta('title', e.target.value)}
              className="w-full bg-bg-card border border-border rounded px-2 py-1 text-sm text-text-primary font-mono mt-0.5"
            />
          </div>
          <div>
            <label className="text-sm font-semibold font-bold text-text-secondary uppercase tracking-wider">설명</label>
            <textarea
              value={meta.description}
              onChange={e => onUpdateMeta('description', e.target.value)}
              rows={v.type === 'longform' ? 16 : 6}
              className="w-full bg-bg-card border border-border rounded px-2 py-1 text-sm font-semibold text-text-primary font-mono mt-0.5 leading-relaxed resize-y"
            />
          </div>
          {/* 링크 편집 */}
          <div>
            <label className="text-sm font-semibold font-bold text-text-secondary uppercase tracking-wider">링크</label>
            <div className="space-y-1 mt-1">
              {(meta.links ?? []).map((link, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={link.label}
                    onChange={e => {
                      const next = [...meta.links]; next[i] = { ...next[i], label: e.target.value }; onUpdateLinks(next)
                    }}
                    placeholder="라벨"
                    className="w-32 bg-bg-card border border-border rounded px-2 py-0.5 text-sm font-semibold text-text-primary"
                  />
                  <input
                    value={link.url}
                    onChange={e => {
                      const next = [...meta.links]; next[i] = { ...next[i], url: e.target.value }; onUpdateLinks(next)
                    }}
                    placeholder="https://..."
                    className="flex-1 bg-bg-card border border-border rounded px-2 py-0.5 text-sm font-semibold text-text-primary font-mono"
                  />
                  <button onClick={() => { const next = meta.links.filter((_, j) => j !== i); onUpdateLinks(next) }}
                    className="text-red-400 text-sm font-semibold hover:text-red-300 shrink-0 px-1">✕</button>
                </div>
              ))}
              <button
                onClick={() => onUpdateLinks([...(meta.links ?? []), { label: '', url: '' }])}
                className="text-accent text-sm font-semibold hover:underline">
                + 링크 추가
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={onReset} className={`${BTN_SECONDARY} text-sm font-semibold`}>기본값 복원</button>
          </div>
        </div>
      )}
    </div>
  )
}
