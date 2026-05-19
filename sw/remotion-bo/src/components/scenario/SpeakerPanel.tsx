'use client'

import { useEffect, useMemo, useState } from 'react'
import { useEpisode } from '@/lib/episode-context'
import { GeminiVoiceSelect } from '../scenario-voice/GeminiVoiceSelect'
import { HostSpeakerRow } from './HostSpeakerRow'
import { HostVoiceMapping, type SaveScope } from './HostVoiceMapping'
import { SpeakerEngineToggle } from './SpeakerEngineToggle'
import { EleVoiceExpandButton } from './EleVoiceExpandButton'

export type SpeakerEngine = 'gemini' | 'elevenlabs'

export interface Speaker {
  id: string
  label: string
  color: string
  /** 이 화자의 기본 엔진. 단일 엔진 + 단일 보이스 매핑. */
  engine?: SpeakerEngine
  /** engine 기준 보이스 ID/이름. ELE 는 voiceId, Gemini 는 사전 정의 이름. */
  voiceId?: string
  /** @deprecated 옛 필드. 호환 폴백 용도. 신규 저장은 engine+voiceId. */
  elevenlabsVoiceId?: string
}

const DEFAULT_COLORS = ['#3b82f6', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#0891b2', '#db2777', '#65a30d']

/** 에피소드 파일명 → 인물 slug. HostSpeakerRow 와 동일 규칙. */
function nameToSlug(name: string): string {
  const base = name.endsWith('-en') ? name.slice(0, -3) : name
  const m = base.match(/^(.+)-\d+$/)
  return m ? m[1] : base
}

/**
 * 추가 화자 한 줄. ELE 엔진일 때 host 와 동일한 보이스 선택 펼침 영역을 제공한다.
 * DB 미러는 host 전용이므로 추가 화자는 에피소드 JSON 에만 저장한다.
 */
function SpeakerRow({ speaker: s, onPatch, onSetEngine, onRemove, onRenameId }: {
  speaker: Speaker
  onPatch: (patch: Partial<Speaker>) => void
  onSetEngine: (engine: SpeakerEngine) => void
  onRemove: () => void
  /** id 커밋 시점 호출 — 다른 곳의 참조도 함께 새 id 로 마이그레이션. */
  onRenameId: (oldId: string, newId: string) => void
}) {
  const { name, isEn, dirty } = useEpisode()
  const slug = useMemo(() => nameToSlug(name), [name])
  const locale: 'ko' | 'en' = isEn ? 'en' : 'ko'
  const [open, setOpen] = useState(false)
  // id 는 키 입력 도중 매번 마이그레이션되면 곤란하므로 로컬 draft 로 두고 blur 시 커밋.
  const [idDraft, setIdDraft] = useState(s.id)
  useEffect(() => { setIdDraft(s.id) }, [s.id])

  // 일반 화자의 기본 엔진은 ELE. 명시값이 있으면 그것을 따른다.
  const engine: SpeakerEngine = s.engine ?? 'elevenlabs'
  const voiceValue = s.voiceId ?? (engine === 'elevenlabs' ? (s.elevenlabsVoiceId ?? '') : '')

  // ELE 보이스 적용 — 에피소드 JSON(speaker.voiceId)만 갱신. DB 는 건드리지 않는다.
  const applyEle = async (newId: string, _scope: SaveScope): Promise<{ ok: boolean; message: string }> => {
    onPatch({ voiceId: newId, elevenlabsVoiceId: newId, engine: 'elevenlabs' })
    return { ok: true, message: '에피소드 JSON 에 적용' }
  }

  const commitId = () => {
    const next = idDraft.trim()
    if (!next || next === s.id) { setIdDraft(s.id); return }
    onRenameId(s.id, next)
  }

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[24px_100px_100px_auto_1fr_24px] gap-2 items-center text-[11px]">
        <input
          type="color"
          value={s.color}
          onChange={e => onPatch({ color: e.target.value })}
          title="화자 색상"
          className="w-6 h-6 rounded cursor-pointer border border-border/40 bg-transparent p-0"
        />
        <input
          type="text"
          value={idDraft}
          onChange={e => setIdDraft(e.target.value)}
          onBlur={commitId}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          placeholder="id (영문)"
          title="화자 ID — segment.speaker 가 이 값을 참조. 변경하면 모든 참조가 새 ID 로 갱신된다."
          className="bg-bg-card border border-border/40 rounded px-2 py-1 font-mono"
        />
        <input
          type="text"
          value={s.label}
          onChange={e => onPatch({ label: e.target.value })}
          placeholder="라벨"
          title="화면 표시용 라벨"
          className="bg-bg-card border border-border/40 rounded px-2 py-1"
        />
        {/* 엔진 토글 */}
        <SpeakerEngineToggle
          engine={engine}
          onChange={onSetEngine}
          titles={{
            gemini: 'Gemini 엔진 — 캐릭터 보이스(사전 정의 이름)',
            elevenlabs: 'ElevenLabs 엔진 — 보이스 ID 입력',
          }}
        />
        {/* 엔진별 보이스 — Gemini 는 인라인 셀렉트, ELE 는 host 와 동일한 펼침 picker */}
        {engine === 'gemini' ? (
          <GeminiVoiceSelect
            value={voiceValue}
            onChange={v => onPatch({ voiceId: v || undefined })}
            title="Gemini 캐릭터 보이스 선택"
            placeholderLabel="보이스 선택…"
            className="px-2 py-1"
          />
        ) : (
          <EleVoiceExpandButton
            voiceId={voiceValue}
            open={open}
            onToggle={() => setOpen(o => !o)}
            title="펼쳐서 보이스 목록 · 미리듣기 · 적용"
          />
        )}
        <button
          type="button"
          onClick={onRemove}
          title="이 화자 삭제"
          className="text-text-dim hover:text-red-400 text-sm leading-none cursor-pointer"
        >×</button>
      </div>

      {/* ELE 엔진 펼침 — 보이스 목록·검색·미리듣기. DB 미러는 host 전용이므로 비활성. */}
      {open && engine === 'elevenlabs' && (
        <HostVoiceMapping
          slug={slug}
          locale={locale}
          currentEleId={voiceValue}
          dirty={dirty}
          onApply={applyEle}
          showDbMirror={false}
        />
      )}
    </div>
  )
}

