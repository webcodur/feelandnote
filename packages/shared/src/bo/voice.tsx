'use client'

/**
 * 음성 편집 화면 부품 한 벌 — 서재 탐방(book)·세력도(faction)·가상 담화(discourse)가 함께 쓴다.
 *
 * 세 시리즈는 같은 부품을 각자 복제해 두고 있었다(편집 창 껍데기·저장된 음원 섹션·감정 태그 고르기).
 * 복제본마다 한쪽에만 기능이 붙고 문구가 갈라졌다. 이 파일이 그 전부의 단일 원천이다.
 * 부품별로 파일을 쪼개지 않는다 — 여기 한 곳만 보면 된다.
 *
 * 시리즈 차이는 값으로 흡수한다.
 *  1) 편집 창의 모드 탭 개수·이름은 modes 로 받는다(세력도 수식어 슬롯은 「싱크 보정」이 빠진다).
 *  2) 저장된 음원은 tracks(엔진별 음원 여러 개 가능) + playUrl(재생 주소 만들기) 로 받는다.
 *  3) 헤더 우측 이외의 시리즈 전용 도구(예: 엔진 토글)는 headerExtra 로 끼워 넣는다.
 *  4) 음원 만들기·자르기·저장 절차(useVoiceGeneration)는 서버 창구 네 곳(endpoints)만 갈아끼운다.
 */

