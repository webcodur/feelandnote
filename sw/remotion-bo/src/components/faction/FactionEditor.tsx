'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { FactionScript, FactionGroup, FactionTrack, FactionPerson } from '@/lib/faction-types'
import { factionVoiceFile } from '@/lib/faction-voice'
import { totalSec, cueCount, formatMmss } from './timing'

/** 음악 파일 길이(초) 측정 — 브라우저 Audio 메타데이터 */
function measureDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const a = new Audio()
    a.preload = 'metadata'
    a.onloadedmetadata = () => resolve(a.duration)
    a.onerror = () => reject(new Error('음악 메타데이터 로드 실패'))
    a.src = url
  })
}
import { Plus, Save, Eye, Upload, Film, ImageIcon, Mic, ChevronsUpDown, ChevronsDownUp } from './icons'
import { FactionGroupEditor } from './FactionGroupEditor'
import { FactionCopyButton } from './FactionCopyButton'
import { FactionPreview } from './FactionPreview'
import { FactionImagePool } from './FactionImagePool'
import { collectUsedImages } from './usedImages'
import { TaskPanel } from '@/components/TaskPanel'
import { UiLabel } from '@/components/ui-label'
import { FactionVoiceProvider, type FactionVoiceMeta } from './FactionVoiceContext'
import { FactionVoiceModal, type FactionVoiceOptions } from './FactionVoiceModal'
import { FactionQuoteModeModal } from './FactionQuoteModeModal'
import { FactionHeroPicker, type HeroCandidate } from './FactionHeroPicker'
import { FactionYouTubePanel } from './FactionYouTubePanel'

const EMPTY_GROUP: FactionGroup = { name: '', tagline: '', color: '#92400e', people: [] }

/** 쇼츠 편 묶음 — 세력을 편별로 그룹지어 보여준다. key 0 = 편 미지정(모든 편 공통) */
const PART_SECTIONS: { key: number; label: string; hint: string }[] = [
  { key: 0, label: '모든 편 공통', hint: '쇼츠 모든 편에 노출' },
  { key: 1, label: '1편', hint: '1편 쇼츠에만' },
  { key: 2, label: '2편', hint: '2편 쇼츠에만' },
]

