'use client'

import { useMemo, useState } from 'react'
import { useEpisode } from '@/lib/episode-context'
import { GeminiVoiceSelect } from '../scenario-voice/GeminiVoiceSelect'
import type { SpeakerEngine } from './SpeakerPanel'
import { HostVoiceMapping, type SaveScope } from './HostVoiceMapping'
import { inferHostEngine } from './speakerHelpers'
import { SpeakerEngineToggle } from './SpeakerEngineToggle'
import { EleVoiceExpandButton } from './EleVoiceExpandButton'

/**
 * host 전용 화자 행 — 화자 설정 패널 첫 줄에 고정 마운트.
 *
 * 일반 화자와 같은 그리드를 유지하되, 추가로 펼침 영역에서:
 *  - ELE 보이스 목록·검색·미리듣기·DB 동기화(HostVoiceMapping 본문).
 *  - Gemini 보이스는 사전 정의 이름 드롭다운(행 인라인).
 *  - 엔진 토글(GEM/ELE)에 따라 host.voiceEngine 필드 갱신.
 *
 * 데이터:
 *  - host.voiceEngine: 활성 엔진 (없으면 elevenlabsVoiceId 보유 여부로 추정)
 *  - host.elevenlabsVoiceId, host.geminiVoice: 엔진별 보이스 값
 *  - DB 미러: profiles.voice_id_ko / voice_id_en (ELE 한정)
 */

const HOST_COLOR = '#c8a46e'  // accent gold — host 고정 색

/** 에피소드 파일명 → 인물 slug. -en 접미사, -숫자 변형 제거. */
function nameToSlug(name: string): string {
  const base = name.endsWith('-en') ? name.slice(0, -3) : name
  const m = base.match(/^(.+)-\d+$/)
  return m ? m[1] : base
}

export function HostSpeakerRow() {
  const { episode, name, isEn, updateEpisode, save, dirty } = useEpisode()
  const slug = useMemo(() => nameToSlug(name), [name])
  const locale: 'ko' | 'en' = isEn ? 'en' : 'ko'

  if (!episode?.host) return null

  const host = episode.host as {
    nickname?: string
    nickname_en?: string
    elevenlabsVoiceId?: string
    geminiVoice?: string
    voiceEngine?: SpeakerEngine
  }

  // 활성 엔진 — speakerHelpers의 추론 규칙과 같은 자리에서 결정한다.
  const engine: SpeakerEngine = inferHostEngine(host)
  const [open, setOpen] = useState(false)

  const setEngine = (next: SpeakerEngine) => {
    if (engine === next) return
    const ep = { ...episode, host: { ...episode.host, voiceEngine: next } }
    updateEpisode(ep as typeof episode)
  }

  const setGeminiVoice = (v: string) => {
    const ep = { ...episode, host: { ...episode.host, geminiVoice: v || undefined, voiceEngine: 'gemini' as SpeakerEngine } }
    updateEpisode(ep as typeof episode)
  }

  // ELE 보이스 적용 — scope에 따라 에피소드 JSON / DB / 둘 다 저장
  const applyEle = async (newId: string, scope: SaveScope): Promise<{ ok: boolean; message: string }> => {
    try {
      const messages: string[] = []

      if (scope === 'db' || scope === 'both') {
        const res = await fetch(`/api/celebs/${slug}/voice`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale, voiceId: newId }),
        })
        const d = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(d.error ?? `DB 저장 실패 (${res.status})`)
        messages.push(`DB(${locale}) 저장`)
      }

      if (scope === 'episode' || scope === 'both') {
        const next = { ...episode, host: { ...episode.host, elevenlabsVoiceId: newId, voiceEngine: 'elevenlabs' as SpeakerEngine } }
        updateEpisode(next as typeof episode)
        const result = await save(next as typeof episode)
        if (!result?.ok) throw new Error('에피소드 JSON 저장 실패')
        messages.push('에피소드 JSON 저장')
      }

      return { ok: true, message: messages.join(' · ') }
    } catch (e) {
      return { ok: false, message: '실패: ' + (e instanceof Error ? e.message : String(e)) }
    }
  }

  const nickname = host.nickname ?? host.nickname_en ?? '셀럽'
  const currentEleId = host.elevenlabsVoiceId ?? ''

  return (
    <div className="space-y-1">
      {/* 첫 줄 — 일반 화자 그리드와 동일 폭 */}
      <div className="grid grid-cols-[24px_100px_100px_auto_1fr_24px] gap-2 items-center text-sm font-bold">
        <span
          className="w-6 h-6 rounded border border-slate-500 shadow-sm shrink-0"
          style={{ backgroundColor: HOST_COLOR }}
          title="host 고정 색"
        />
        <span className="bg-bg-card border border-slate-400 rounded px-2 py-1 font-mono text-text-secondary font-black text-center shadow-xs">host</span>
        <span className="bg-bg-card border border-slate-400 rounded px-2 py-1 truncate text-text-primary font-extrabold shadow-xs" title={nickname}>{nickname}</span>
        {/* 엔진 토글 */}
        <SpeakerEngineToggle engine={engine} onChange={setEngine} />
        {/* 엔진별 보이스 — Gemini는 인라인 셀렉트, ELE는 현재값 표시(상세는 펼침) */}
        {engine === 'gemini' ? (
          <GeminiVoiceSelect
            value={host.geminiVoice ?? ''}
            onChange={setGeminiVoice}
            title="Gemini 캐릭터 보이스"
            placeholderLabel="보이스 선택…"
            className="px-2 py-1 bg-bg-card border border-slate-400 rounded text-text-primary font-bold shadow-xs focus:border-accent"
          />
        ) : (
          <EleVoiceExpandButton
            voiceId={currentEleId}
            open={open}
            onToggle={() => setOpen(o => !o)}
            title="펼쳐서 보이스 목록·DB 동기화"
          />
        )}
        <span />
      </div>

      {/* 펼침 — ELE 엔진일 때만. 보이스 목록·DB 동기화. */}
      {open && engine === 'elevenlabs' && (
        <HostVoiceMapping
          slug={slug}
          locale={locale}
          currentEleId={currentEleId}
          dirty={dirty}
          onApply={applyEle}
        />
      )}
    </div>
  )
}
