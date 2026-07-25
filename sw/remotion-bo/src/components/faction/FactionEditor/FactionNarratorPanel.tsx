'use client'

import { useState } from 'react'
import type { FactionScript, FactionNarrator, FactionNarratorVoice, FactionPerson } from '@/lib/faction-types'
import type { VoiceFile } from '../../voice-utils'
import { factionOpeningReadText, vnNarratorLogline } from '@/lib/faction-voice'
import { useFactionVoice } from '../shared/FactionVoiceContext'
import { FactionVoicePanel } from './FactionGroupEditor/FactionPersonRow/FactionVoicePanel/FactionVoicePanel'
import { FactionVoiceSettingsModal } from './FactionGroupEditor/FactionPersonRow/FactionVoicePanel/voice-panel/FactionVoiceSettingsModal'
import { QUOTE_SLOT, type FactionVoiceSlot } from './FactionGroupEditor/FactionPersonRow/FactionVoicePanel/voice-panel/voice-slots'

/**
 * 팩션 낭독 음성 편집 카드.
 *
 * 화면에 등장하는 별도 나레이터 인물을 만들지 않는다. 이곳의 한 목소리가
 *  - 선택한 영상 제목·시작문구를 시작 화면에서 읽고,
 *  - 롱폼 챕터명과 각 인물 수식어 음성의 기본 목소리가 된다.
 *
 * 인물별 epithet* 음성 설정이 있으면 그 인물만 공용값보다 우선한다.
 */

type NarrationSlotKey = 'opening'

const SLOT_DEFS: Record<NarrationSlotKey, { label: string; file: string; slot: FactionVoiceSlot }> = {
  opening: {
    label: '팩션 낭독 음성',
    file: vnNarratorLogline(),
    slot: { ...QUOTE_SLOT, label: '팩션 낭독 음성', hasSync: false },
  },
}