export function FactionEditor({ series, name }: { series: string; name: string }) {
  const [script, setScript] = useState<FactionScript | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showPool, setShowPool] = useState(false)
  const [showYouTube, setShowYouTube] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [musicList, setMusicList] = useState<string[]>([])
  const [sfxList, setSfxList] = useState<string[]>([])
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [quoteModeOpen, setQuoteModeOpen] = useState(false)
  const [voiceFiles, setVoiceFiles] = useState<FactionVoiceMeta[]>([])
  const [regeneratingFile, setRegeneratingFile] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  // 편 묶음(공통·1편·2편) 접기 상태 — key=묶음 번호
  const [collapsedParts, setCollapsedParts] = useState<Record<number, boolean>>({})
  const musicRef = useRef<HTMLInputElement | null>(null)
  const scriptRef = useRef<FactionScript | null>(null)
  scriptRef.current = script

  // 에피소드 로드
  useEffect(() => {
    fetch(`/api/${series}/episodes/${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then((data: FactionScript) => {
        setScript({ ...data, groups: data.groups ?? [] })
        setDirty(false)
      })
      .catch(() => setScript({ title: name, groups: [] }))
  }, [series, name])

  // 음악 목록 로드
  const loadMusic = useCallback(() => {
    fetch(`/api/${series}/faction-music`)
      .then(r => r.json())
      .then(d => setMusicList(Array.isArray(d) ? d : []))
      .catch(() => setMusicList([]))
  }, [series])

  useEffect(() => { loadMusic() }, [loadMusic])

  // 효과음 목록 로드
  const loadSfx = useCallback(() => {
    fetch(`/api/${series}/faction-sfx`)
      .then(r => r.json())
      .then(d => setSfxList(Array.isArray(d) ? d : []))
      .catch(() => setSfxList([]))
  }, [series])

  useEffect(() => { loadSfx() }, [loadSfx])

  // 음성 파일 목록 로드 — 인물별 음성 존재 여부·길이 판정용
  const loadVoices = useCallback(() => {
    fetch(`/api/${series}/faction-voice/${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(d => setVoiceFiles(Array.isArray(d?.files) ? d.files : []))
      .catch(() => setVoiceFiles([]))
  }, [series, name])

  useEffect(() => { loadVoices() }, [loadVoices])

  useEffect(() => {
    if (script) document.title = `${script.title || name} — 세력도`
  }, [script, name])

  // 루트 state 갱신 헬퍼
  const update = useCallback((patch: Partial<FactionScript>) => {
    setScript(prev => (prev ? { ...prev, ...patch } : prev))
    setDirty(true)
  }, [])

  const updateGroups = useCallback((groups: FactionGroup[]) => update({ groups }), [update])

  // 저장
  const save = useCallback(async () => {
    const current = scriptRef.current
    if (!current) return
    setSaving(true)
    try {
      const res = await fetch(`/api/${series}/episodes/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(current),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? res.statusText)
      }
      setDirty(false)
    } catch (e) {
      alert('저장 실패: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }, [series, name])

  // Ctrl+S 저장
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (dirty && !saving) save()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dirty, saving, save])

  // 영상 렌더 — 디스크의 최신 데이터로 렌더하므로 변경분은 먼저 저장한다.
  const render = useCallback(async () => {
    if (scriptRef.current && dirty) await save()
    setRendering(true)
    try {
      const res = await fetch(`/api/${series}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode: name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) alert('렌더 시작 실패: ' + (data.error ?? res.statusText))
    } catch (e) {
      alert('렌더 시작 실패: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setRendering(false)
    }
  }, [series, name, dirty, save])

  // 음성 생성 트리거 — 디스크 최신 데이터 기준이므로 변경분을 먼저 저장한다.
  // only 지정 시 그 인물(파일명)만 재생성, 미지정이면 에피소드 전체.
  // engine·normalize·force 는 모달 옵션. 미지정 시 기본(gemini·normalize on·force on).
  type TriggerOpts = { only?: string; engine?: string; normalize?: boolean; force?: boolean; normalizeOnly?: boolean }
  const triggerVoice = useCallback(async (opts: TriggerOpts = {}) => {
    if (scriptRef.current && dirty) await save()
    try {
      const body: Record<string, unknown> = { episode: name }
      if (opts.only) body.only = opts.only
      if (opts.engine) body.engine = opts.engine
      if (opts.normalize !== undefined) body.normalize = opts.normalize
      if (opts.force !== undefined) body.force = opts.force
      if (opts.normalizeOnly) body.normalizeOnly = true
      const res = await fetch(`/api/${series}/faction-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) alert('음성 생성 시작 실패: ' + (data.error ?? res.statusText))
    } catch (e) {
      alert('음성 생성 시작 실패: ' + (e instanceof Error ? e.message : String(e)))
    }
  }, [series, name, dirty, save])

  // 헤더 버튼 모달의 생성 콜백 — 옵션을 담아 전체/누락분 생성.
  const generateVoice = useCallback(
    (o: FactionVoiceOptions) => triggerVoice({ only: o.only, engine: o.engine, normalize: o.normalize, force: o.force }),
    [triggerVoice],
  )

  // 인물 한 명 음성 재생성 (행 버튼). 생성 후 잠시 뒤 목록 갱신해 길이·존재 반영.
  const regenerateVoice = useCallback(async (file: string) => {
    setRegeneratingFile(file)
    try {
      await triggerVoice({ only: file.replace(/\.wav$/i, '') })
      // 백그라운드 task라 완료 시점을 알 수 없다 — 잠시 뒤 목록만 갱신.
      setTimeout(loadVoices, 4000)
    } finally {
      setRegeneratingFile(null)
    }
  }, [triggerVoice, loadVoices])

  // 음성 길이 일괄 동기화 — 디스크 음원의 실제 길이를 다시 읽어 모든 인물 quoteDuration 에 반영한다.
  // 터미널 `voice:faction --update-json` 의 화면 버튼판. 위치 변경·외부 음원 교체 등으로 길이가
  // 실제 음원과 어긋났을 때 한 번에 정정한다. 변경분은 dirty 로 표시되며 저장(Ctrl+S)해야 디스크에 남는다.
  const syncVoiceDurations = useCallback(async () => {
    const cur = scriptRef.current
    if (!cur) return
    setSyncing(true)
    try {
      const d = await fetch(`/api/${series}/faction-voice/${encodeURIComponent(name)}`).then(r => r.json())
      const files: FactionVoiceMeta[] = Array.isArray(d?.files) ? d.files : []
      const byFile = new Map(files.map(v => [v.file, v]))
      let changed = 0
      const fix = (p: FactionPerson, gi: number, pi: number, solo: boolean, ci?: number): FactionPerson => {
        const meta = byFile.get(factionVoiceFile(gi, pi, solo, ci))
        if (meta && meta.duration > 0 && Math.abs((p.quoteDuration ?? 0) - meta.duration) > 0.05) {
          changed++
          return { ...p, quoteDuration: meta.duration }
        }
        return p
      }
      const groups = cur.groups.map((g, gi) => {
        const solo = !!g.solo
        if (g.clusters?.length) {
          return { ...g, clusters: g.clusters.map((c, ci) => ({ ...c, people: c.people.map((p, pi) => fix(p, gi, pi, solo, ci)) })) }
        }
        return { ...g, people: (g.people ?? []).map((p, pi) => fix(p, gi, pi, solo, undefined)) }
      })
      setVoiceFiles(files)
      if (changed > 0) {
        update({ groups })
        alert(`음성 길이 ${changed}개를 실제 음원에 맞췄습니다. 저장(Ctrl+S)으로 반영하세요.`)
      } else {
        alert('모든 음성 길이가 이미 실제 음원과 일치합니다.')
      }
    } catch (e) {
      alert('음성 길이 동기화 실패: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSyncing(false)
    }
  }, [series, name, update])

  // 음성 재생 URL — 인물 파일명 기준
  const voiceUrl = useCallback(
    (file: string) => `/api/${series}/faction-voice/${encodeURIComponent(name)}/${encodeURIComponent(file)}`,
    [series, name],
  )

  // 파일명 → 메타 맵 (rows에서 존재·길이 조회)
  const voiceByFile = (() => {
    const m = new Map<string, FactionVoiceMeta>()
    for (const v of voiceFiles) m.set(v.file, v)
    return m
  })()

  // 배경음악 트랙 — script.tracks 우선, 없으면 legacy music 한 곡을 트랙으로 본다
  const tracks: FactionTrack[] = script?.tracks?.length
    ? script.tracks
    : script?.music
      ? [{ file: script.music }]
      : []
  const musicUrl = useCallback(
    (file: string) => `/api/${series}/faction-music/${encodeURIComponent(file)}`,
    [series],
  )
  // 트랙 목록 갱신 — 항상 tracks로 일원화하고 legacy music은 비운다
  const setTracks = useCallback(
    (next: FactionTrack[]) => update({ tracks: next.length ? next : undefined, music: undefined }),
    [update],
  )
  // 곡 추가 — 길이를 측정해 함께 저장 (최신 script 기준으로 누적)
  const addTrack = useCallback(async (file: string) => {
    if (!file) return
    let durationSec: number | undefined
    try { durationSec = Math.round(await measureDuration(musicUrl(file))) } catch { /* 측정 실패 시 길이 없이 추가 */ }
    const cur = scriptRef.current
    const curTracks: FactionTrack[] = cur?.tracks?.length
      ? cur.tracks
      : cur?.music ? [{ file: cur.music }] : []
    update({ tracks: [...curTracks, { file, durationSec }], music: undefined })
  }, [musicUrl, update])
  const moveTrack = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= tracks.length) return
    const next = [...tracks]
    ;[next[i], next[j]] = [next[j], next[i]]
    setTracks(next)
  }
  const removeTrack = (i: number) => setTracks(tracks.filter((_, idx) => idx !== i))
  // 곡 음량 배율(0~1) 변경 — 1(원음)이면 필드를 지워 data.json 을 깔끔히 둔다(렌더가 미지정=원음 처리).
  const setTrackVolume = (i: number, volume: number) =>
    setTracks(tracks.map((t, idx) => (idx === i ? { ...t, volume: volume === 1 ? undefined : volume } : t)))

  // ── 시작·마무리 화면 인물(heroes) 후보 — slug 있는 인물만(셀럽 DB 연동). 썸네일용 image 포함 ──
  const heroCandidates: HeroCandidate[] = []
  for (const g of script?.groups ?? []) {
    // 세력 로고도 시작 화면에 넣을 수 있게 후보로 — slug 'logo:<이미지>' 로 식별. logo 없으면 titleArt(타이틀 로고아트) 사용
    const logoImg = g.logo ?? g.titleArt
    if (logoImg) heroCandidates.push({ slug: `logo:${logoImg}`, name: `${g.name} 로고`, image: logoImg })
    const ppl = g.clusters?.length ? g.clusters.flatMap(c => c.people) : g.people
    for (const p of ppl) if (p.slug) heroCandidates.push({ slug: p.slug, name: p.name, image: p.image })
  }

  // 길이 미측정 트랙 자동 보정 — 곡 길이가 없으면 영상에서 순차 재생이 안 되므로 채워둔다
  useEffect(() => {
    const missing = (script?.tracks ?? []).filter(t => t.file && (t.durationSec == null || t.durationSec <= 0))
    if (!missing.length) return
    let cancelled = false
    ;(async () => {
      const measured: Record<string, number> = {}
      for (const t of missing) {
        try { measured[t.file] = Math.round(await measureDuration(musicUrl(t.file))) } catch { /* skip */ }
      }
      if (cancelled || !Object.keys(measured).length) return
      const cur = scriptRef.current
      if (!cur?.tracks) return
      update({
        tracks: cur.tracks.map(t =>
          t.durationSec == null && measured[t.file] != null ? { ...t, durationSec: measured[t.file] } : t,
        ),
      })
    })()
    return () => { cancelled = true }
  }, [script?.tracks, musicUrl, update])

  // 음악 업로드 — 저장 후 트랙으로 추가(길이 측정 포함)
  const uploadMusic = async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/${series}/faction-music`, { method: 'POST', body: form })
    const data = await res.json()
    if (res.ok && data.file) {
      loadMusic()
      await addTrack(data.file)
    } else {
      alert('음악 업로드 실패: ' + (data.error ?? ''))
    }
  }

  if (!script) return <div className="p-6 text-text-dim">불러오는 중...</div>

  const groups = script.groups ?? []
  const usedImages = collectUsedImages(script)

  // 세력 조작
  const setGroup = (i: number, g: FactionGroup) => updateGroups(groups.map((x, idx) => (idx === i ? g : x)))
  const deleteGroup = (i: number) => {
    if (!confirm('이 세력을 삭제하시겠습니까?')) return
    updateGroups(groups.filter((_, idx) => idx !== i))
  }
  // 위/아래 이동은 같은 묶음 안에서만 — 영상 제외(재료)끼리, 활성 세력은 같은 편끼리
  const moveGroupInPart = (i: number, dir: -1 | 1) => {
    const cur = groups[i]
    const inBucket = (g: FactionGroup) =>
      !!g.disabled === !!cur.disabled && (cur.disabled || (g.part ?? 0) === (cur.part ?? 0))
    const sameIdx = groups.map((g, idx) => ({ idx, g })).filter(x => inBucket(x.g)).map(x => x.idx)
    const pos = sameIdx.indexOf(i)
    const target = sameIdx[pos + dir]
    if (target === undefined) return
    const next = [...groups]
    ;[next[i], next[target]] = [next[target], next[i]]
    updateGroups(next)
  }
  const addGroup = () => updateGroups([...groups, { ...EMPTY_GROUP, people: [] }])

  // 편별 텍스트 한 줄 — part 0(공통)은 commonKey 값, 편(1·2)은 byPartKey[part] 값을 편집한다.
  // 공통일 때만 영문(enKey) 칸을 곁들인다(편별 영문은 없음).
  const partTextField = (
    part: number,
    label: string,
    keys: { common: keyof FactionScript; byPart: keyof FactionScript; en?: keyof FactionScript },
  ) => {
    const byPartObj = (script![keys.byPart] as Record<number, string> | undefined) ?? {}
    const val = part === 0 ? ((script![keys.common] as string | undefined) ?? '') : (byPartObj[part] ?? '')
    const setVal = (v: string) => {
      if (part === 0) { update({ [keys.common]: v || undefined } as Partial<FactionScript>); return }
      const nx = { ...byPartObj }
      if (v) nx[part] = v; else delete nx[part]
      update({ [keys.byPart]: Object.keys(nx).length ? nx : undefined } as Partial<FactionScript>)
    }
    return (
      <div className="flex items-center gap-2">
        <label className="w-16 shrink-0 text-xs text-text-dim">{label} -</label>
        <input
          type="text"
          placeholder={part === 0 ? label : `이 편 ${label} (비우면 공통)`}
          value={val}
          onChange={e => setVal(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
        />
        {part === 0 && keys.en && (
          <input
            type="text"
            placeholder={`EN ${label} (영문)`}
            value={(script![keys.en] as string | undefined) ?? ''}
            onChange={e => update({ [keys.en!]: e.target.value || undefined } as Partial<FactionScript>)}
            className="min-w-0 flex-1 rounded-md border border-border/60 bg-bg-card/50 px-2 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none"
          />
        )}
      </div>
    )
  }

  return (
    <FactionVoiceProvider value={{ byFile: voiceByFile, voiceUrl, regenerate: regenerateVoice, regeneratingFile, reload: loadVoices, episodeName: name, series }}>
    <div className="relative pb-12">
      <UiLabel ko="Faction 편집" code="FactionEditor" />
      {/* 상단 바 */}
      <div className="mb-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <Link href={`/${series}`} className="text-sm text-text-secondary hover:text-accent">← 목록</Link>
          <span className="ml-auto text-xs text-text-secondary">
            총 {formatMmss(totalSec(script))} · 컷 {cueCount(script)}개
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {/* 제목 + 제목(영문) — 한 줄 나란히 */}
          <div className="flex items-center gap-2">
            <label className="w-20 shrink-0 text-xs text-text-dim">제목 -</label>
            <input
              type="text"
              placeholder="제목"
              value={script.title}
              onChange={e => update({ title: e.target.value })}
              className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-bold focus:border-accent focus:outline-none"
            />
            <label className="w-12 shrink-0 text-xs text-text-dim">(영문) -</label>
            <input
              type="text"
              placeholder="EN 제목 (영문)"
              value={script.titleEn ?? ''}
              onChange={e => update({ titleEn: e.target.value })}
              className="min-w-0 flex-1 rounded-md border border-border/60 bg-bg-card/50 px-3 py-2 text-xs text-text-secondary focus:border-accent focus:outline-none"
            />
          </div>
          {/* 부제는 아래 편 묶음(공통·1편·2편)에서 편마다 다룬다 */}
          {/* 인물 전환효과 — 세로 쇼츠 인물 사진 모션 */}
          <div className="flex items-center gap-2">
            <label className="w-20 shrink-0 text-xs text-text-dim">전환효과 -</label>
            <select
              value={script.transition ?? 'zoomout'}
              onChange={e => update({ transition: e.target.value as FactionScript['transition'] })}
              className="rounded-md border border-border bg-bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
            >
              <option value="auto">자동 (인물마다 번갈아)</option>
              <option value="zoomout">줌 아웃</option>
              <option value="zoomin">줌 인</option>
              <option value="kenburns">확대하며 위로 이동</option>
              <option value="slideLeft">슬라이드 (오른쪽에서 등장)</option>
              <option value="slideRight">슬라이드 (왼쪽에서 등장)</option>
              <option value="glitch">TV 지직거림</option>
              <option value="tear">찢기 (가운데 갈라짐)</option>
              <option value="crt">옛 TV 켜지듯</option>
              <option value="zoompunch">확 다가오기</option>
              <option value="whip">빠르게 스쳐 지나기</option>
              <option value="filmburn">필름 타들어가듯</option>
              <option value="pixelate">모자이크로 흩어지기</option>
              <option value="shutter">블라인드 열리기</option>
            </select>
            <span className="text-xs text-text-dim">세로 쇼츠 인물 사진 움직임</span>
          </div>
          {/* 마무리 — 마지막 대사 후 대기 · 종료 화면 대기 · 페이드. 대사 끝나면 줌 멈추고 대기, (종료 화면 쓰면) 종료 화면 대기 후 검정으로 종료 */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="w-20 shrink-0 text-xs text-text-dim">마무리 -</label>
            <span className="text-xs text-text-dim">대사 후 대기</span>
            <input
              type="number" min={0} step={0.5}
              value={script.endHoldSec ?? ''} placeholder="4"
              onChange={e => update({ endHoldSec: e.target.value === '' ? undefined : Number(e.target.value) })}
              className="w-16 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
            />
            <span className="text-xs text-text-dim">초 · 종료 화면 대기</span>
            <input
              type="number" min={0} step={0.5}
              value={script.outroHoldSec ?? ''} placeholder="2.5"
              onChange={e => update({ outroHoldSec: e.target.value === '' ? undefined : Number(e.target.value) })}
              className="w-16 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
            />
            <span className="text-xs text-text-dim">초 · 페이드아웃</span>
            <input
              type="number" min={0} step={0.5}
              value={script.endFadeSec ?? ''} placeholder="3"
              onChange={e => update({ endFadeSec: e.target.value === '' ? undefined : Number(e.target.value) })}
              className="w-16 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
            />
            <span className="text-xs text-text-dim">초 · 종료 화면 대기는 시작=끝 화면 켤 때만 적용. 페이드아웃은 마지막에 보이는 화면 위에서 (기본 4 / 2.5 / 3)</span>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* ── 배경음악 카드 ── 곡 / 편별 / 대사 중 음량 + 업로드 */}
          <div className="w-full space-y-2 rounded-lg border border-border bg-bg-card/40 p-3">
            <div className="text-xs font-semibold text-text-secondary">배경음악</div>

            {/* 공통 곡 — 롱폼, 그리고 편별 BGM 미지정 편에 쓰인다 */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-24 shrink-0 text-xs text-text-dim">공통 곡</span>
              {tracks.map((t, i) => (
                <span key={i} className="flex items-center gap-1 rounded-md border border-border bg-bg-card px-2 py-1 text-xs">
                  <span className="text-text-dim">{i + 1}.</span>
                  <span className="max-w-[11rem] truncate" title={t.file}>{t.file}</span>
                  <span className="text-text-dim">{t.durationSec ? formatMmss(t.durationSec) : '측정중…'}</span>
                  <span className="flex items-center gap-1 border-l border-border pl-1.5" title="이 곡 음량. 100%가 원음">
                    <input type="range" min={0} max={1} step={0.05} value={t.volume ?? 1} onChange={e => setTrackVolume(i, Number(e.target.value))} className="w-16 accent-accent" />
                    <span className="w-9 text-right font-mono text-[10px] text-text-secondary">{Math.round((t.volume ?? 1) * 100)}%</span>
                  </span>
                  <button onClick={() => moveTrack(i, -1)} disabled={i === 0} className="px-0.5 text-text-secondary hover:text-accent disabled:opacity-30" title="앞으로">↑</button>
                  <button onClick={() => moveTrack(i, 1)} disabled={i === tracks.length - 1} className="px-0.5 text-text-secondary hover:text-accent disabled:opacity-30" title="뒤로">↓</button>
                  <button onClick={() => removeTrack(i)} className="px-0.5 text-danger-text hover:underline" title="제거">×</button>
                </span>
              ))}
              {tracks.length === 0 && <span className="text-xs text-text-dim">없음</span>}
              <select value="" onChange={e => { addTrack(e.target.value); e.target.value = '' }} className="rounded-md border border-border bg-bg-card px-2 py-1 text-xs">
                <option value="">+ 곡 추가</option>
                {musicList.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {tracks.length > 1 && (
                <span className="text-[10px] text-text-dim">합 {formatMmss(tracks.reduce((s, t) => s + (t.durationSec ?? 0), 0))} · 영상 {formatMmss(totalSec(script))}</span>
              )}
            </div>

            {/* 편별 BGM은 아래 편 묶음(1편·2편)에서 다룬다. 여기 공통 곡은 편별 미지정 편에 쓰인다 */}

            {/* 대사 중 음량(덕킹) + 업로드 */}
            <div className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-xs text-text-dim">대사 중 음량</span>
              <input type="range" min={0} max={1} step={0.05} value={script.musicDuckVolume ?? 1} onChange={e => { const v = Number(e.target.value); update({ musicDuckVolume: v === 1 ? undefined : v }) }} className="w-24 accent-accent" />
              <span className="w-9 text-right font-mono text-[10px] text-text-secondary">{Math.round((script.musicDuckVolume ?? 1) * 100)}%</span>
              <span className="text-[10px] text-text-dim">대사(음성) 나올 때만 낮춤 · 평소 100%</span>
              <input ref={musicRef} type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadMusic(f); e.target.value = '' }} />
              <button onClick={() => musicRef.current?.click()} className="ml-auto flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-hover">
                <Upload size={14} /> 음악 업로드
              </button>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <FactionCopyButton script={script} />
            <button
              onClick={() => setShowPool(v => !v)}
              className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-semibold ${
                showPool
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border bg-bg-card text-text-secondary hover:bg-bg-hover'
              }`}
              title="이미지 풀 — 폴더별 이미지 조망 (사용/미사용)"
            >
              <ImageIcon size={15} /> 이미지 풀
            </button>
            <button
              onClick={() => setShowPreview(v => !v)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
            >
              <Eye size={15} /> {showPreview ? '편집' : '미리보기'}
            </button>
            <button
              onClick={() => setVoiceModalOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
              title="인물 대사 음성 생성 옵션 (엔진·대상·생성 모드)"
            >
              <Mic size={15} /> 음성 생성
            </button>
            <button
              onClick={() => { if (confirm('이 에피소드의 모든 음성(ElevenLabs 포함)을 같은 음량으로 균일화합니다. 원본은 voice/.raw 에 백업됩니다. 진행할까요?')) triggerVoice({ normalizeOnly: true }) }}
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
              title="모든 대사 음성(ElevenLabs 포함)을 같은 라우드니스로 일괄 균일화 (생성 없이 정규화만)"
            >
              음량 균일화
            </button>
            <button
              onClick={() => setQuoteModeOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
              title="전 인물 대사 처리 단계(음성/대사/직함) 일괄 편집"
            >
              대사 단계
            </button>
            <button
              onClick={syncVoiceDurations}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
              title="모든 인물의 음성 길이를 실제 음원 파일 길이로 다시 맞춘다 (위치 변경·음원 교체 후 컷 길이 정정)"
            >
              {syncing ? '맞추는 중…' : '음성 길이 맞추기'}
            </button>
            <button
              onClick={render}
              disabled={rendering}
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
              title="세로 영상 1편 렌더 (out/Faction/)"
            >
              <Film size={15} /> {rendering ? '시작 중...' : '렌더'}
            </button>
            <button
              onClick={() => setShowYouTube(v => !v)}
              className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-semibold ${
                showYouTube
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border bg-bg-card text-text-secondary hover:bg-bg-hover'
              }`}
              title="유튜브 업로드·메타 관리"
            >
              <Upload size={15} /> 유튜브
            </button>
            <button
              onClick={save}
              disabled={saving || !dirty}
              className={`fixed bottom-6 right-6 z-50 flex items-center gap-1.5 rounded-full px-5 py-3 text-sm font-semibold shadow-lg ${
                dirty ? 'bg-accent text-bg-main hover:bg-accent-hover' : 'border border-border bg-bg-card text-text-dim'
              } disabled:opacity-50`}
            >
              <Save size={16} /> {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>

      {/* 본문 — 편집 화면일 때만 이미지 풀 사이드바를 곁들인다 */}
      <div className={!showPreview && showPool ? 'flex items-start gap-4' : ''}>
        <div className="min-w-0 flex-1">
      {showPreview ? (
        <FactionPreview
          script={script}
          series={series}
          episodeName={name}
          onToggleDisabled={gi => setGroup(gi, { ...groups[gi], disabled: groups[gi].disabled ? undefined : true })}
        />
      ) : (
        <div className="space-y-5">
          {/* 유튜브 업로드·메타 관리 — 헤더 「유튜브」 버튼으로 펼친다 */}
          {showYouTube && <FactionYouTubePanel series={series} name={name} />}
          {/* 세력을 쇼츠 편(공통·1편·2편)별로 묶어 보여준다. 각 카드의 「편」 버튼으로 배정을 바꾸면 그 묶음으로 옮겨간다. */}
          {groups.length > 0 && PART_SECTIONS.map(sec => {
            const items = groups.map((g, i) => ({ g, i })).filter(({ g }) => !g.disabled && (g.part ?? 0) === sec.key)
            // 편(1·2편) 묶음이 비면 안내만 — 공통 묶음은 비어도 표시하지 않는다(전부 편 배정된 경우)
            if (items.length === 0) {
              if (sec.key === 0) return null
              return (
                <div key={sec.key} className="rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-text-dim">
                  {sec.label} — 배정된 세력이 없습니다. 세력 카드 머리의 편 선택을 「{sec.label}」으로 바꾸면 이 묶음으로 옮겨집니다.
                </div>
              )
            }
            const partCollapsed = !!collapsedParts[sec.key]
            return (
              <div key={sec.key} className="overflow-hidden rounded-lg border border-border">
                <button
                  onClick={() => setCollapsedParts(p => ({ ...p, [sec.key]: !p[sec.key] }))}
                  className="flex w-full items-center gap-3 bg-bg-card px-4 py-3 text-left transition hover:bg-bg-hover"
                  title={partCollapsed ? '펼치기' : '접기'}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/15 text-sm font-bold text-accent">{sec.key === 0 ? '공' : sec.key}</span>
                  <div className="min-w-0">
                    <div className="text-base font-bold text-text-primary">{sec.label}</div>
                    <div className="text-[10px] text-text-dim">{sec.hint}</div>
                  </div>
                  <span className="ml-auto shrink-0 text-xs text-text-dim">{items.length}개 세력</span>
                  <span className="shrink-0 text-text-secondary">{partCollapsed ? <ChevronsUpDown size={16} /> : <ChevronsDownUp size={16} />}</span>
                </button>
                {!partCollapsed && (
                  <div className="space-y-2 border-t border-border bg-bg-main/20 p-2.5">
                    {/* 이 편 설정 — 제목·부제·배경음악·마무리·시작끝 인물을 한 곳에서 */}
                    <div className="space-y-2 rounded-md border border-border/60 bg-bg-card/30 p-2.5">
                      {/* 제목은 공통이면 위 상단 칸에서, 편(1·2)이면 여기서 따로 */}
                      {sec.key !== 0 && partTextField(sec.key, '제목', { common: 'title', byPart: 'titleByPart', en: 'titleEn' })}
                      {partTextField(sec.key, '부제', { common: 'subtitle', byPart: 'subtitleByPart', en: 'subtitleEn' })}
                      {/* 시작 화면 로그라인 — 제목 아래 천천히 떠오르는 한 줄. 비우면 표시 안 함 */}
                      {partTextField(sec.key, '로그라인', { common: 'logline', byPart: 'loglineByPart', en: 'loglineEn' })}
                      {/* 시작 화면 길이 — 전역(편 무관). 공통 묶음에서만 다룬다 */}
                      {sec.key === 0 && (
                        <div className="flex items-center gap-2">
                          <label className="w-16 shrink-0 text-xs text-text-dim">시작 길이 -</label>
                          <input
                            type="number"
                            min={1}
                            max={12}
                            step={0.5}
                            placeholder="기본 2.5"
                            value={script.introSec ?? ''}
                            onChange={e => {
                              const v = e.target.value === '' ? undefined : Number(e.target.value)
                              update({ introSec: v != null && Number.isFinite(v) ? v : undefined })
                            }}
                            className="w-24 rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
                          />
                          <span className="text-[10px] text-text-dim">초 · 시작 화면이 떠 있는 시간(비우면 기본 2.5초, 로그라인이 길면 늘린다)</span>
                        </div>
                      )}
                      {/* 효과음 — 전역(편 무관). 공통 묶음에서만 다룬다 */}
                      {sec.key === 0 && (
                        <>
                          <div className="flex items-center gap-2">
                            <label className="w-16 shrink-0 text-xs text-text-dim">시작 효과음 -</label>
                            <select
                              value={script.startSfx ?? ''}
                              onChange={e => update({ startSfx: e.target.value || undefined })}
                              className="rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm"
                            >
                              <option value="">없음</option>
                              {sfxList.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <span className="text-[10px] text-text-dim">로그라인과 함께 울리고 같이 사라짐</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="w-16 shrink-0 text-xs text-text-dim">로고 효과음 -</label>
                            <select
                              value={script.groupSfx ?? ''}
                              onChange={e => update({ groupSfx: e.target.value || undefined })}
                              className="rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm"
                            >
                              <option value="">없음</option>
                              {sfxList.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <span className="text-[10px] text-text-dim">세력 로고가 뜰 때마다 울림</span>
                          </div>
                        </>
                      )}
                      {/* 이 편 배경음악 — 편(1·2)만. 공통 곡은 위 배경음악 카드에서 */}
                      {sec.key !== 0 && (
                        <div className="flex items-center gap-2">
                          <label className="w-16 shrink-0 text-xs text-text-dim">배경음악 -</label>
                          <select
                            value={script.musicByPart?.[sec.key] ?? ''}
                            onChange={e => {
                              const v = e.target.value
                              const nx: Record<number, string> = { ...(script.musicByPart ?? {}) }
                              if (v) nx[sec.key] = v; else delete nx[sec.key]
                              update({ musicByPart: Object.keys(nx).length ? nx : undefined })
                            }}
                            className="rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm"
                          >
                            <option value="">공통 곡 사용</option>
                            {musicList.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          {/* 이 편 곡 음량 — 곡을 지정한 편만. 100%가 원음 */}
                          {script.musicByPart?.[sec.key] && (
                            <span className="flex items-center gap-1" title="이 편 배경음악 음량. 100%가 원음">
                              <input
                                type="range" min={0} max={1} step={0.05}
                                value={script.musicVolumeByPart?.[sec.key] ?? 1}
                                onChange={e => {
                                  const v = Number(e.target.value)
                                  const nx: Record<number, number> = { ...(script.musicVolumeByPart ?? {}) }
                                  if (v === 1) delete nx[sec.key]; else nx[sec.key] = v
                                  update({ musicVolumeByPart: Object.keys(nx).length ? nx : undefined })
                                }}
                                className="w-20 accent-accent"
                              />
                              <span className="w-9 text-right font-mono text-[10px] text-text-secondary">{Math.round((script.musicVolumeByPart?.[sec.key] ?? 1) * 100)}%</span>
                            </span>
                          )}
                          <span className="text-[10px] text-text-dim">이 편만 다른 곡(공통 곡 무시, 반복)</span>
                        </div>
                      )}
                      {/* 이 편 시작 화면 인물 (끝 화면은 없음 — 마지막 인물 컷에서 페이드아웃) */}
                      <FactionHeroPicker
                        script={script}
                        candidates={heroCandidates}
                        series={series}
                        episodeName={name}
                        onChange={update}
                        part={sec.key}
                      />
                    </div>
                    {items.map(({ g, i }) => (
                      <FactionGroupEditor
                        key={i}
                        groupIndex={i}
                        group={g}
                        onChange={next => setGroup(i, next)}
                        onDelete={() => deleteGroup(i)}
                        onMoveUp={() => moveGroupInPart(i, -1)}
                        onMoveDown={() => moveGroupInPart(i, 1)}
                        series={series}
                        episodeName={name}
                        musicList={musicList}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* 재료 묶음 — 영상에서 제외된 세력(어느 편에도 안 들어감, 데이터만 보관) */}
          {(() => {
            const dis = groups.map((g, i) => ({ g, i })).filter(({ g }) => g.disabled)
            if (!dis.length) return null
            const c = !!collapsedParts[-1]
            return (
              <div className="space-y-2">
                <button
                  onClick={() => setCollapsedParts(p => ({ ...p, [-1]: !p[-1] }))}
                  className="flex w-full items-center gap-2 rounded-md border border-dashed border-border/60 bg-bg-card/30 px-3 py-1.5 text-left hover:bg-bg-card"
                  title={c ? '펼치기' : '접기'}
                >
                  <span className="text-text-dim">{c ? <ChevronsUpDown size={14} /> : <ChevronsDownUp size={14} />}</span>
                  <span className="text-sm font-bold text-text-dim">재료 (영상 제외)</span>
                  <span className="text-[10px] text-text-dim">어느 편에도 안 들어감 · 데이터만 보관 · {dis.length}개</span>
                </button>
                {!c && dis.map(({ g, i }) => (
                  <FactionGroupEditor
                    key={i}
                    groupIndex={i}
                    group={g}
                    onChange={next => setGroup(i, next)}
                    onDelete={() => deleteGroup(i)}
                    onMoveUp={() => moveGroupInPart(i, -1)}
                    onMoveDown={() => moveGroupInPart(i, 1)}
                    series={series}
                    episodeName={name}
                    musicList={musicList}
                  />
                ))}
              </div>
            )
          })()}
          {groups.length === 0 && <p className="text-sm text-text-dim">아직 세력이 없습니다. 아래에서 추가하세요.</p>}

          <button
            onClick={addGroup}
            className="flex items-center gap-1.5 rounded-md border border-dashed border-border bg-bg-card px-4 py-2.5 text-sm font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover"
          >
            <Plus size={16} /> 세력 추가
          </button>

          {/* 제목·부제·시작 화면 인물은 위 편 묶음(공통·1편·2편)에서 편마다 다룬다 */}

          {/* 렌더 진행 상황 */}
          <div className="mt-6 border-t border-border pt-4">
            <TaskPanel />
          </div>
        </div>
      )}
        </div>

        {/* 이미지 풀 사이드바 — 편집 화면에서만 */}
        {!showPreview && showPool && (
          <aside className="sticky top-32 hidden max-h-[calc(100vh-9rem)] w-[34rem] shrink-0 overflow-y-auto rounded-md border border-border bg-bg-main/40 p-3 lg:block">
            <FactionImagePool
              series={series}
              episodeName={name}
              usedImages={usedImages}
            />
          </aside>
        )}
      </div>

      {/* 좁은 화면: 풀을 본문 아래에 펼침 */}
      {!showPreview && showPool && (
        <div className="mt-6 rounded-md border border-border bg-bg-main/40 p-3 lg:hidden">
          <FactionImagePool series={series} episodeName={name} usedImages={usedImages} />
        </div>
      )}

      {/* 음성 생성 옵션 모달 — 헤더 버튼으로 연다 */}
      {voiceModalOpen && (
        <FactionVoiceModal onClose={() => setVoiceModalOpen(false)} onGenerate={generateVoice} />
      )}
      {/* 대사 처리 단계 일괄 편집 모달 */}
      {quoteModeOpen && script && (
        <FactionQuoteModeModal
          script={script}
          series={series}
          episodeName={name}
          onChange={next => { setScript(next); setDirty(true) }}
          onClose={() => setQuoteModeOpen(false)}
        />
      )}
    </div>
    </FactionVoiceProvider>
  )
}