function nextColor(existing: Speaker[]): string {
  const used = new Set(existing.map(s => s.color))
  return DEFAULT_COLORS.find(c => !used.has(c)) ?? DEFAULT_COLORS[existing.length % DEFAULT_COLORS.length]
}

/** 화자의 활성 엔진 · 보이스 해소. 옛 elevenlabsVoiceId 단독 필드도 흡수. */
export function getSpeakerVoice(s: Speaker | undefined | null): { engine: SpeakerEngine; voiceId: string } | null {
  if (!s) return null
  if (s.engine && s.voiceId) return { engine: s.engine, voiceId: s.voiceId }
  if (s.elevenlabsVoiceId) return { engine: 'elevenlabs', voiceId: s.elevenlabsVoiceId }
  return null
}

/** 저장 직전 정리 — 빈 voiceId 제거, 옛 필드 일치 시 정리. */
function normalize(s: Speaker): Speaker {
  const out: Speaker = { id: s.id, label: s.label, color: s.color }
  if (s.engine) out.engine = s.engine
  if (s.voiceId) out.voiceId = s.voiceId
  // 옛 필드: engine=ELE + voiceId 가 채워졌으면 옛 필드는 제거. 그 외에는 보존(다른 도구가 아직 옛 필드로 읽는 경우 대비).
  if (s.engine === 'elevenlabs' && s.voiceId) {
    // 옛 필드 제거
  } else if (s.elevenlabsVoiceId) {
    out.elevenlabsVoiceId = s.elevenlabsVoiceId
  }
  return out
}

