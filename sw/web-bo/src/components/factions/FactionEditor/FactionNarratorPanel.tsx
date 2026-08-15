'use client'

import { useState } from 'react'
import type { FactionScript, FactionNarrator, FactionNarratorVoice, FactionPerson } from '@/lib/faction-types'
import type { VoiceFile } from '@feelandnote/shared/bo/voice-utils'
import {
  fixedFactionOpeningVoiceId,
  withFixedFactionOpeningVoice,
} from '@feelandnote/shared/lib/faction-voice-provider'
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
      <section className="rounded-xl border border-border bg-bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-accent">공용 음성</p>
            <h2 className="mt-1 text-lg font-bold text-text-primary">팩션 낭독</h2>
            <p className="mt-1 text-sm text-text-secondary">제목·시작문구·챕터명과 인물 수식어가 한 목소리를 공유합니다.</p>
          </div>
          <button
            type="button"
            onClick={() => update({ narrator: { readLogline: true, logline: {} } })}
            className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-text-primary"
          >
            + 낭독 음성 추가
          </button>
        </div>
      </section>
    )
  }

  const openingText = factionOpeningReadText(script)
  const fixedVoiceId = fixedFactionOpeningVoiceId(episodeName)
  // 시작 낭독을 모두 꺼도 공용 목소리는 수식어용으로 설정할 수 있어야 하므로 미리듣기 샘플을 남긴다.
  // 읽을 대상을 하나도 안 골라도 음원은 이 문구로 만들어지고, 아래 판정도 전부 이 값을 기준으로 한다.
  const readText = openingText.trim() || script.logline?.trim() || script.title

  const personFor = (): FactionPerson => {
    const v: FactionNarratorVoice = withFixedFactionOpeningVoice(episodeName, {
      ...(n.logline ?? {}),
      quote: readText,
    })
    return { ...v, name: '팩션 낭독 음성' } as unknown as FactionPerson
  }

  const saveVoice = (key: NarrationSlotKey) => (next: FactionPerson) => {
    const { name, ...rest } = next as unknown as FactionNarratorVoice & { name?: string }
    void name
    if (key === 'opening') {
      setNarrator({
        logline: withFixedFactionOpeningVoice(episodeName, { ...rest, quote: readText }),
      })
    }
  }

  const activeFileFor = (file: string): VoiceFile | undefined => {
    const meta = voice?.byFile.get(file)
    return meta
      ? { name: file, sizeKB: Math.round(meta.size / 1024), duration: meta.duration, engine: 'gemini' }
      : undefined
  }

  // 만들어 둔 음원은 읽을 대상을 골랐는지와 무관하게 항상 드러낸다 — 판정 기준은 디스크에 파일이
  // 있는지 하나뿐이다. (읽을 대상을 다 끄면 음원 자리가 통째로 비어 보이던 문제)
  const openingMeta = voice?.byFile.get(SLOT_DEFS.opening.file)
  const openingStale = !!openingMeta && !!n.logline?.quote && n.logline.quote !== readText
  const hasPartSpecificOpening = !!(
    Object.keys(script.titleByPart ?? {}).length
    || Object.keys(script.loglineByPart ?? {}).length
  )
  return (
    <section className="space-y-4 rounded-xl border border-border bg-bg-card p-4">
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-accent">공용 음성</p>
          <h2 className="mt-1 text-lg font-bold text-text-primary">팩션 낭독</h2>
          <p className="mt-1 text-sm text-text-secondary">제목·시작문구·챕터명·수식어가 같은 목소리를 공유합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm('팩션 낭독 음성 설정을 제거할까? (만든 음원 파일은 남는다)')) update({ narrator: undefined })
          }}
          className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-danger/15 hover:text-danger-text"
        >
          제거
        </button>
      </header>

      <fieldset className="space-y-3 rounded-lg border border-border bg-bg-main p-3">
        <legend className="sr-only">팩션 낭독 설정</legend>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-bold text-text-primary">낭독 대상</span>
          <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={n.readTitle ?? false}
              onChange={e => setNarrator({ readTitle: e.target.checked ? true : undefined })}
            />
            영상 제목
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={n.readLogline ?? true}
              onChange={e => setNarrator({ readLogline: e.target.checked })}
            />
            시작문구
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={n.readChapterTitle ?? false}
              onChange={e => setNarrator({ readChapterTitle: e.target.checked ? true : undefined })}
            />
            챕터명
          </label>
          {openingStale && (
            <span
              className="rounded-md bg-amber-500/15 px-2 py-1 text-xs font-semibold text-amber-500"
              title="읽을 항목이나 문구가 바뀌었다. 다시 생성해야 화면과 소리가 맞는다"
            >
              낭독문 변경됨 — 재생성 필요
            </span>
          )}
        </div>

        {!openingText.trim() && (
          <p className="text-sm leading-relaxed text-text-secondary">
            시작 화면에서 읽을 대상을 하나도 안 골랐다. 아래 문구로 음원은 만들어 두고 들어볼 수 있으며,
            이 목소리는 인물 수식어의 공용 기본값으로 쓰인다.
          </p>
        )}
        <p className="whitespace-pre-line rounded-lg border border-border bg-bg-card px-3 py-2 text-sm leading-relaxed text-text-secondary">{readText}</p>
        {fixedVoiceId && (
          <p className="rounded-md border border-violet-500/40 bg-violet-500/10 px-2.5 py-1.5 text-xs font-semibold text-violet-300">
            세력도감 공통 전문 성우 · 모든 팩션의 시작문구가 같은 성우로 고정됩니다.
          </p>
        )}
        {hasPartSpecificOpening && openingText.trim() && (
          <p className="text-sm text-amber-500">
            편별 제목·시작문구가 있다. 현재 공용 시작 음원은 위 전역 문구 한 벌만 읽으므로 편별 영상에는 따로 확인이 필요하다.
          </p>
        )}

        <FactionVoicePanel
          person={personFor()}
          series={series}
          episodeName={episodeName}
          voiceFile={SLOT_DEFS.opening.file}
          hasContent={!!readText.trim()}
          meta={openingMeta}
          activeFile={activeFileFor(SLOT_DEFS.opening.file)}
          onOpenModal={() => setOpenKey('opening')}
          slot={SLOT_DEFS.opening.slot}
        />
      </fieldset>

      {openKey && (
        <FactionVoiceSettingsModal
          person={personFor()}
          onChange={saveVoice(openKey)}
          series={series}
          episodeName={episodeName}
          voiceFile={SLOT_DEFS[openKey].file}
          activeFile={activeFileFor(SLOT_DEFS[openKey].file)}
          onRefresh={() => voice?.reload?.()}
          onClose={() => setOpenKey(null)}
          slot={SLOT_DEFS[openKey].slot}
        />
      )}
    </section>
  )
}
