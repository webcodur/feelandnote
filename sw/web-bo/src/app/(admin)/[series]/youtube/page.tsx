'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSeriesById } from '@/features/book-recommend/lib/series-registry'

// ─── 타입 ─────────────────────────────────────────────

type UploadRecord = { videoId: string; uploadedAt: string }

type EpisodeMeta = {
  /** 레거시. 신규 타이틀 포맷은 사용하지 않는다. */
  hook?: { ko: string; en: string }
  shortsRelation?: { ko: string; en: string }
  uploads?: Record<string, UploadRecord>
}

type VariantStatus = {
  lang: 'ko' | 'en'
  type: 'longform' | 'shorts'
  /** 옵션 2: 1-based 일관. longform은 0, shorts는 1, 2, 3 … */
  shortsIndex: number
  /** 매칭 키. e.g. 'ko-longform', 'ko-shorts-1', 'ko-shorts-2' */
  key: string
  hasVideo: boolean
  videoSize: number
  hasSrt: boolean
  hasThumb: boolean
}

type EpisodeRow = {
  name: string
  nickname: string
  lineup: EpisodeMeta | null
  variants: VariantStatus[]
  /** 책 수 (단일 부 기준) */
  bookCount: number
  /** 다부 정보 — totalParts > 1인 경우만 */
  partInfo: { part: number; totalParts: number; totalBooks: number } | null
}

type SyncStatus = 'synced' | 'drift' | 'deleted' | 'not_uploaded' | 'error'

type VariantSync = {
  variant: string
  status: SyncStatus
  videoId?: string
  diffs?: string[]
  ytTitle?: string
  localTitle?: string
}

// 푸시 미리보기 — sync API 'preview'/'preview-all' 응답
type VariantPreview = {
  variant: string
  videoId: string
  lang?: 'ko' | 'en'
  ytSnippet?: { title: string; description: string }
  newSnippet?: { title: string; description: string; tags: string[] }
  diffs?: ('title' | 'description' | 'tags')[]
  error?: string
}

// 모달 상태 — null이면 닫힘
type PushModalState = {
  episode: string
  scope: 'one' | 'all'   // 단일 variant or 전체
  variant?: string        // scope='one'일 때만
  loading: boolean
  previews: VariantPreview[] | null
  pushing: boolean
}

type Draft = Record<string, EpisodeMeta>

// ─── 상수 ─────────────────────────────────────────────

const BTN = 'px-3 py-1 rounded text-sm font-semibold'
const BTN_PRIMARY = `bg-accent text-bg-main ${BTN} hover:bg-accent-hover`
const BTN_SECONDARY = `bg-bg-card border border-border ${BTN} hover:bg-bg-hover`
const TAG = 'text-[9px] px-1 py-px rounded font-mono'

/** 옵션 2: variant 키 단축 라벨 — ko-longform → KO-L, ko-shorts-1 → KO-S1, ko-shorts-2 → KO-S2 */
function shortLabel(variantKey: string): string {
  const parts = variantKey.split('-')
  const lang = parts[0].toUpperCase()
  if (parts[1] === 'longform') return `${lang}-L`
  // ko-shorts-{N} — 1-based 인덱스 필수
  return `${lang}-S${parts[2] ?? '1'}`
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}G`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}M`
  return `${(bytes / 1024).toFixed(0)}K`
}

/** 한국어 주격 조사 — 받침 있으면 '이', 없으면 '가'. youtube-meta.ts와 동일 로직. */
function koSubjectMarker(name: string): string {
  const last = name.charCodeAt(name.length - 1)
  if (last < 0xAC00 || last > 0xD7A3) return '가'
  return (last - 0xAC00) % 28 !== 0 ? '이' : '가'
}

const EMPTY_META: EpisodeMeta = { shortsRelation: { ko: '', en: '' } }

// ─── 동기화 배지 색상 ──────────────────────────────────

const SYNC_STYLE: Record<SyncStatus | 'uploaded' | 'none', string> = {
  synced:       'bg-green-900/40 text-green-400',
  drift:        'bg-yellow-900/40 text-yellow-400',
  deleted:      'bg-red-900/40 text-red-400',
  not_uploaded: 'bg-bg-main text-text-dim',
  error:        'bg-red-900/40 text-red-400',
  uploaded:     'bg-blue-900/40 text-blue-400',  // 업로드됨, 동기화 미확인
  none:         'bg-bg-main text-text-dim',       // 렌더 없음
}

