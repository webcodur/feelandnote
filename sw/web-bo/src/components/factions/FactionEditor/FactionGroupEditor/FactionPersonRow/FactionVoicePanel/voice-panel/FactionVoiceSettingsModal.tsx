'use client'

import type { FactionPerson } from '@/lib/faction-types'
import type { VoiceFile } from '@feelandnote/shared/bo/voice-utils'
import { VoiceEditorShell, type VoiceEditorModeDef } from '@feelandnote/shared/bo/voice'
import { Mic } from '@feelandnote/shared/bo/icons'
import {
  FactionExpandedVoicePanel,
  FACTION_VOICE_MODE_LABEL,
  type FactionVoiceMode,
} from './FactionExpandedVoicePanel'
import { QUOTE_SLOT, type FactionVoiceSlot } from './voice-slots'
import type { EditLang } from '@feelandnote/shared/bo/editor'

/**
 * 인물 한 명의 음성 설정 창 — 공용 편집 창 껍데기(VoiceEditorShell)에 세력도감 본체를 얹는다.
 *
 * 아코디언을 펼치지 않고도 인물 행 헤더에서 바로 열 수 있도록 행(FactionPersonRow) 레벨에서 소유한다.
 * 펼친 폼 안의 음성 패널(FactionVoicePanel) 헤더 버튼도 같은 창을 연다.
 */
export function FactionVoiceSettingsModal({
  person,
  onChange,
  series,
  episodeName,
  voiceFile,
  activeFile,
  onRefresh,
  onClose,
  slot = QUOTE_SLOT,
  lang,
}: {
  person: FactionPerson
  onChange: (next: FactionPerson) => void
  series: string
  episodeName: string
  voiceFile: string
  activeFile: VoiceFile | undefined
  onRefresh: () => void
  onClose: () => void
  /** 음성 슬롯 — 대사(기본) 또는 수식어 */
  slot?: FactionVoiceSlot
  /** 편집 언어 — 엔진·목소리 칸과 셀럽 보이스 연동이 이 언어를 따른다 */
  lang?: EditLang
}) {
  // 수식어 슬롯에는 발화 시각 교정(싱크)이 없다 — 그 탭을 뺀다.
  const modes: VoiceEditorModeDef<FactionVoiceMode>[] = (['main', 'sync', 'breath', 'age'] as const)
    .filter(m => slot.hasSync || m !== 'sync')
    .map(m => ({ id: m, label: FACTION_VOICE_MODE_LABEL[m] }))

  return (
    <VoiceEditorShell
      icon={<Mic size={15} className="shrink-0 text-text-dim" />}
      title={person.name || '인물'}
      subtitle={slot.label}
      modes={modes}
      onClose={onClose}
    >
      {mode => (
        <FactionExpandedVoicePanel
          person={person}
          onChange={onChange}
          series={series}
          episodeName={episodeName}
          voiceFile={voiceFile}
          activeFile={activeFile}
          onRefresh={onRefresh}
          slot={slot}
          mode={mode}
          lang={lang}
        />
      )}
    </VoiceEditorShell>
  )
}
