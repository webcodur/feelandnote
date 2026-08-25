'use client'

import { useMemo, useState } from 'react'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import type { VoiceFile } from '@feelandnote/shared/bo/voice-utils'
import type { FactionPerson } from '@/lib/faction-types'
import { stripCommonEpithetVoice, withCommonEpithetVoice } from '@/lib/faction-voice'
import { useFactionVoice } from '../../shared/FactionVoiceContext'
import { FactionVoicePanel } from './FactionPersonRow/FactionVoicePanel/FactionVoicePanel'
import { FactionVoiceSettingsModal } from './FactionPersonRow/FactionVoicePanel/voice-panel'
import { EPITHET_SLOT } from './FactionPersonRow/FactionVoicePanel/voice-panel/voice-slots'

type Props = {
  person: FactionPerson
  voiceFile: string
  series: string
  episodeName: string
  editLang: EditLang
  onChange: (next: FactionPerson) => void
}

/** 독립 인물 카드에서 쓰던 수식어 음성 도구를 할당 대사의 인물 기본값 안에 둔다. */
export function FactionAssignedPersonEpithetVoice({
  person,
  voiceFile,
  series,
  episodeName,
  editLang,
  onChange,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const voice = useFactionVoice()
  const localizedEpithet = editLang === 'en' ? person.epithetEn ?? person.epithet : person.epithet
  const inheritedPerson = useMemo(() => {
    const next = withCommonEpithetVoice(person, voice?.commonNarrationVoice)
    return editLang === 'en' && person.epithetEn
      ? { ...next, epithet: person.epithetEn }
      : next
  }, [editLang, person, voice?.commonNarrationVoice])
  const meta = voice?.byFile.get(voiceFile)
  const activeFile: VoiceFile | undefined = meta
    ? { name: voiceFile, sizeKB: Math.round(meta.size / 1024), duration: meta.duration, engine: 'gemini' }
    : undefined

  if (!voice || !localizedEpithet?.trim()) return null

  const changeVoice = (next: FactionPerson) => onChange(stripCommonEpithetVoice({
    ...person,
    epithetDuration: next.epithetDuration,
    epithetGainDb: next.epithetGainDb,
    epithetPlaybackRate: next.epithetPlaybackRate,
    epithetSpeaker: next.epithetSpeaker,
    epithetStyle: next.epithetStyle,
    epithetElevenlabsVoiceId: next.epithetElevenlabsVoiceId,
    epithetElevenlabsVoiceIdEn: next.epithetElevenlabsVoiceIdEn,
    epithetEleOptions: next.epithetEleOptions,
    epithetEleEmotions: next.epithetEleEmotions,
    epithetEleTrail: next.epithetEleTrail,
  }, voice.commonNarrationVoice))

  return (
    <div data-faction-epithet-voice-file={voiceFile} className="border-t border-border/60 px-3 pb-3 pt-2">
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] text-text-dim">
        <span className="font-bold text-text-secondary">수식어 낭독 기본값</span>
        <span>{voice.commonNarrationVoice
          ? '공용 낭독값을 상속하고, 여기서 바꾼 값만 인물에 남습니다.'
          : '이 인물의 수식어를 낭독할 때 쓰는 설정입니다.'}</span>
      </div>
      <FactionVoicePanel
        person={inheritedPerson}
        series={series}
        episodeName={episodeName}
        voiceFile={voiceFile}
        hasContent
        meta={meta}
        activeFile={activeFile}
        onOpenModal={() => setModalOpen(true)}
        slot={EPITHET_SLOT}
        lang={editLang}
      />
      {modalOpen ? (
        <FactionVoiceSettingsModal
          person={inheritedPerson}
          onChange={changeVoice}
          series={series}
          episodeName={episodeName}
          voiceFile={voiceFile}
          activeFile={activeFile}
          onRefresh={() => voice.reload?.()}
          onClose={() => setModalOpen(false)}
          slot={EPITHET_SLOT}
          lang={editLang}
        />
      ) : null}
    </div>
  )
}