const SYNC_LABEL: Record<string, string> = {
  synced: 'OK', drift: 'DRIFT', deleted: 'DEL', uploaded: 'UP', none: '—',
}

// ─── 페이지 ───────────────────────────────────────────

export default function YouTubeLineupPage({ params }: { params: Promise<{ series: string }> }) {
  const { series } = use(params)
  // 레지스트리에 없는 시리즈(폐기된 세력도감 등)는 없는 주소다
  if (!getSeriesById(series)) notFound()
  const seriesDef = getSeriesById(series)
  const [rows, setRows] = useState<EpisodeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Draft>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'registered' | 'unregistered'>('all')

  // 동기화 상태
  const [syncMap, setSyncMap] = useState<Record<string, Record<string, VariantSync>>>({})
  const [syncing, setSyncing] = useState(false)
  const [syncChecked, setSyncChecked] = useState(false)

  // 메타 푸시 확정 모달
  const [pushModal, setPushModal] = useState<PushModalState | null>(null)

  useEffect(() => {
    if (seriesDef) document.title = `${seriesDef.label} YouTube 편성 — Feel & Note BO`
  }, [seriesDef])

  const fetchAll = useCallback(() => {
    setLoading(true)
    fetch(`/api/${series}/youtube/status-all`)
      .then(r => r.json())
      .then(({ episodes }: { episodes: EpisodeRow[] }) => {
        setRows(episodes)
        const d: Draft = {}
        for (const ep of episodes) {
          d[ep.name] = ep.lineup
            ? {
                ...ep.lineup,
                shortsRelation: { ko: ep.lineup.shortsRelation?.ko ?? '', en: ep.lineup.shortsRelation?.en ?? '' },
              }
            : { ...EMPTY_META, shortsRelation: { ko: '', en: '' } }
        }
        setDraft(d)
        setDirty(new Set())
      })
      .finally(() => setLoading(false))
  }, [series])

  useEffect(fetchAll, [fetchAll])

  if (!seriesDef) return <div className="text-text-dim">시리즈를 찾을 수 없다.</div>

  // ─── 편성 편집 ─────────────────────────────────────

  const updateField = (name: string, updater: (m: EpisodeMeta) => EpisodeMeta) => {
    setDraft(prev => ({ ...prev, [name]: updater(prev[name]) }))
    setDirty(prev => new Set(prev).add(name))
  }

  const handleSaveAll = async () => {
    const targets = [...dirty]
    if (targets.length === 0) return
    setSaving(true)
    try {
      await Promise.all(targets.map(name =>
        fetch(`/api/${series}/youtube/lineup?episode=${name}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft[name]),
        })
      ))
      fetchAll()
    } finally { setSaving(false) }
  }

  const handleSaveOne = async (name: string) => {
    setSaving(true)
    try {
      await fetch(`/api/${series}/youtube/lineup?episode=${name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft[name]),
      })
      setDirty(prev => { const n = new Set(prev); n.delete(name); return n })
      setRows(prev => prev.map(r => r.name === name
        ? {
            ...r,
            lineup: {
              ...draft[name],
              shortsRelation: draft[name].shortsRelation
                ? { ...draft[name].shortsRelation }
                : undefined,
            },
          }
        : r
      ))
    } finally { setSaving(false) }
  }

  // ─── 동기화 ────────────────────────────────────────

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch(`/api/${series}/youtube/sync`)
      if (!res.ok) return
      const { results } = await res.json() as { results: { name: string; variants: VariantSync[] }[] }
      const map: Record<string, Record<string, VariantSync>> = {}
      for (const ep of results) {
        map[ep.name] = {}
        for (const v of ep.variants) map[ep.name][v.variant] = v
      }
      setSyncMap(map)
      setSyncChecked(true)
    } finally { setSyncing(false) }
  }

  const handlePurge = async () => {
    setSyncing(true)
    try {
      const res = await fetch(`/api/${series}/youtube/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purge' }),
      })
      if (!res.ok) return
      const { purged } = await res.json() as { purged: number }
      if (purged > 0) fetchAll()
      await handleSync()
    } finally { setSyncing(false) }
  }

  // 단일 variant — 미리보기 로드 후 모달 오픈
  const handlePush = async (episode: string, variant: string) => {
    setPushModal({ episode, scope: 'one', variant, loading: true, previews: null, pushing: false })
    try {
      const res = await fetch(`/api/${series}/youtube/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', episode, variant }),
      })
      if (!res.ok) {
        setPushModal(prev => prev ? { ...prev, loading: false, previews: [] } : null)
        return
      }
      const { previews } = await res.json() as { previews: VariantPreview[] }
      setPushModal(prev => prev ? { ...prev, loading: false, previews } : null)
    } catch {
      setPushModal(prev => prev ? { ...prev, loading: false, previews: [] } : null)
    }
  }

  // 전체 variant — 미리보기 로드 후 모달 오픈
  const handlePushAll = async (episode: string) => {
    setPushModal({ episode, scope: 'all', loading: true, previews: null, pushing: false })
    try {
      const res = await fetch(`/api/${series}/youtube/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview-all', episode }),
      })
      if (!res.ok) {
        setPushModal(prev => prev ? { ...prev, loading: false, previews: [] } : null)
        return
      }
      const { previews } = await res.json() as { previews: VariantPreview[] }
      setPushModal(prev => prev ? { ...prev, loading: false, previews } : null)
    } catch {
      setPushModal(prev => prev ? { ...prev, loading: false, previews: [] } : null)
    }
  }

  // 모달 확정 — 실제 푸시
  const handleConfirmPush = async () => {
    if (!pushModal) return
    setPushModal({ ...pushModal, pushing: true })
    try {
      const body = pushModal.scope === 'one'
        ? { action: 'push', episode: pushModal.episode, variant: pushModal.variant }
        : { action: 'push-all', episode: pushModal.episode }
      await fetch(`/api/${series}/youtube/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setPushModal(null)
      await handleSync()
    } catch {
      setPushModal(prev => prev ? { ...prev, pushing: false } : null)
    }
  }

  const handleCancelPush = () => setPushModal(null)

  const handleRemoveRecord = async (episode: string, variant: string) => {
    const res = await fetch(`/api/${series}/youtube/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', episode, variant }),
    })
    if (res.ok) { fetchAll(); handleSync() }
  }

  // ─── 필터링 ────────────────────────────────────────

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.name.includes(q) || r.nickname.includes(search)
    if (!matchSearch) return false
    if (filter === 'registered') return r.lineup !== null
    if (filter === 'unregistered') return r.lineup === null
    return true
  })

  const registeredCount = rows.filter(r => r.lineup !== null).length
  const uploadedCount = rows.filter(r => r.lineup?.uploads && Object.keys(r.lineup.uploads).length > 0).length

  // ─── 렌더링 ────────────────────────────────────────

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h1 className="text-xl font-bold">YouTube 편성</h1>
        <span className="text-xs text-text-secondary">
          {registeredCount} 등록 · {uploadedCount} 업로드 · {rows.length} 전체
        </span>
        <div className="flex items-center gap-2 ml-auto">
          {dirty.size > 0 && (
            <button onClick={handleSaveAll} disabled={saving} className={`${BTN_PRIMARY} ${saving ? 'opacity-50' : ''}`}>
              {saving ? '저장 중...' : `${dirty.size}건 저장`}
            </button>
          )}
          <button onClick={handlePurge} disabled={syncing} className={`${BTN_SECONDARY} ${syncing ? 'opacity-50' : ''}`}>
            {syncing ? '확인 중...' : '전체 갱신'}
          </button>
        </div>
      </div>

      {/* 필터 바 */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text" placeholder="검색..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-48 bg-bg-card border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:border-accent"
        />
        <div className="flex rounded overflow-hidden border border-border text-xs">
          {(['all', 'registered', 'unregistered'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-2.5 py-1 font-semibold ${
                filter === f ? 'bg-accent text-bg-main' : 'text-text-secondary hover:text-text-primary'
              }`}>
              {f === 'all' ? `전체 ${rows.length}` : f === 'registered' ? `등록 ${registeredCount}` : `미등록 ${rows.length - registeredCount}`}
            </button>
          ))}
        </div>
        {syncChecked && (
          <span className="text-[10px] text-text-dim">동기화 확인됨</span>
        )}
      </div>

      {loading ? (
        <div className="text-text-dim text-sm py-8 text-center">로딩...</div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-card text-text-secondary text-xs border-b border-border">
                <th className="text-left px-3 py-2 w-36">인물</th>
                <th className="text-left px-3 py-2">롱폼 제목 미리보기</th>
                <th className="text-center px-2 py-2 w-16">책수</th>
                <th className="text-left px-3 py-2 w-32">쇼츠 수식어 (KO)</th>
                <th className="text-left px-3 py-2 w-32">쇼츠 수식어 (EN)</th>
                <th className="text-center px-2 py-2 w-32">렌더</th>
                <th className="text-center px-2 py-2 w-32">YouTube</th>
                <th className="text-center px-2 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <LineupRow
                  key={row.name}
                  row={row}
                  series={series}
                  meta={draft[row.name]}
                  isDirty={dirty.has(row.name)}
                  saving={saving}
                  syncMap={syncMap[row.name]}
                  syncChecked={syncChecked}
                  onUpdate={(updater) => updateField(row.name, updater)}
                  onSave={() => handleSaveOne(row.name)}
                  onPush={(variant) => handlePush(row.name, variant)}
                  onPushAll={() => handlePushAll(row.name)}
                  onRemove={(variant) => handleRemoveRecord(row.name, variant)}
                />
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-text-dim text-xs py-8 text-center">
              {rows.length === 0 ? '에피소드 없음' : '검색 결과 없음'}
            </div>
          )}
        </div>
      )}

      {pushModal && (
        <PushConfirmModal
          state={pushModal}
          onConfirm={handleConfirmPush}
          onCancel={handleCancelPush}
        />
      )}
    </div>
  )
}