export function SpeakerPanel({ speakers, onChange, onRenameId }: {
  speakers: Speaker[]
  onChange: (next: Speaker[]) => void
  /** id 가 바뀌면 호출. 호출자가 책 · 세그먼트 · 인트로의 화자 참조까지 새 id 로 갈아끼운다. */
  onRenameId?: (oldId: string, newId: string) => void
}) {
  const [open, setOpen] = useState(true)

  const addSpeaker = () => {
    const idBase = `speaker${speakers.length + 1}`
    const next: Speaker = { id: idBase, label: '새 화자', color: nextColor(speakers), engine: 'elevenlabs', voiceId: '' }
    onChange([...speakers, next])
    setOpen(true)
  }
  const updateSpeaker = (i: number, patch: Partial<Speaker>) => {
    const next = [...speakers]
    next[i] = normalize({ ...next[i], ...patch })
    onChange(next)
  }
  const renameId = (i: number, oldId: string, newId: string) => {
    // 동일 id 충돌 방지 — 다른 화자와 같으면 거부
    if (speakers.some((sp, j) => j !== i && sp.id === newId)) {
      alert(`이미 같은 ID 의 화자가 있다: ${newId}`)
      return
    }
    const next = [...speakers]
    next[i] = normalize({ ...next[i], id: newId })
    onChange(next)
    if (onRenameId) onRenameId(oldId, newId)
  }
  const setEngine = (i: number, engine: SpeakerEngine) => {
    const cur = speakers[i]
    if (cur.engine === engine) return
    // 엔진 전환 시 기존 voiceId 가 다른 엔진 값이라면 비운다. 옛 ELE 값은 보존(폴백).
    const carry = engine === 'elevenlabs' && cur.elevenlabsVoiceId ? cur.elevenlabsVoiceId : ''
    updateSpeaker(i, { engine, voiceId: carry })
  }
  const removeSpeaker = (i: number) => {
    if (!confirm(`화자 "${speakers[i].label}" 삭제? (이 화자에 연결된 구간은 미지정으로 돌아간다)`)) return
    onChange(speakers.filter((_, j) => j !== i))
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left cursor-pointer select-none outline-none hover:bg-bg-hover rounded"
      >
        <span className={`text-[10px] text-text-dim shrink-0 ${open ? 'rotate-90' : ''}`}>▶</span>
        <span className="text-[11px] font-bold text-text-secondary select-none">화자 설정 (Host + 추가 화자)</span>
        
        <span className="ml-auto flex items-center gap-1.5 opacity-80">
          <span className="text-[10px] text-text-secondary mr-1">host + {speakers.length}</span>
          {speakers.slice(0, 4).map(s => (
            <span key={s.id} className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} title={s.label} />
          ))}
          {speakers.length > 4 && <span className="text-[10px] ml-0.5">+{speakers.length - 4}</span>}
        </span>
      </button>

      {open && (
        <div className="mt-2 p-3 space-y-1.5 border border-border/40 bg-black/10 rounded-lg">
          {/* host 고정 행 — 인물 본인 보이스. 펼치면 ELE 보이스 목록 · DB 동기화. */}
          <HostSpeakerRow />
          {speakers.length > 0 && <div className="border-t border-border/40 my-1.5" />}
          {speakers.length === 0 && (
            <div className="text-[11px] text-text-secondary/60 italic pt-1">추가 화자 없음 — 아래 + 버튼으로 등장인물 · 화자 추가</div>
          )}
          {speakers.map((s, i) => (
            <SpeakerRow
              key={i}
              speaker={s}
              onPatch={patch => updateSpeaker(i, patch)}
              onSetEngine={engine => setEngine(i, engine)}
              onRemove={() => removeSpeaker(i)}
              onRenameId={(oldId, newId) => renameId(i, oldId, newId)}
            />
          ))}
          <div className="pt-1">
            <button
              type="button"
              onClick={addSpeaker}
              className="text-[11px] px-2 py-1 rounded border border-accent/40 text-accent hover:bg-accent/10 cursor-pointer"
            >+ 화자 추가</button>
          </div>
        </div>
      )}
    </div>
  )
}
