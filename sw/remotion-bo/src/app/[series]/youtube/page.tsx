'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import { getSeriesById } from '@/lib/series-registry'

// ─── 타입 ─────────────────────────────────────────────

type UploadRecord = { videoId: string; uploadedAt: string }

type EpisodeMeta = {
  hook: { ko: string; en: string }
  privacyStatus: 'private' | 'unlisted' | 'public'
  uploads?: Record<string, UploadRecord>
}

type VariantStatus = {
  lang: 'ko' | 'en'
  type: 'longform' | 'shorts'
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
}

type SyncStatus = 'synced' | 'drift' | 'deleted' | 'not_uploaded' | 'error'

type VariantSync = {
  variant: string
  status: SyncStatus
  videoId?: string
  diffs?: string[]
  ytTitle?: string
  ytPrivacy?: string
  localTitle?: string
  localPrivacy?: string
}

type Draft = Record<string, EpisodeMeta>

// ─── 상수 ─────────────────────────────────────────────

const BTN = 'px-3 py-1 rounded text-sm font-semibold'
const BTN_PRIMARY = `bg-accent text-bg-main ${BTN} hover:bg-accent-hover`
const BTN_SECONDARY = `bg-bg-card border border-border ${BTN} hover:bg-bg-hover`
const TAG = 'text-[9px] px-1 py-px rounded font-mono'

const VARIANT_KEYS = ['ko-longform', 'ko-shorts', 'en-longform', 'en-shorts'] as const

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}G`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}M`
  return `${(bytes / 1024).toFixed(0)}K`
}

const EMPTY_META: EpisodeMeta = { hook: { ko: '', en: '' }, privacyStatus: 'private' }

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

  useEffect(() => {
    if (seriesDef) document.title = `${seriesDef.label} YouTube 편성 — Remotion BO`
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
            ? { ...ep.lineup, hook: { ...ep.lineup.hook } }
            : { ...EMPTY_META, hook: { ko: '', en: '' } }
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
        ? { ...r, lineup: { ...draft[name], hook: { ...draft[name].hook } } }
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

  const handlePush = async (episode: string, variant: string) => {
    const res = await fetch(`/api/${series}/youtube/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'push', episode, variant }),
    })
    if (res.ok) handleSync()
  }

  const handlePushAll = async (episode: string) => {
    setSyncing(true)
    try {
      await fetch(`/api/${series}/youtube/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'push-all', episode }),
      })
      await handleSync()
    } finally { setSyncing(false) }
  }

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
          <button onClick={handleSync} disabled={syncing} className={`${BTN_SECONDARY} ${syncing ? 'opacity-50' : ''}`}>
            {syncing ? '확인 중...' : '동기화 확인'}
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
              className={`px-2.5 py-1 font-semibold transition-colors ${
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
                <th className="text-left px-3 py-2">훅 (KO)</th>
                <th className="text-left px-3 py-2">훅 (EN)</th>
                <th className="text-center px-2 py-2 w-20">공개</th>
                <th className="text-center px-2 py-2 w-32">렌더</th>
                <th className="text-center px-2 py-2 w-32">YouTube</th>
                <th className="text-center px-2 py-2 w-16"></th>
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

  return (
    <>
      <tr className={`border-b border-border hover:bg-bg-hover/50 transition-colors ${isDirty ? 'bg-accent/5' : ''}`}>
        {/* 인물 */}
        <td className="px-3 py-1.5">
          <Link href={`/${series}/${row.name}/youtube`} className="font-semibold text-text-primary hover:text-accent transition-colors">
            {row.nickname}
          </Link>
          {!hasLineup && <span className={`${TAG} bg-warning/20 text-warning-text ml-1.5`}>NEW</span>}
        </td>
        {/* 훅 KO */}
        <td className="px-3 py-1.5">
          <input
            value={meta.hook.ko}
            onChange={e => onUpdate(m => ({ ...m, hook: { ...m.hook, ko: e.target.value } }))}
            className="w-full bg-transparent border-b border-border focus:border-accent text-xs py-0.5 outline-none"
            placeholder="한국어 훅..."
          />
        </td>
        {/* 훅 EN */}
        <td className="px-3 py-1.5">
          <input
            value={meta.hook.en}
            onChange={e => onUpdate(m => ({ ...m, hook: { ...m.hook, en: e.target.value } }))}
            className="w-full bg-transparent border-b border-border focus:border-accent text-xs py-0.5 outline-none"
            placeholder="English hook..."
          />
        </td>
        {/* 공개 상태 */}
        <td className="px-2 py-1.5 text-center">
          <select
            value={meta.privacyStatus}
            onChange={e => onUpdate(m => ({ ...m, privacyStatus: e.target.value as EpisodeMeta['privacyStatus'] }))}
            className="bg-transparent text-xs outline-none cursor-pointer text-center"
          >
            <option value="private">private</option>
            <option value="unlisted">unlisted</option>
            <option value="public">public</option>
          </select>
        </td>
        {/* 렌더 배지 */}
        <td className="px-2 py-1.5">
          <div className="flex justify-center gap-1">
            {row.variants.map(v => {
              const key = `${v.lang}-${v.type === 'longform' ? 'L' : 'S'}`
              return (
                <span key={key} title={v.hasVideo ? formatSize(v.videoSize) : '없음'}
                  className={`${TAG} ${v.hasVideo ? 'bg-green-900/40 text-green-400' : 'bg-bg-main text-text-dim'}`}>
                  {key.toUpperCase()}
                </span>
              )
            })}
          </div>
        </td>
        {/* YouTube 상태 배지 */}
        <td className="px-2 py-1.5">
          <div className="flex justify-center gap-1">
            {VARIANT_KEYS.map(vk => {
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
              const shortKey = vk.replace('-longform', '-L').replace('-shorts', '-S').toUpperCase()
              return (
                <span key={vk} title={uploaded ? `${shortKey} ${uploads[vk].videoId}` : shortKey}
                  className={`${TAG} ${SYNC_STYLE[status as keyof typeof SYNC_STYLE] ?? SYNC_STYLE.none} cursor-default`}>
                  {label}
                </span>
              )
            })}
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
          <td colSpan={7} className="px-6 py-2">
            <div className="space-y-1.5">
              {Object.entries(syncMap).filter(([, v]) => v.status === 'drift' || v.status === 'deleted').map(([vk, v]) => (
                <div key={vk} className="flex items-start gap-3 text-xs">
                  <span className={`${TAG} ${SYNC_STYLE[v.status]} shrink-0 mt-0.5`}>
                    {vk.replace('-longform', '-L').replace('-shorts', '-S').toUpperCase()}
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
                        {v.diffs?.includes('privacy') && (
                          <div>
                            <span className="text-text-dim">공개:</span>{' '}
                            <span className="text-red-400">{v.ytPrivacy}</span>{' '}
                            <span className="text-green-400">→ {v.localPrivacy}</span>
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