// ─── PushConfirmModal ─────────────────────────────────

// 활성 탭 — '__all__' 은 전체 보기, 그 외는 variant 키
const ALL_TAB = '__all__'

function PushConfirmModal({ state, onConfirm, onCancel }: {
  state: PushModalState
  onConfirm: () => void
  onCancel: () => void
}) {
  const { episode, scope, loading, previews, pushing } = state
  const hasPreviews = previews && previews.length > 0
  const anyDiff = previews?.some(p => (p.diffs?.length ?? 0) > 0)

  // 활성 탭 — 기본은 '전체'
  const [activeTab, setActiveTab] = useState<string>(ALL_TAB)
  useEffect(() => {
    // 미리보기가 새로 로드되면 전체 탭으로 리셋
    if (hasPreviews) setActiveTab(ALL_TAB)
  }, [hasPreviews])

  const activePreview = activeTab !== ALL_TAB
    ? (previews?.find(p => p.variant === activeTab) ?? null)
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-bg-card border border-border rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
          <h2 className="text-base font-bold text-text-primary">메타 푸시 확정</h2>
          <span className="text-xs text-text-dim">
            {episode} · {scope === 'all' ? '전체 variant' : `단일 variant`}
          </span>
          <button onClick={onCancel} disabled={pushing}
            className="ml-auto text-text-dim hover:text-text-primary text-lg leading-none">×</button>
        </div>

        {/* 탭 바 */}
        {!loading && hasPreviews && (
          <div className="flex items-center gap-1 px-5 pt-3 border-b border-border overflow-x-auto">
            {/* 전체 탭 */}
            <button
              onClick={() => setActiveTab(ALL_TAB)}
              className={`relative px-3 py-1.5 text-xs font-semibold rounded-t border-x border-t -mb-px ${
                activeTab === ALL_TAB
                  ? 'bg-bg-main border-border text-text-primary'
                  : 'bg-bg-card border-transparent text-text-dim hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              전체
              <span className="ml-1 text-text-dim font-mono">({previews!.length})</span>
            </button>
            {/* variant 탭들 */}
            {previews!.map((p) => {
              const sl = shortLabel(p.variant)
              const isActive = p.variant === activeTab
              const hasDiff = (p.diffs?.length ?? 0) > 0
              const hasError = !!p.error
              return (
                <button
                  key={p.variant}
                  onClick={() => setActiveTab(p.variant)}
                  className={`relative px-3 py-1.5 text-xs font-mono font-semibold rounded-t border-x border-t -mb-px ${
                    isActive
                      ? 'bg-bg-main border-border text-text-primary'
                      : 'bg-bg-card border-transparent text-text-dim hover:text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  {sl}
                  {hasError && <span className="ml-1 text-red-400">!</span>}
                  {!hasError && hasDiff && <span className="ml-1 text-yellow-400">●</span>}
                </button>
              )
            })}
          </div>
        )}

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="text-text-dim text-sm py-8 text-center">미리보기 불러오는 중...</div>
          )}
          {!loading && !hasPreviews && (
            <div className="text-error-text text-sm py-8 text-center">미리보기를 불러오지 못했다.</div>
          )}
          {/* 전체 탭 — 모든 PreviewCard 세로 나열, 각 카드에 variant 라벨 표시 */}
          {!loading && hasPreviews && activeTab === ALL_TAB && (
            <div className="space-y-4">
              {previews!.map((p) => (
                <div key={p.variant} className="border border-border rounded p-3 bg-bg-main/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`${TAG} bg-accent/20 text-accent`}>{shortLabel(p.variant)}</span>
                    {p.error && <span className="text-error-text text-xs">{p.error}</span>}
                    {!p.error && p.diffs && p.diffs.length === 0 && (
                      <span className="text-xs text-text-dim">변경사항 없음</span>
                    )}
                    {!p.error && p.diffs && p.diffs.length > 0 && (
                      <span className="text-xs text-yellow-400">변경: {p.diffs.join(', ')}</span>
                    )}
                  </div>
                  <PreviewCard preview={p} hideStatus />
                </div>
              ))}
            </div>
          )}
          {/* 단일 variant 탭 */}
          {!loading && activePreview && activeTab !== ALL_TAB && (
            <PreviewCard preview={activePreview} />
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center gap-2 px-5 py-3 border-t border-border bg-bg-main/50">
          {!loading && hasPreviews && !anyDiff && (
            <span className="text-xs text-text-dim">변경사항 없음 — 푸시해도 동일하다</span>
          )}
          {!loading && hasPreviews && anyDiff && (
            <span className="text-xs text-text-dim">
              변경 있는 탭: {previews!.filter(p => (p.diffs?.length ?? 0) > 0).map(p => shortLabel(p.variant)).join(', ')}
            </span>
          )}
          <div className="ml-auto flex gap-2">
            <button onClick={onCancel} disabled={pushing}
              className={`${BTN_SECONDARY} ${pushing ? 'opacity-50' : ''}`}>
              취소
            </button>
            <button onClick={onConfirm} disabled={loading || pushing || !hasPreviews}
              className={`${BTN_PRIMARY} ${(loading || pushing || !hasPreviews) ? 'opacity-50' : ''}`}>
              {pushing ? '푸시 중...' : '확정 푸시'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewCard({ preview, hideStatus = false }: { preview: VariantPreview; hideStatus?: boolean }) {
  const { ytSnippet, newSnippet, diffs, error } = preview
  const titleChanged = diffs?.includes('title')
  const descChanged = diffs?.includes('description')

  return (
    <div className="space-y-3">
      {!hideStatus && error && (
        <div className="text-error-text text-xs">{error}</div>
      )}
      {!hideStatus && !error && diffs && diffs.length === 0 && (
        <div className="text-xs text-text-dim">변경사항 없음 — 이 variant는 푸시해도 YouTube와 동일하다.</div>
      )}
      {!hideStatus && !error && diffs && diffs.length > 0 && (
        <div className="text-xs text-yellow-400">변경: {diffs.join(', ')}</div>
      )}

      {newSnippet && (
        <>
          {/* 제목 */}
          <div className="space-y-0.5">
            <div className="text-[10px] text-text-dim uppercase tracking-wider">제목</div>
            {ytSnippet && titleChanged && (
              <div className="text-xs text-red-400 line-through font-mono">{ytSnippet.title}</div>
            )}
            <div className={`text-xs font-mono ${titleChanged ? 'text-green-400' : 'text-text-primary'}`}>
              {newSnippet.title}
            </div>
          </div>

          {/* 설명 */}
          <div className="space-y-0.5">
            <div className="text-[10px] text-text-dim uppercase tracking-wider">
              설명 {descChanged && <span className="text-yellow-400">(변경)</span>}
            </div>
            {ytSnippet && descChanged && (
              <details className="text-[11px]">
                <summary className="text-red-400 cursor-pointer">현재 (펼치기)</summary>
                <pre className="text-red-400 font-mono whitespace-pre-wrap leading-snug max-h-60 overflow-y-auto bg-bg-main/30 p-2 rounded">
                  {ytSnippet.description}
                </pre>
              </details>
            )}
            <pre className={`text-[11px] font-mono whitespace-pre-wrap leading-snug max-h-80 overflow-y-auto bg-bg-main/30 p-2 rounded ${descChanged ? 'text-green-400' : 'text-text-primary'}`}>
              {newSnippet.description}
            </pre>
          </div>

          {/* 태그 */}
          {newSnippet.tags && newSnippet.tags.length > 0 && (
            <div className="space-y-0.5">
              <div className="text-[10px] text-text-dim uppercase tracking-wider">태그</div>
              <div className="flex flex-wrap gap-1">
                {newSnippet.tags.map((t, i) => (
                  <span key={i} className={`${TAG} bg-bg-card text-text-secondary`}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Row ─────────────────────────────────────────────

function LineupRow({ row, series, meta, isDirty, saving, syncMap, syncChecked, onUpdate, onSave, onPush, onPushAll, onRemove }: {
  row: EpisodeRow
  series: string
  meta: EpisodeMeta
  isDirty: boolean
  saving: boolean
  syncMap?: Record<string, VariantSync>
  syncChecked: boolean
  onUpdate: (updater: (m: EpisodeMeta) => EpisodeMeta) => void
  onSave: () => void
  onPush: (variant: string) => void
  onPushAll: () => void
  onRemove: (variant: string) => void
}) {
  const hasLineup = row.lineup !== null
  const uploads = row.lineup?.uploads ?? {}
  const [expanded, setExpanded] = useState(false)

  // drift가 있으면 자동 펼침
  const hasDrift = syncMap && Object.values(syncMap).some(v => v.status === 'drift' || v.status === 'deleted')

  // 신규 롱폼 타이틀 미리보기 — 다부면 totalBooks + part, 단일 부면 books.length
  const titleBookCount = row.partInfo ? row.partInfo.totalBooks : row.bookCount
  const titlePart = row.partInfo ? row.partInfo.part : null
  const titlePreview = row.bookCount > 0
    ? `[서재탐방] ${row.nickname}${koSubjectMarker(row.nickname)} 읽은 ${titleBookCount}권의 책${titlePart ? ` ${titlePart}부` : ''}`
    : '— 에피소드 데이터 없음'

  return (
    <>
      <tr className={`border-b border-border hover:bg-bg-hover/50 ${isDirty ? 'bg-accent/5' : ''}`}>
        {/* 인물 */}
        <td className="px-3 py-1.5">
          <Link href={`/${series}/${row.name}/youtube`} className="font-semibold text-text-primary hover:text-accent">
            {row.nickname}
          </Link>
          {!hasLineup && <span className={`${TAG} bg-warning/20 text-warning-text ml-1.5`}>NEW</span>}
        </td>
        {/* 롱폼 제목 미리보기 (자동) */}
        <td className="px-3 py-1.5">
          <span className="text-xs text-text-secondary truncate block" title={titlePreview}>
            {titlePreview}
          </span>
        </td>
        {/* 책수 */}
        <td className="px-2 py-1.5 text-center">
          {row.bookCount > 0 ? (
            <span className="text-xs text-text-secondary">
              {titleBookCount}{row.partInfo ? <span className="text-text-dim ml-0.5">({row.partInfo.part}/{row.partInfo.totalParts})</span> : null}
            </span>
          ) : (
            <span className="text-xs text-text-dim">—</span>
          )}
        </td>
        {/* 쇼츠 수식어 KO */}
        <td className="px-3 py-1.5">
          <input
            value={meta.shortsRelation?.ko ?? ''}
            onChange={e => onUpdate(m => ({
              ...m,
              shortsRelation: { ko: e.target.value, en: m.shortsRelation?.en ?? '' },
            }))}
            className="w-full bg-transparent border-b border-border focus:border-accent text-xs py-0.5 outline-none"
            placeholder="인생책..."
          />
        </td>
        {/* 쇼츠 수식어 EN */}
        <td className="px-3 py-1.5">
          <input
            value={meta.shortsRelation?.en ?? ''}
            onChange={e => onUpdate(m => ({
              ...m,
              shortsRelation: { ko: m.shortsRelation?.ko ?? '', en: e.target.value },
            }))}
            className="w-full bg-transparent border-b border-border focus:border-accent text-xs py-0.5 outline-none"
            placeholder="lifelong..."
          />
        </td>
        {/* 렌더 배지 */}
        <td className="px-2 py-1.5">
          <div className="flex justify-center gap-1">
            {row.variants.map(v => {
              const sl = shortLabel(v.key)
              return (
                <span key={v.key} title={v.hasVideo ? formatSize(v.videoSize) : '없음'}
                  className={`${TAG} ${v.hasVideo ? 'bg-green-900/40 text-green-400' : 'bg-bg-main text-text-dim'}`}>
                  {sl}
                </span>
              )
            })}
          </div>
        </td>
        {/* YouTube 상태 배지 — variant 키는 row.variants(렌더된 것) ∪ uploads 키(업로드된 것) */}
        <td className="px-2 py-1.5">
          <div className="flex justify-center gap-1">
            {(() => {
              const seen = new Set<string>()
              const keys: string[] = []
              for (const v of row.variants) { if (!seen.has(v.key)) { seen.add(v.key); keys.push(v.key) } }
              for (const k of Object.keys(uploads)) { if (!seen.has(k)) { seen.add(k); keys.push(k) } }
              return keys.map(vk => {
                const uploaded = !!uploads[vk]
                const sync = syncMap?.[vk]
                let status: string
                let label: string
                if (syncChecked && sync) {
                  status = sync.status
                  label = SYNC_LABEL[sync.status] ?? '?'
                } else if (uploaded) {
                  status = 'uploaded'
                  label = 'UP'
                } else {
                  status = 'none'
                  label = '—'
                }
                const sl = shortLabel(vk)
                return (
                  <span key={vk} title={uploaded ? `${sl} ${uploads[vk].videoId}` : sl}
                    className={`${TAG} ${SYNC_STYLE[status as keyof typeof SYNC_STYLE] ?? SYNC_STYLE.none} cursor-default`}>
                    {label}
                  </span>
                )
              })
            })()}
          </div>
        </td>
        {/* 액션 */}
        <td className="px-2 py-1.5 text-center">
          <div className="flex items-center justify-center gap-1">
            {isDirty && (
              <button onClick={onSave} disabled={saving}
                className="text-accent text-xs font-semibold hover:underline disabled:opacity-50">
                저장
              </button>
            )}
            {Object.keys(uploads).length > 0 && !isDirty && (
              // 동기화 확인 후 삭제된 variant만 남은 경우 숨김
              !syncChecked || Object.keys(uploads).some(vk => syncMap?.[vk]?.status !== 'deleted')
            ) && (
              <button onClick={onPushAll}
                className="text-accent text-xs font-semibold hover:underline">
                메타 푸시
              </button>
            )}
            {hasDrift && !isDirty && (
              <button onClick={() => setExpanded(!expanded)}
                className="text-yellow-400 text-xs font-semibold hover:underline">
                {expanded ? '접기' : '상세'}
              </button>
            )}
          </div>
        </td>
      </tr>
      {/* 확장 행: drift/deleted 상세 */}
      {expanded && syncMap && (
        <tr className="border-b border-border bg-bg-main/50">
          <td colSpan={8} className="px-6 py-2">
            <div className="space-y-1.5">
              {Object.entries(syncMap).filter(([, v]) => v.status === 'drift' || v.status === 'deleted').map(([vk, v]) => (
                <div key={vk} className="flex items-start gap-3 text-xs">
                  <span className={`${TAG} ${SYNC_STYLE[v.status]} shrink-0 mt-0.5`}>
                    {shortLabel(vk)}
                  </span>
                  {v.status === 'drift' && (
                    <>
                      <div className="flex-1 space-y-0.5">
                        {v.diffs?.includes('title') && (
                          <div>
                            <span className="text-text-dim">제목:</span>{' '}
                            <span className="text-red-400 line-through">{v.ytTitle}</span>{' '}
                            <span className="text-green-400">→ {v.localTitle}</span>
                          </div>
                        )}
                      </div>
                      <button onClick={() => onPush(vk)}
                        className="text-accent text-xs font-semibold hover:underline shrink-0">
                        메타 푸시
                      </button>
                    </>
                  )}
                  {v.status === 'deleted' && (
                    <>
                      <span className="text-red-400 flex-1">YouTube에서 삭제됨 ({v.videoId})</span>
                      <button onClick={() => onRemove(vk)}
                        className="text-red-400 text-xs font-semibold hover:underline shrink-0">
                        기록 제거
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
