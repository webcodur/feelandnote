'use client'

import { useEffect, useState } from 'react'
import type { FactionPerson } from '@/lib/faction-types'
import type { VoiceFile } from '../voice-utils'
import { VOICE } from '@feelandnote/shared/lib/voice-policy'
import { Mic } from './icons'
import { useFactionVoice } from './FactionVoiceContext'
import { FactionExpandedVoicePanel } from './voice-panel'
import { AudioWavePlayer } from '../AudioWavePlayer'

/**
 * 인물 한 명의 대사 음성 패널 — 접기/펼치기 헤더 + 북리커맨드 음성 패널 통복제 본체.
 *
 * 본체(FactionExpandedVoicePanel)는 북리커맨드 ExpandedVoicePanel 을 화면 그대로 옮긴 것이다
 * (저장된 음원·트림·새 음원 생성·미리듣기·생성 및 저장까지 동일 슬레이트 톤·레이아웃).
 * 데이터만 인물 1명(quote 음성)으로 연결했다.
 *
 * 헤더는 행을 컴팩트하게 유지하기 위한 접기/펼치기 토글이며, 펼치면 북리커맨드와 같은 화면이 나온다.
 */
export function FactionVoicePanel({
  person,
  onChange,
  series,
  episodeName,
  voiceFile,
  hasQuote,
}: {
  person: FactionPerson
  onChange: (next: FactionPerson) => void
  series: string
  episodeName: string
  /** 이 인물 음원 파일명 (예 F01P01-quote.wav) — 저장·재생 대상 */
  voiceFile: string
  /** 대사가 있는지 — 없으면 패널 자체 미노출 */
  hasQuote: boolean
}) {
  const voiceCtx = useFactionVoice()
  const [open, setOpen] = useState(false)

  if (!hasQuote) return null

  const engine = person.quoteEngine ?? 'gemini'
  const engineLabel = engine === 'elevenlabs' ? 'ELE' : engine === 'gemini-v3' ? 'GEM 3.1' : 'GEM 2.5'
  const voiceSummary = engine === 'elevenlabs'
    ? (person.quoteElevenlabsVoiceId || 'ID 미설정')
    : (person.quoteSpeaker || VOICE.celeb)

  // 저장된 음원 메타 → 북리커맨드 VoiceFile 형태로 어댑트(존재 시).
  const meta = voiceCtx?.byFile.get(voiceFile)
  const activeFile: VoiceFile | undefined = meta
    ? { name: voiceFile, sizeKB: Math.round(meta.size / 1024), duration: meta.duration, engine: 'gemini' }
    : undefined

  // 디스크에 음원이 있는데 인물 quoteDuration 이 아직 「없을 때만」 디스크 길이로 채운다.
  // 파이프라인 밖에서 만든 기존 음원도 패널이 뜨는 즉시 길이가 채워져 렌더에서 재생된다.
  //
  // ⚠ 이미 값이 있으면 덮어쓰지 않는다. 인물 위치 변경(reorder) 직후엔 음원 파일은 swap 됐지만
  //   voiceByFile 캐시(meta)가 아직 옛 길이를 들고 있어, 「어긋나면 보정」을 켜두면 방금 인물과 함께
  //   따라온 정확한 길이를 옛 인물 길이로 잘못 덮어쓴다(앤드루↔제이슨 6.97 사고). 생성·트림은
  //   onSaved 로 명시 갱신하고, 외부 교체로 어긋난 길이는 `voice:faction --update-json` 으로 일괄 정정한다.
  useEffect(() => {
    if (!meta || meta.duration <= 0) return
    const cur = person.quoteDuration ?? 0
    if (cur <= 0) onChange({ ...person, quoteDuration: meta.duration })
  }, [meta?.duration, person, onChange])

  // 모달 열림 중 Esc 로 닫기.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="rounded-md border border-border bg-bg-main/40">
      {/* 헤더 — 모달 열기 버튼 + 현재 엔진/보이스 요약 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-bg-hover"
        title="이 인물 음성 설정 열기"
      >
        <Mic size={13} className="shrink-0 text-text-dim" />
        <span className="text-xs font-semibold text-text-secondary">음성 설정</span>
        <span className="rounded border border-border bg-bg-card px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
          {engineLabel}
        </span>
        <span className="truncate font-mono text-[10px] text-text-dim">{voiceSummary}</span>
        {meta && (
          <span className="font-mono text-[10px] text-accent">{meta.duration.toFixed(1)}s</span>
        )}
        <span className="ml-auto text-[10px] text-text-dim">설정 열기 ▸</span>
      </button>

      {/* 헤더 아래 재생바 — 모달을 열지 않고 저장된 음원을 바로 들어본다.
          배속·게인은 인물 설정값을 그대로 반영해 렌더와 같은 청취 조건으로 들린다. */}
      {activeFile && (
        <div className="border-t border-border px-2 py-1.5">
          <AudioWavePlayer
            audioUrl={`/api/${series}/faction-voice/${encodeURIComponent(episodeName)}/${encodeURIComponent(voiceFile)}?t=${meta?.size ?? 0}`}
            duration={activeFile.duration}
            heightClass="h-8"
            playbackRate={person.quotePlaybackRate}
            gainDb={person.quoteGainDb}
          />
        </div>
      )}

      {/* 음성 설정 모달 — 바깥 클릭·Esc 로 닫힌다. 본체(FactionExpandedVoicePanel)는 그대로 띄운다. */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-bg-card shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <Mic size={15} className="shrink-0 text-text-dim" />
              <h3 className="truncate text-sm font-semibold text-text-primary">{person.name || '인물'} · 음성 설정</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-auto rounded p-1 text-text-secondary hover:bg-bg-hover"
                title="닫기 (Esc)"
              >✕</button>
            </div>
            <div className="overflow-auto p-3">
              <FactionExpandedVoicePanel
                person={person}
                onChange={onChange}
                series={series}
                episodeName={episodeName}
                voiceFile={voiceFile}
                activeFile={activeFile}
                onRefresh={() => voiceCtx?.reload?.()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