import {
  useEffect, useRef, useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import type {
  VoiceFile, EngineKind, SegmentEngineSpec, EleSettings, TempPreview, GenEngine,
} from './voice-utils'
import { encodeWAV, abToBase64, playDing } from './voice-utils'
import { AudioWavePlayer } from './audio-wave-player'

// ─────────────────────────────────────────────────────────────────────────────
// 감정 어휘 (ElevenLabs 감정 표식)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ElevenLabs 합성에 앞에 붙는 감정 표식 목록 — 세 시리즈 공통 정본.
 *
 * 앞의 열한 개는 서재 탐방·세력도가 쓰던 목록이고, 뒤의 여섯 개는 가상 담화에만 있던 말이다.
 * 편집기마다 다른 말을 내밀 이유가 없어 한 목록으로 합쳤다.
 * 여기 없는 말도 「직접 입력」으로 얼마든지 넣을 수 있다(실제 대본에는 cynical·loud 같은 값도 쓰인다).
 */
export const ELE_EMOTIONS = [
  'calm', 'warm', 'serious', 'confident', 'passionate', 'reflective',
  'sad', 'playful', 'seamless', 'angry', 'fast',
  'excited', 'whispers', 'sarcastic', 'curious', 'sighs', 'laughs',
]

/**
 * 감정 표식 고르기 — 칩을 눌러 고르고(고른 순서가 숫자로 보인다), 목록에 없는 말은 직접 적어 넣는다.
 * 최대 개수(기본 2개)를 넘겨 고르면 가장 먼저 고른 것이 밀려난다.
 *
 * tone: 'light' 는 흰 바탕 보라 강조(도구모음·세력도), 'dark' 는 어두운 바탕(구간 톤·담화).
 */
export function EleEmotionPicker({
  value, onChange, max = 2, tone = 'light', compact = false, className,
}: {
  value: string[]
  onChange: (next: string[]) => void
  /** 동시에 고를 수 있는 개수 — 기본 2개 */
  max?: number
  tone?: 'light' | 'dark'
  compact?: boolean
  className?: string
}) {
  const [draft, setDraft] = useState('')

  /** 최대 개수를 넘기면 가장 먼저 고른 것을 밀어낸다 */
  const push = (em: string) => {
    if (value.includes(em)) return
    onChange(value.length >= max ? [...value.slice(value.length - max + 1), em] : [...value, em])
  }
  const toggle = (em: string) => {
    if (value.includes(em)) onChange(value.filter(x => x !== em))
    else push(em)
  }
  const addDraft = () => {
    const v = draft.trim()
    setDraft('')
    if (!v || value.includes(v)) return
    push(v)
  }

  const textCls = compact ? 'text-[9px]' : tone === 'dark' ? 'text-[10px]' : 'text-[11px]'
  const onCls = tone === 'dark'
    ? 'bg-purple-500/30 text-purple-200 border-purple-500/60 font-semibold'
    : 'bg-purple-600 text-white border-purple-600 font-extrabold shadow-sm'
  const offCls = tone === 'dark'
    ? 'bg-bg-main border-border text-text-secondary hover:border-purple-500/40'
    : 'bg-white border-slate-300 text-slate-900 font-bold hover:border-purple-500 hover:bg-purple-50'
  const inputCls = tone === 'dark'
    ? 'bg-bg-main border-border text-text-primary'
    : 'bg-white border-slate-300 text-slate-950 font-bold focus:border-purple-600'
  const addCls = tone === 'dark'
    ? 'border-purple-500/40 text-purple-300 hover:bg-purple-500/10'
    : 'border-purple-500 text-purple-700 hover:bg-purple-100 font-black'

  // 목록에 없는 말(직접 입력으로 넣은 것) — 따로 줄을 만들어 보여주고 누르면 뺀다
  const extras = value.filter(t => !ELE_EMOTIONS.includes(t))

  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        {ELE_EMOTIONS.map(em => {
          const idx = value.indexOf(em)
          const sel = idx >= 0
          return (
            <button
              key={em}
              type="button"
              onClick={e => { e.stopPropagation(); toggle(em) }}
              className={`rounded border px-2 py-0.5 ${textCls} transition-colors ${sel ? onCls : offCls}`}
            >
              {sel ? `${idx + 1}. ` : ''}{em}
            </button>
          )
        })}
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); addDraft() } }}
          placeholder="직접 입력"
          className={`rounded border px-2 py-0.5 outline-none ${compact ? 'w-[80px] text-[9px]' : 'w-[110px] text-xs'} ${inputCls}`}
        />
        <button
          type="button"
          onClick={e => { e.stopPropagation(); addDraft() }}
          disabled={!draft.trim()}
          className={`rounded border px-2 py-0.5 ${textCls} disabled:cursor-not-allowed disabled:opacity-40 ${addCls}`}
        >+</button>
      </div>
      {extras.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {extras.map(t => (
            <button
              key={t}
              type="button"
              onClick={e => { e.stopPropagation(); onChange(value.filter(x => x !== t)) }}
              title="빼기"
              className={`flex items-center gap-1.5 rounded border px-2 py-0.5 ${textCls} ${onCls}`}
            >
              <span>{t}</span>
              <span className="opacity-80">×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 음성 편집 창 껍데기
// ─────────────────────────────────────────────────────────────────────────────

/** 편집 창 헤더의 모드 탭 한 칸 */
export type VoiceEditorModeDef<M extends string> = { id: M; label: string }

/** 서재 탐방 편집 창의 모드 — 세력도는 자기 목록을 따로 만들어 넘긴다(수식어 슬롯은 「싱크」가 빠진다) */
export type BookVoiceMode = 'trim' | 'sync' | 'breath' | 'age'
export const BOOK_VOICE_MODES: VoiceEditorModeDef<BookVoiceMode>[] = [
  { id: 'trim', label: '생성' },
  { id: 'sync', label: '싱크' },
  { id: 'breath', label: '들숨' },
  { id: 'age', label: '연령' },
]

/**
 * 음성 편집 창 — 화면을 덮는 큰 창. 헤더에 제목·모드 탭·닫기가 있고 본문은 시리즈가 채운다.
 *
 * 창을 열고 닫는 판단은 부르는 쪽이 한다(조건부로 이 부품을 그린다). 새로 그려질 때 모드가
 * 첫 탭으로 돌아가므로 따로 되돌리는 처리가 필요 없다.
 *
 * 두 가지는 반드시 지킨다(서재 탐방 쪽에만 있던 처리를 여기로 올렸다).
 *  1) 창이 떠 있는 동안 뒤 화면이 따라 스크롤되지 않게 잠근다.
 *  2) 뒤 배경에서 시작한 누름만 닫기로 인정한다 — 창 안(예: 파형의 구간 선)에서 끌기 시작해
 *     손을 배경 위에서 떼도 창이 닫히지 않는다.
 *  3) 호출한 카드의 overflow·contain·transform과 무관하도록 document.body portal에 렌더한다.
 *
 * 자판: Esc 로 닫고 1·2·3… 으로 모드를 바꾼다. 글자를 적는 칸에 커서가 있으면 무시한다.
 */
export function VoiceEditorShell<M extends string>({
  title = '음성 편집', subtitle, icon, modes, onClose, headerExtra, children,
}: {
  title?: ReactNode
  /** 제목 옆 흐린 보조 문구 — 어느 구간·인물인지 */
  subtitle?: ReactNode
  icon?: ReactNode
  modes: VoiceEditorModeDef<M>[]
  onClose: () => void
  /** 헤더 가운데에 끼워 넣을 시리즈 전용 도구 (예: 엔진 토글) */
  headerExtra?: ReactNode
  children: (mode: M, setMode: (m: M) => void) => ReactNode
}) {
  const [mode, setMode] = useState<M>(modes[0]!.id)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  // 뒤 배경에서 시작된 누름만 닫기로 인정한다(창 안에서 시작한 끌기가 배경에서 끝나도 안 닫힘).
  const downOnBackdrop = useRef(false)
  // onClose 는 부르는 쪽이 그때그때 새 함수로 넘긴다. 이걸 아래 effect 가 지켜보면 부모가 다시
  // 그려질 때마다(예: 구간 선을 끄는 동안 쉼 없이 발생) effect 가 다시 돌아 모드가 첫 탭으로
  // 튕긴다 — 사용자 눈에는 편집 화면이 갑자기 닫힌 것처럼 보인다. 그래서 참조로 우회한다.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const modesRef = useRef(modes)
  modesRef.current = modes

  useEffect(() => {
    setPortalRoot(document.body)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      // 글자를 적는 중이면 자판 규약을 적용하지 않는다(적다가 창이 닫히는 사고 방지)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Escape') { onCloseRef.current(); return }
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= modesRef.current.length) setMode(modesRef.current[n - 1]!.id)
    }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [])

  if (!portalRoot) return null

  return createPortal((
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={e => { downOnBackdrop.current = e.target === e.currentTarget }}
      onClick={e => {
        if (downOnBackdrop.current && e.target === e.currentTarget) onClose()
        downOnBackdrop.current = false
      }}
    >
      <div
        className="flex flex-col overflow-hidden rounded-md border border-border bg-bg-card shadow-xl"
        style={{ width: 'min(96vw, 1800px)', height: 'min(94vh, 1100px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 border-b border-border bg-bg-main px-5 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {icon}
            <span className="shrink-0 text-base font-semibold text-text-primary">{title}</span>
            {subtitle && <span className="truncate text-sm text-text-secondary">{subtitle}</span>}
          </div>

          {headerExtra}

          <div className="ml-auto flex items-center gap-2">
            <div
              role="group"
              className="inline-flex items-center gap-0.5 rounded border border-border bg-bg-main p-0.5"
              title="편집 모드 전환 (숫자 키)"
            >
              {modes.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`rounded px-3 py-1 text-sm transition-colors ${
                    mode === m.id ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span className={`mr-1.5 font-mono text-[10px] ${mode === m.id ? 'opacity-80' : 'opacity-50'}`}>{i + 1}</span>
                  {m.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-border px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
              title="닫기 (Esc)"
            >
              닫기
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-auto bg-bg-card p-5">
          {children(mode, setMode)}
        </div>
      </div>
    </div>
  ), portalRoot)
}

// ─────────────────────────────────────────────────────────────────────────────
// 엔진 토글 (편집 창 헤더용)
// ─────────────────────────────────────────────────────────────────────────────

const ENG_LABEL: Record<string, string> = { gemini: 'Gemini', elevenlabs: 'ElevenLabs' }

/** 편집 창 헤더의 엔진 토글 — 이 구간만 다른 엔진 음원을 쓰게 한다. 서재 탐방이 쓴다. */
export type VoiceEngineToggleState = {
  active: string
  default: string
  hasOverride: boolean
  hasFile: { gemini: boolean; elevenlabs: boolean }
  onToggle: (engine: 'gemini' | 'elevenlabs') => void
}

export function VoiceEngineToggle({ active, default: def, hasOverride, hasFile, onToggle }: VoiceEngineToggleState) {
  return (
    <div className="ml-4 flex items-center gap-2">
      <span className="text-sm text-text-secondary">엔진</span>
      <div
        role="group"
        className={`inline-flex items-center gap-0.5 rounded border bg-bg-main p-0.5 ${
          hasOverride ? 'border-amber-500/50' : 'border-border'
        }`}
      >
        {(['gemini', 'elevenlabs'] as const).map(slot => (
          <button
            key={slot}
            type="button"
            disabled={!hasFile[slot]}
            onClick={() => onToggle(slot)}
            title={!hasFile[slot]
              ? `${ENG_LABEL[slot]} 음원 없음 — 먼저 생성 필요`
              : active === slot
                ? (hasOverride
                    ? `${ENG_LABEL[slot]} 사용 중 (기본과 다름). 다시 누르면 기본으로 회귀.`
                    : `${ENG_LABEL[slot]} 사용 중 (기본값 따름)`)
                : `이 행만 ${ENG_LABEL[slot]} 로 설정`}
            className={`rounded px-3 py-1 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              active === slot ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {ENG_LABEL[slot]}
          </button>
        ))}
      </div>
      {hasOverride && (
        <span
          className="rounded border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300"
          title={`기본 엔진(${ENG_LABEL[def] ?? def}) 과 다르게 이 행만 별도로 설정됨.`}
        >
          기본과 다름
        </span>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 저장된 음원 (파형 + 트림)
// ─────────────────────────────────────────────────────────────────────────────

/** 저장된 음원 한 줄 — 서재 탐방은 엔진별로 여러 줄, 세력도는 인물 음원 한 줄 */
export type SavedVoiceTrack = {
  /** 파형 머리에 적히는 이름 (GEM/ELE, GEM 3.1 등) */
  label: string
  file: VoiceFile
  /** 지금 실제로 쓰이는 음원인지 */
  active: boolean
}

/**
 * 저장된 음원 — 디스크에 저장된 음원의 파형을 그리고, 양끝을 끌어 남길 구간을 고른다.
 *
 * 파형은 「축약」(가로폭에 맞춤)과 「확장」(1초를 200픽셀로 늘려 가로로 넘겨 봄) 중 고를 수 있다.
 * 세력도가 나중에 붙인 기능인데 서재 탐방에서도 쓸모가 있어 양쪽 공용으로 올렸다.
 */
export function SavedVoiceSection({
  tracks, playUrl, trimStart, setTrimStart, trimEnd, setTrimEnd,
  trimSaving, saveTrimmed, playbackRate, gainDb, resetTrimOnFileChange = false,
}: {
  tracks: SavedVoiceTrack[]
  /** 음원 하나의 재생 주소 만들기 — 시리즈마다 경로가 다르다(캐시 무효화 값도 여기서 붙인다) */
  playUrl: (file: VoiceFile) => string
  trimStart: number
  setTrimStart: (t: number) => void
  trimEnd: number
  setTrimEnd: (t: number) => void
  trimSaving: boolean
  saveTrimmed: () => void
  /** 재생에 적용할 배속 — 없으면 1배속 */
  playbackRate?: number
  /** 재생에 적용할 소리 크기 보정(dB) — 없으면 0 */
  gainDb?: number
  /** 쓰는 음원이 바뀌면 고른 구간을 전체로 되돌린다 (세력도: 인물이 바뀌면 앞 인물의 선이 남는다) */
  resetTrimOnFileChange?: boolean
}) {
  const activeTrack = tracks.find(t => t.active) ?? tracks[0]
  const activeFile = activeTrack?.file
  const activeDur = activeFile?.duration ?? 0
  const trimmed = !!activeFile && (trimStart > 0.01 || (trimEnd > 0 && trimEnd < activeFile.duration - 0.01))
  // 파형 표시 — 축약(가로폭에 맞춤) / 확장(초당 200px 고정, 가로 스크롤)
  const [wide, setWide] = useState(false)

  const activeName = activeFile?.name
  useEffect(() => {
    if (!resetTrimOnFileChange) return
    setTrimStart(0)
    setTrimEnd(activeDur)
  }, [resetTrimOnFileChange, activeName, activeDur, setTrimStart, setTrimEnd])

  return (
    <section className="space-y-3 rounded-md border border-border bg-bg-main/40 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold text-text-primary">저장된 음원</h3>
        {activeName && (
          <span className="rounded border border-border bg-bg-card px-1.5 py-0.5 font-mono text-[11px] text-text-secondary">{activeName}</span>
        )}
        <span className="text-xs text-text-secondary">양끝 드래그로 구간 선택</span>
        <div
          role="group"
          className="inline-flex items-center gap-0.5 rounded border border-border bg-bg-main p-0.5"
          title="파형 표시 모드. 축약=가로폭에 맞춤 / 확장=초당 200px 고정, 가로 스크롤"
        >
          {([[false, '축약'], [true, '확장']] as const).map(([w, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => setWide(w)}
              className={`rounded px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                wide === w ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >{label}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-text-secondary">
          <span>슬롯 {tracks.length}</span>
          <span className="text-border">·</span>
          <span>현재 <span className="font-semibold text-text-primary">{activeTrack?.label ?? '—'}</span></span>
          <span className="text-border">·</span>
          <span>길이 {activeDur.toFixed(2)}초</span>
          {trimmed && (
            <>
              <span className="text-border">·</span>
              <span className="text-amber-300">선택 {trimStart.toFixed(2)}–{trimEnd.toFixed(2)} ({(trimEnd - trimStart).toFixed(2)}초)</span>
            </>
          )}
          {trimSaving && <span className="animate-pulse text-amber-400">저장 중…</span>}
        </div>
      </div>

      {/* 트림 액션 — 한 묶음(저장 + 초기화) */}
      {activeFile && (
        <div role="group" className="inline-flex items-stretch overflow-hidden rounded border border-border">
          <button
            onClick={saveTrimmed}
            disabled={trimSaving || !trimmed}
            className="bg-accent px-3 py-1.5 text-sm font-semibold text-bg-primary hover:opacity-90 disabled:bg-bg-card disabled:text-text-secondary disabled:opacity-40"
          >
            {trimSaving ? '저장 중…' : trimmed ? '트림 저장' : '트림 저장 (구간 선택 필요)'}
          </button>
          <button
            onClick={() => { setTrimStart(0); setTrimEnd(activeFile.duration) }}
            disabled={!trimmed}
            className="border-l border-border bg-bg-card px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-40"
          >
            초기화
          </button>
        </div>
      )}

      {/* 파형 — 음원마다 한 줄 */}
      {tracks.length === 0 ? (
        <div className="px-1 py-2 text-sm italic text-text-secondary">아직 저장된 음원이 없다. 아래 「새 음원 생성」 에서 만든다.</div>
      ) : (
        <div className="space-y-2">
          {tracks.map(t => {
            const dur = t.file.duration
            const hasTrim = trimStart > 0.01 || (trimEnd > 0 && trimEnd < dur - 0.01)
            return (
              <div
                key={t.label}
                className={`rounded border ${t.active ? 'border-border bg-bg-card' : 'border-border/40 bg-bg-card/40 opacity-70 hover:opacity-100'}`}
              >
                <AudioWavePlayer
                  audioUrl={playUrl(t.file)}
                  duration={dur}
                  heightClass="h-14"
                  showRuler={t.active}
                  onTrimStart={setTrimStart}
                  onTrimEnd={setTrimEnd}
                  trimStart={hasTrim ? trimStart : undefined}
                  trimEnd={hasTrim ? trimEnd : undefined}
                  playbackRate={playbackRate}
                  gainDb={gainDb}
                  pxPerSec={wide ? 200 : 0}
                  headerTitle={<>
                    {t.label}
                    {t.active && <span className="ml-2 font-semibold text-accent">사용 중</span>}
                  </>}
                />
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 음원 만들기·자르기·저장 절차
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 서버 창구 네 곳 — 시리즈마다 주소와 본문이 다른 유일한 부분이다.
 * 나머지(만들기 중단, 소리 자르기, 저장 후 되읽기)는 전부 아래 훅이 똑같이 처리한다.
 */
export type VoiceGenEndpoints = {
  /** 미리듣기 합성 주소 — 엔진별 갈래 */
  previewUrl: (route: 'gemini' | 'gemini-v3' | 'elevenlabs') => string
  /** 저장 — 파일 이름과 소리 데이터를 넘긴다. 저장된 실제 길이(초)를 돌려주면 onSaved 로 흘려보낸다 */
  save: (fileName: string, base64: string) => Promise<{ success?: boolean; error?: string; duration?: number }>
  /** 저장된 음원을 내려받을 주소 — 자를 원본을 여기서 읽는다 */
  sourceUrl: (fileName: string) => string
  /**
   * 발화 시각 다시 잡기 — 서버 응답을 그대로 돌려준다.
   * 성공 판정은 훅이 한다(응답 본문 모양이 시리즈마다 달라 본문으로는 판정할 수 없다).
   */
  analyze: (key?: string) => Promise<Response>
}

type UseVoiceGenerationArgs = {
  endpoints: VoiceGenEndpoints
  /** 저장된 음원 정보(있는지·길이) — 자르기 초기값이자 자르기 원본 */
  activeFile: VoiceFile | undefined
  chosenEngine: GenEngine
  /** Gemini 말투 지시문 — 비어 있으면 구간에 저장된 값을 쓴다 */
  styleEdit: string
  /** ElevenLabs 로 보낼 본문 만들기 — 감정 표식·끝 여백 규칙이 시리즈마다 다르다 */
  buildText: (text: string) => string
  /** ElevenLabs 세부 값(안정성·표현 강도 등). 비우면 서버 기본값 */
  eleSettings?: Partial<EleSettings>
  /** ElevenLabs 목소리가 속한 계정 — 알면 넘겨 서버 조회를 건너뛴다 */
  eleAccountId?: string | null
  /** 저장할 파일 이름 만들기 — 서재 탐방은 엔진 폴더로 갈라 넣고, 세력도는 인물 파일 하나에 덮는다 */
  targetFile: (engine: EngineKind, key: string) => string
  error: string | null
  setError: (e: string | null) => void
  /** 저장 직후 실제 길이(초) 전달 — 받는 쪽이 화면·영상 길이를 이 음원에 맞춘다 */
  onSaved?: (durationSec: number) => void | Promise<void>
  /** 저장 직후 그 엔진을 쓰는 음원으로 전환 — 안 하면 창 밖 재생이 옛 음원을 계속 내보낸다 */
  onActivateEngine?: (engine: EngineKind) => void | Promise<void>
  /** 저장 후 음성 목록 다시 읽기 */
  onRefresh: () => void
  /** 발화 시각 다시 잡기가 끝난 뒤 */
  onAligned?: () => void
}

/**
 * 음원 만들기·미리듣기·자르기·저장 — 서재 탐방(book)과 세력도(faction)가 함께 쓴다.
 *
 * 두 시리즈가 이 절차를 통째로 복제해 두고 있었다. 소리를 풀어 읽고 자르고 되감는 부분은
 * 손대기 까다로운 데다 한쪽만 고쳐지면 곧바로 갈라지므로 여기 한 벌만 둔다.
 * 시리즈 차이는 endpoints 와 targetFile·buildText 로만 흡수한다.
 */
export function useVoiceGeneration({
  endpoints, activeFile, chosenEngine, styleEdit, buildText,
  eleSettings, eleAccountId, targetFile,
  error, setError, onSaved, onActivateEngine, onRefresh, onAligned,
}: UseVoiceGenerationArgs) {
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(() => activeFile?.duration ?? 0)
  const [trimSaving, setTrimSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  // 만드는 중 취소용 — handleGenerate 가 채우고 취소 버튼이 중단시킨다.
  const genAbortRef = useRef<AbortController | null>(null)
  // 저장된 음원 파형 강제 갱신용 — 저장 시 증가시켜 재생 주소에 붙인다(파일 이름이 같아 캐시 우회).
  const [reloadTick, setReloadTick] = useState(0)
  const [tempPreview, setTempPreview] = useState<TempPreview | null>(null)

  // ── 미리듣기 만들기 (엔진 분기) ──
  // saveImmediately=true 이면 미리듣기·자르기 단계를 건너뛰고 만든 음원을 바로 저장한다.
  const handleGenerate = async (spec: SegmentEngineSpec, key: string, text: string, opts?: { saveImmediately?: boolean }) => {
    if (!text.trim()) return
    if (genAbortRef.current) return // 이미 만드는 중 — 중복 호출 차단(빠른 더블클릭 대비)
    const ac = new AbortController()
    genAbortRef.current = ac
    setGenerating(true)
    setError(null)
    try {
      let res: Response
      let format: 'wav' | 'mp3'
      if (spec.engine === 'elevenlabs') {
        res = await fetch(endpoints.previewUrl('elevenlabs'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ac.signal,
          body: JSON.stringify({
            voiceId: String(spec.voiceParam ?? '').trim(),
            text: buildText(text),
            settings: eleSettings,
            // 아는 소속 계정이 있으면 힌트로 넘겨 오탐 조회를 막는다.
            ...(eleAccountId ? { accountId: eleAccountId } : {}),
          }),
        })
        format = 'mp3'
      } else {
        // 화면 입력칸 값(styleEdit)이 있으면 우선 사용 — 저장처가 없는 구간도 이번 호출에는 즉시 반영해
        // 한 번 들어보고 확정한다.
        const effectiveStyle = (styleEdit?.trim() || spec.stylePrefix || '').trim()
        const styled = effectiveStyle ? `${effectiveStyle}: ${text}` : text
        // gemini-v3(3.1)는 별도 라우트. 나오는 wav 는 같은 형식이라 저장 자리는 gemini 와 공유한다.
        const route = chosenEngine === 'gemini-v3' ? 'gemini-v3' : 'gemini'
        res = await fetch(endpoints.previewUrl(route), {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ac.signal,
          body: JSON.stringify({ voiceName: spec.voiceParam, text: styled }),
        })
        format = 'wav'
      }
      const data = await res.json()
      if (!data.success) { setError(data.error ?? '생성 실패'); return }

      // 생성 및 저장 — 미리듣기/자르기를 거치지 않고 전체 음원을 바로 저장한다.
      if (opts?.saveImmediately) {
        const saveData = await endpoints.save(targetFile(spec.engine, key), data.base64)
        if (!saveData.success) { setError(saveData.error ?? '저장 실패'); return }
        if (typeof saveData.duration === 'number' && saveData.duration > 0) await onSaved?.(saveData.duration)
        if (tempPreview) { URL.revokeObjectURL(tempPreview.blobUrl); setTempPreview(null) }
        // 방금 저장한 엔진을 쓰는 음원으로 전환 — 안 하면 창 밖 재생이 옛 음원을 계속 내보낸다.
        await onActivateEngine?.(spec.engine)
        setReloadTick(Date.now())
        playDing() // 자동 재생 대신 완료 '띵' 알림만
        onRefresh()
        return
      }

      const rawBytes = Uint8Array.from(atob(data.base64), c => c.charCodeAt(0))
      const mime = format === 'wav' ? 'audio/wav' : 'audio/mpeg'
      const blob = new Blob([rawBytes], { type: mime })
      const blobUrl = URL.createObjectURL(blob)
      const duration = await new Promise<number>((resolve, reject) => {
        const a = new Audio(blobUrl)
        a.addEventListener('loadedmetadata', () => resolve(a.duration), { once: true })
        a.addEventListener('error', () => reject(new Error('audio load failed')), { once: true })
      })
      if (tempPreview) URL.revokeObjectURL(tempPreview.blobUrl)
      setTempPreview({ engine: spec.engine, key, blobUrl, base64: data.base64, duration, format })
      setTrimStart(0)
      setTrimEnd(duration)
    } catch (e) {
      // 사용자가 취소한 경우는 오류로 표시하지 않는다.
      if ((e as Error)?.name === 'AbortError') return
      setError(String(e))
    } finally {
      setGenerating(false)
      genAbortRef.current = null
    }
  }

  // 만드는 중 취소 — 진행 중인 합성 요청을 중단한다.
  const handleCancelGenerate = () => genAbortRef.current?.abort()

  // ── 발화 시각 다시 잡기 ──
  // 저장된 음원이 마음에 들 때 눌러, 그 음원에 맞춰 받아쓰기·발화 시각을 다시 잡는다.
  // 자막 나누기는 건드리지 않아 기존 분할이 유지된다. 수 초~수십 초 걸린다.
  const [aligning, setAligning] = useState(false)
  const alignCurrent = async (key?: string) => {
    if (aligning) return
    setAligning(true)
    setError(null)
    try {
      const ar = await endpoints.analyze(key)
      const ad = await ar.json().catch(() => ({}))
      // 성공 판정은 HTTP 상태로 한다 — 서재 탐방은 { ok:true }, 세력도는 { taskId } 를 돌려주므로
      // 본문 필드로 판정하면 세력도가 항상 실패로 읽힌다.
      if (!ar.ok) setError('정렬 실패: ' + (ad.error ?? ar.statusText))
      else { playDing(); onAligned?.() }
    } catch (e) {
      setError('정렬 에러: ' + String(e))
    } finally {
      setAligning(false)
    }
  }

  // ── 미리듣기 저장 ──
  const handleSavePreview = async (key?: string) => {
    if (!tempPreview) return
    if (key !== undefined && tempPreview.key !== key) return
    setTrimSaving(true)
    try {
      const isTrimmed = trimStart > 0.01 || trimEnd < tempPreview.duration - 0.01
      let saveBase64 = tempPreview.base64
      if (isTrimmed) {
        const resp = await fetch(tempPreview.blobUrl)
        const audioCtx = new AudioContext()
        const audioBuf = await audioCtx.decodeAudioData(await resp.arrayBuffer())
        const wavBuf = encodeWAV(audioBuf, trimStart, trimEnd)
        saveBase64 = abToBase64(wavBuf)
        await audioCtx.close()
      }
      const data = await endpoints.save(targetFile(tempPreview.engine, tempPreview.key), saveBase64)
      if (!data.success) { setError(data.error ?? '저장 실패'); return }
      if (typeof data.duration === 'number' && data.duration > 0) await onSaved?.(data.duration)
      // 방금 저장한 엔진을 쓰는 음원으로 전환 — 창 밖 재생이 새 음원을 내보내게 한다.
      await onActivateEngine?.(tempPreview.engine)
      URL.revokeObjectURL(tempPreview.blobUrl)
      setTempPreview(null)
      setReloadTick(Date.now())
      onRefresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setTrimSaving(false)
    }
  }

  // ── 저장된 음원 자르기 ──
  const saveTrimmed = async () => {
    const f = activeFile
    if (!f) return
    const isTrimmed = trimStart > 0.01 || (trimEnd > 0 && trimEnd < f.duration - 0.01)
    if (!isTrimmed) return
    setTrimSaving(true)
    try {
      const resp = await fetch(endpoints.sourceUrl(f.name))
      const audioCtx = new AudioContext()
      const audioBuf = await audioCtx.decodeAudioData(await resp.arrayBuffer())
      const wavBuf = encodeWAV(audioBuf, trimStart, trimEnd)
      const base64 = abToBase64(wavBuf)
      await audioCtx.close()
      const saveData = await endpoints.save(f.name, base64)
      // 잘라서 길이가 줄었으니 저장된 길이도 새 값으로 갱신한다(영상 컷 길이·재생 동기화).
      if (typeof saveData.duration === 'number' && saveData.duration > 0) await onSaved?.(saveData.duration)
      setTrimStart(0)
      setTrimEnd(trimEnd - trimStart)
      setReloadTick(Date.now())
      onRefresh()
    } catch (e) {
      alert('트림 저장 실패: ' + String(e))
    } finally {
      setTrimSaving(false)
    }
  }

  return {
    trimStart, setTrimStart,
    trimEnd, setTrimEnd,
    trimSaving,
    generating,
    error,
    reloadTick,
    // 훅 밖에서 wav 를 바꾼 경우(들숨 제거 저장 등) 호출 — 저장 음원 주소를 갱신해 다시 읽게 한다.
    bumpReload: () => setReloadTick(Date.now()),
    tempPreview, setTempPreview,
    handleGenerate,
    handleCancelGenerate,
    aligning,
    alignCurrent,
    handleSavePreview,
    saveTrimmed,
  }
}
