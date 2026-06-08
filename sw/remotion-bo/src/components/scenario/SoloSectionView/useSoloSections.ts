import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFolderImages } from '../useImageEditor/useFolderImages'
import { useSoloImageOps } from '../useImageEditor/useSoloImageOps'
import { usePlaybackRate } from '../usePlaybackRate'
import { imageKeyFromPath } from '../utils'
import { type AnchorPick, type CinematicImage } from '../types'
import type { VoiceSection } from '../../voice-utils'
import type { EpisodeData } from '../../EpisodeEditor'
import type { SoloFreeSection } from './types'
import { nextId } from './utils'

interface UseSoloSectionsArgs {
  series: string
  name: string
  bookIndex: number
  episode: EpisodeData
  sectionMap: Map<string, VoiceSection>
  activeEngine: (key: string) => string
}

/** 솔로 자유섹션 편집기의 상태·로직 — 본문 GET/PUT, 음성 키 산정, 이미지 조작, 앵커 픽업, 편집기 모달. */
export function useSoloSections({
  series, name, bookIndex, episode, sectionMap, activeEngine,
}: UseSoloSectionsArgs) {
  const [sections, setSectionsState] = useState<SoloFreeSection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  // 이미지 풀에서 「추가」 버튼을 눌렀을 때 이미지를 받을 대상 섹션. 카드 클릭 시 갱신.
  const [activeIdx, setActiveIdx] = useState(0)
  const [copied, setCopied] = useState(false)
  // 앵커 픽업 상태 — 쇼츠와 동일. 본문에서 구절을 선택하면 그 슬롯의 text 앵커로 등록한다.
  const [anchorPick, setAnchorPick] = useState<AnchorPick>(null)
  const {
    folderImages, imageBaseUrl, subFolders, fileFolders, duplicates, refreshFolderImages,
    moveFileToFolder, createFolder, renameFolder, deleteFolder, mediaPath,
  } = useFolderImages(series, name)
  // 다른 책과 이름이 겹치는 파일 집합 — 겹치는 파일만 폴더 포함 식별자로 다뤄 풀 키와 맞춘다.
  const dupNames = useMemo(() => new Set(duplicates.map(d => d.name)), [duplicates])

  // dirty 표시를 묶기 위해 setSections 래퍼 — 함수형 업데이트만 받는다(공용 ops 호환).
  const setSections = useCallback((updater: (prev: SoloFreeSection[]) => SoloFreeSection[]) => {
    setSectionsState(updater)
    setDirty(true)
  }, [])

  // 쇼츠 segment 와 동일한 공용 이미지 조작 — 저장 경로도 쇼츠와 같은 episodes/... 풀 경로.
  const ops = useSoloImageOps<SoloFreeSection>({ sections, setSections, mediaPath, dupNames })

  const apiUrl = `/api/${series}/episodes/${name}/solo/${bookIndex}`
  const ttsLang = name.endsWith('-en') ? 'en-US' : 'ko-KR'
  const [rate] = usePlaybackRate() // 상단 도구막대의 전역 배속 — 듣기 미리듣기에도 동일 적용

  // 각 자유섹션 → 솔로 음성 키. 정형부(인사·소개·표지) 다음 순번부터 매긴다.
  const sectionKeys = useMemo<(string | null)[]>(() => {
    const greetingOffset = (episode.narrator as { serviceGreeting?: string } | undefined)?.serviceGreeting ? 1 : 0
    const base = greetingOffset + 2 // intro + title
    const bookNN = String(bookIndex + 1).padStart(2, '0')
    let live = 0
    return sections.map(s => {
      if (!s.text?.trim()) return null
      const nn = String(base + live + 1).padStart(2, '0')
      live++
      return `solo-B${bookNN}/S${nn}-${s.id}`
    })
  }, [sections, episode.narrator, bookIndex])

  // 편집기 모달이 연 키 → 해당 섹션 본문(합성 원문으로 주입)
  const expandedText = useMemo(() => {
    if (!expandedKey) return ''
    const i = sectionKeys.indexOf(expandedKey)
    return i >= 0 ? sections[i]?.text ?? '' : ''
  }, [expandedKey, sectionKeys, sections])

  // 브라우저 내장 음성으로 미리듣기 — 분량·리듬 확인용(실제 영상 음성과 무관).
  const speak = useCallback((id: string, text: string) => {
    const synth = window.speechSynthesis
    if (!synth) return
    synth.cancel()
    if (speakingId === id || !text.trim()) { setSpeakingId(null); return }
    const u = new SpeechSynthesisUtterance(text)
    u.lang = ttsLang
    u.rate = Math.max(0.1, Math.min(10, rate)) // SpeechSynthesis 허용 범위로 clamp
    u.onend = () => setSpeakingId(null)
    u.onerror = () => setSpeakingId(null)
    synth.speak(u)
    setSpeakingId(id)
  }, [speakingId, ttsLang, rate])

  // 화면을 벗어나면 재생 중지
  useEffect(() => () => { window.speechSynthesis?.cancel() }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(apiUrl)
      .then(r => r.json())
      .then(d => {
        if (!alive) return
        setSectionsState(Array.isArray(d?.sections) ? d.sections : [])
        setDirty(false)
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [apiUrl])

  const patch = useCallback((i: number, p: Partial<SoloFreeSection>) => {
    setSections(prev => prev.map((s, j) => (j === i ? { ...s, ...p } : s)))
  }, [setSections])

  // 섹션이 쓰는 이미지 집합 — 풀의 used 뱃지·사용중 필터 기준. 풀 경로를 풀 키(basename)로 환원해 맞춘다.
  const usedFiles = useMemo(() => {
    const set = new Set<string>()
    for (const s of sections) {
      if (s.image) set.add(imageKeyFromPath(s.image, dupNames))
      for (const c of s.imageChangeAt ?? []) if (c.image) set.add(imageKeyFromPath(c.image, dupNames))
    }
    return set
  }, [sections, dupNames])

  // 앵커 픽업 확정 — 선택 구절을 해당 슬롯 text 로 등록(쇼츠 confirmAnchor 와 동일 모델).
  const confirmAnchor = useCallback((idx: number, selected: string) => {
    const imgs = [...ops.getImages(idx)]
    if (anchorPick && anchorPick.itemIdx === idx) {
      imgs[anchorPick.imgIdx] = { ...imgs[anchorPick.imgIdx], text: selected } as CinematicImage
      ops.setImages(idx, imgs)
      setAnchorPick(null)
      return
    }
    // 픽업 슬롯 미지정 — 새 빈 슬롯에 앵커만 등록(이미지는 이후 드롭으로 채움)
    ops.addAnchor(idx, selected)
  }, [ops, anchorPick])

  // 편집 창에서 고른 캐릭터 보이스를 해당 솔로 섹션(solo.json)에 저장 — episode 밖이라 콜백으로 주입.
  const voiceOverride = useMemo(() => {
    if (!expandedKey) return null
    const i = sectionKeys.indexOf(expandedKey)
    if (i < 0) return null
    return {
      value: sections[i]?.geminiVoice ?? 'Kore',
      onChange: (v: string) => patch(i, { geminiVoice: v || undefined }),
    }
  }, [expandedKey, sectionKeys, sections, patch])

  const add = useCallback(() => {
    setSections(prev => [...prev, { id: nextId(prev), text: '', voice: 'tts', kind: 'narration' }])
  }, [setSections])
  const remove = useCallback((i: number) => {
    setSections(prev => prev.filter((_, j) => j !== i))
  }, [setSections])
  const move = useCallback((i: number, dir: -1 | 1) => {
    setSections(prev => {
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }, [setSections])

  const save = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      })
      if (res.ok) setDirty(false)
      else console.warn('솔로 자유섹션 저장 실패', await res.text())
    } finally {
      setSaving(false)
    }
  }, [apiUrl, sections])

  // 내용 복사 — 각 칸을 「종류 · 본문(인용은 출처 포함)」으로 모아 클립보드에 담는다.
  const copyAll = useCallback(() => {
    const body = sections
      .filter(s => s.text?.trim())
      .map(s => {
        const label = s.kind === 'quote' ? '인용' : '서술'
        const src = s.kind === 'quote' && s.quoteSource?.trim() ? `\n출처: ${s.quoteSource.trim()}` : ''
        return `# ${label} (${s.id})\n${s.text.trim()}${src}`
      })
      .join('\n\n')
    navigator.clipboard.writeText(body).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [sections])

  return {
    // 상태
    sections, loading, saving, dirty, speakingId, expandedKey, activeIdx, copied, anchorPick,
    // 이미지 풀
    folderImages, imageBaseUrl, subFolders, fileFolders, duplicates,
    refreshFolderImages, moveFileToFolder, createFolder, renameFolder, deleteFolder,
    // 파생
    ops, sectionKeys, expandedText, usedFiles, voiceOverride,
    // 세터·핸들러
    setSections, setExpandedKey, setActiveIdx, setAnchorPick,
    speak, patch, confirmAnchor, add, remove, move, save, copyAll,
  }
}