export function FactionNarratorPanel({
  script,
  update,
  series,
  episodeName,
}: {
  script: FactionScript
  update: (patch: Partial<FactionScript>) => void
  series: string
  episodeName: string
}) {
  const voice = useFactionVoice()
  const [openKey, setOpenKey] = useState<NarrationSlotKey | null>(null)
  const n = script.narrator

  const setNarrator = (patch: Partial<FactionNarrator>) => {
    if (!n) return
    update({ narrator: { ...n, ...patch } })
  }

  if (!n) {
    return (
      <div className="rounded-lg border border-border bg-bg-card/50 p-3">
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-text-dim">팩션 낭독 음성</div>
          <button
            type="button"
            onClick={() => update({ narrator: { readLogline: true, logline: {} } })}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-text-secondary hover:bg-bg-hover"
          >
            + 낭독 음성 추가
          </button>
          <p className="text-[11px] text-text-dim">
            하나의 목소리로 제목·시작문구·챕터명과 필요한 인물의 수식어를 읽는다. 별도 해설자는 등장하지 않는다.
          </p>
        </div>
      </div>
    )
  }

  const openingText = factionOpeningReadText(script)
  // 시작 낭독을 모두 꺼도 공용 목소리는 수식어용으로 설정할 수 있어야 하므로 미리듣기 샘플을 남긴다.
  const openingSample = openingText || script.logline?.trim() || script.title

  const personFor = (_key: NarrationSlotKey): FactionPerson => {
    const v: FactionNarratorVoice = { ...(n.logline ?? {}), quote: openingSample }
    return { ...v, name: '팩션 낭독 음성' } as unknown as FactionPerson
  }

  const saveVoice = (key: NarrationSlotKey) => (next: FactionPerson) => {
    const { name: _name, ...rest } = next as unknown as FactionNarratorVoice & { name?: string }
    if (key === 'opening') setNarrator({ logline: { ...rest, quote: openingText || rest.quote } })
  }

  const activeFileFor = (file: string): VoiceFile | undefined => {
    const meta = voice?.byFile.get(file)
    return meta
      ? { name: file, sizeKB: Math.round(meta.size / 1024), duration: meta.duration, engine: 'gemini' }
      : undefined
  }

  const openingStale = !!openingText.trim()
    && !!n.logline?.quoteDuration
    && !!n.logline?.quote
    && n.logline.quote !== openingText
  const openingAudioCurrent = !!n.logline?.quoteDuration && n.logline?.quote === openingText
  const hasPartSpecificOpening = !!(
    Object.keys(script.titleByPart ?? {}).length
    || Object.keys(script.loglineByPart ?? {}).length
  )
  return (
    <div className="space-y-3 rounded-lg border border-border bg-bg-card/50 p-3">
      <div className="flex items-center gap-3">
        <div className="text-xs font-semibold text-text-dim">팩션 낭독 음성</div>
        <p className="flex-1 text-[11px] text-text-dim">
          제목·시작문구·챕터명·수식어가 같은 목소리를 공유한다. 개별 음성에서 값을 바꾸면 그 항목만 예외가 된다.
        </p>
        <button
          type="button"
          onClick={() => {
            if (confirm('팩션 낭독 음성 설정을 제거할까? (만든 음원 파일은 남는다)')) update({ narrator: undefined })
          }}
          className="rounded-md border border-border px-2 py-1 text-[11px] text-text-dim hover:bg-bg-hover"
        >
          제거
        </button>
      </div>

      <div className="rounded-md border border-border/70 p-2 space-y-2">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs font-semibold text-text-secondary">낭독 대상</span>
          <label className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={n.readTitle ?? false}
              onChange={e => setNarrator({ readTitle: e.target.checked ? true : undefined })}
            />
            영상 제목
          </label>
          <label className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={n.readLogline ?? true}
              onChange={e => setNarrator({ readLogline: e.target.checked })}
            />
            시작문구
          </label>
          <label className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={n.readChapterTitle ?? false}
              onChange={e => setNarrator({ readChapterTitle: e.target.checked ? true : undefined })}
            />
            챕터명
          </label>
          {openingStale && (
            <span
              className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500"
              title="읽을 항목이나 문구가 바뀌었다. 다시 생성해야 화면과 소리가 맞는다"
            >
              낭독문 변경됨 — 재생성 필요
            </span>
          )}
        </div>

        <p className="whitespace-pre-line text-[11px] leading-relaxed text-text-dim">
          {openingText.trim() || '시작 낭독은 꺼져 있다. 아래 목소리 설정은 인물 수식어의 공용 기본값으로만 사용된다.'}
        </p>
        {hasPartSpecificOpening && openingText.trim() && (
          <p className="text-[10px] text-amber-500">
            편별 제목·시작문구가 있다. 현재 공용 시작 음원은 위 전역 문구 한 벌만 읽으므로 편별 영상에는 따로 확인이 필요하다.
          </p>
        )}

        <FactionVoicePanel
          person={personFor('opening')}
          series={series}
          episodeName={episodeName}
          voiceFile={SLOT_DEFS.opening.file}
          hasContent={!!openingSample.trim()}
          meta={openingAudioCurrent ? voice?.byFile.get(SLOT_DEFS.opening.file) : undefined}
          activeFile={openingAudioCurrent ? activeFileFor(SLOT_DEFS.opening.file) : undefined}
          onOpenModal={() => setOpenKey('opening')}
          slot={SLOT_DEFS.opening.slot}
        />
      </div>

      {openKey && (
        <FactionVoiceSettingsModal
          person={personFor(openKey)}
          onChange={saveVoice(openKey)}
          series={series}
          episodeName={episodeName}
          voiceFile={SLOT_DEFS[openKey].file}
          activeFile={openingAudioCurrent ? activeFileFor(SLOT_DEFS[openKey].file) : undefined}
          onRefresh={() => voice?.reload?.()}
          onClose={() => setOpenKey(null)}
          slot={SLOT_DEFS[openKey].slot}
        />
      )}
    </div>
  )
}
