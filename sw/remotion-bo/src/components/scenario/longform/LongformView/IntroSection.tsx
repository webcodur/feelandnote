'use client'

import { ScenarioRow } from '../../ScenarioRow'
import { SaveButton } from '../../SaveButton'
import { SegmentSfxEditor } from '../../SegmentSfxEditor'
import { RowSpeakerSelect } from '../../RowSpeakerSelect'
import { GainDbInput } from '../../GainDbInput'
import type { Speaker } from '../../SpeakerPanel'
import { LongformCopyAllButton } from '../CopyButton'
import { lookupVoice } from '../../utils'
import type { VoiceSection } from '../../../voice-utils'
import type { EpisodeData, SfxItem } from '../../../EpisodeEditor'
import { EditorPanel } from '../../EditorPanel'

/**
 * 인트로 영역(메타 탭) — 서비스 인사 / 인물 / 명언 / 인물 소개 / 감상철학 / 브릿지 / 마무리.
 *
 * 각 행은 ScenarioRow 그대로 사용. 부분 저장 버튼이 우측에 붙는다.
 */
export function IntroSection({
  episode, sectionMap, onUpdate, onToggleExpand, activeEngine, playingKey, onTogglePlay,
  series, name, saveField, sfxFiles, sfxBase, speakers, uN, uH,
}: {
  episode: EpisodeData
  sectionMap: Map<string, VoiceSection>
  onUpdate: (ep: EpisodeData) => void
  onToggleExpand: (key: string) => void
  activeEngine: (key: string) => string
  playingKey: string | null
  onTogglePlay: (key: string, gainDb?: number | null) => void
  series: string
  name: string
  saveField: (path: Array<string | number>, value: unknown) => Promise<void>
  sfxFiles: { name: string; duration: number | null }[]
  sfxBase: string
  /** 화자 풀 — LongformView에서 host 가상 화자가 합성된 배열로 전달된다. */
  speakers: Speaker[]
  /** narrator·host 단일 필드 갱신 — useLongformState가 만든 헬퍼. */
  uN: (field: string, value: string) => void
  uH: (field: string, value: string) => void
}) {
  const narrator = episode.narrator!
  const host = episode.host!
  const allBooks = episode.books ?? []

  // SFX·화자·게인 형제 필드 — narrator.serviceGreeting → serviceGreetingSfx / serviceGreetingSpeaker / serviceGreetingGainDb.
  type SiblingSuffix = 'Sfx' | 'Speaker' | 'GainDb'
  type SiblingValue = SfxItem[] | string | number | undefined
  const setSibling = (field: string[], suffix: SiblingSuffix, next: SiblingValue) => {
    const [target, key] = field as [string, string]
    const sibKey = `${key}${suffix}`
    const parent = (target === 'narrator' ? { ...narrator } : { ...host }) as Record<string, unknown>
    const isEmpty = next == null
      || (suffix === 'Sfx' && Array.isArray(next) && next.length === 0)
      || (suffix === 'Speaker' && next === '')
      || (suffix === 'GainDb' && next === 0)
    if (isEmpty) delete parent[sibKey]
    else parent[sibKey] = next
    if (target === 'narrator') onUpdate({ ...episode, narrator: parent as typeof narrator })
    else onUpdate({ ...episode, host: parent as typeof host })
  }
  const getSibling = <T,>(field: string[], suffix: SiblingSuffix): T | undefined => {
    const [target, key] = field as [string, string]
    const parent = (target === 'narrator' ? narrator : host) as Record<string, unknown>
    return parent[`${key}${suffix}`] as T | undefined
  }

  const vi = (key: string, dur?: number) => lookupVoice(sectionMap, key, dur)
  const vUrl = (key: string) => `/api/${series}/voice/play/${name}/${key}.wav`

  const row = (props: {
    label: string; role: string; value: string; field: string[]; key_: string; duration?: number; rawValue?: string
  }) => {
    const speakerId = getSibling<string>(props.field, 'Speaker')
    const speakerObj = speakerId ? speakers.find(s => s.id === speakerId) : undefined
    const accentColor = speakerObj?.color
    const fieldGainDb = getSibling<number>(props.field, 'GainDb')
    return (
      <div
        style={accentColor ? { borderLeft: `3px solid ${accentColor}`, paddingLeft: 6 } : undefined}
      >
        <ScenarioRow
          label={props.label} role={props.role} value={props.value}
          voiceInfo={vi(props.key_, props.duration)} onCommit={v => {
            const [target, field] = props.field as [string, string]
            if (target === 'narrator') uN(field, v)
            else uH(field, v)
          }}
          sectionKey={props.key_} audioUrl={vUrl(props.key_)}
          activeEngine={activeEngine(props.key_)} isPlaying={playingKey === props.key_} onTogglePlay={() => onTogglePlay(props.key_, fieldGainDb)}
          onToggleExpand={() => onToggleExpand(props.key_)}
          actions={<SaveButton onSave={() => saveField(props.field, props.rawValue ?? props.value)} />}
          footer={
            <>
              <RowSpeakerSelect
                value={speakerId}
                onChange={next => setSibling(props.field, 'Speaker', next)}
                speakers={speakers}
                name={`speaker-${props.key_}`}
              />
              <SegmentSfxEditor
                sfx={getSibling<SfxItem[]>(props.field, 'Sfx')}
                files={sfxFiles}
                basePath={sfxBase}
                onChange={next => setSibling(props.field, 'Sfx', next)}
              />
              <GainDbInput
                value={fieldGainDb}
                onChange={next => setSibling(props.field, 'GainDb', next)}
                sectionKey={props.key_}
              />
            </>
          }
        />
      </div>
    )
  }

  // 헤더 요약용 — 활성 행 수 카운트(없는 행은 표시 자체 안 함)
  const activeRows = [
    true,                       // 서비스 인사 (항상 표시)
    !!narrator.serviceIntro,
    !!host.featuredQuote,
    true,                       // 인물 소개 (항상 표시)
    true,                       // 감상철학 (항상 표시)
    !!narrator.bridge,
    !!narrator.outro,
  ].filter(Boolean).length

  return (
    <EditorPanel
      title="롱폼 인트로 (IntroSection)"
      icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
      collapsible
      summaryNode={
        <span className="flex items-center gap-2">
          <span className="text-xs font-bold opacity-70 tabular-nums">{activeRows}구간</span>
          <span onClick={e => e.preventDefault()}>
            <LongformCopyAllButton narrator={narrator} host={host} books={allBooks} />
          </span>
        </span>
      }
      contentClassName="p-3"
    >
      {row({ label: '서비스 인사', role: 'narrator', value: narrator.serviceGreeting ?? '', field: ['narrator', 'serviceGreeting'], key_: 'A1-service-greeting', duration: narrator.serviceGreetingDuration, rawValue: narrator.serviceGreeting ?? '' })}
      {narrator.serviceIntro && row({ label: '오늘의 인물', role: 'narrator', value: narrator.serviceIntro, field: ['narrator', 'serviceIntro'], key_: 'A2-service-intro', duration: narrator.serviceIntroDuration })}
      {host.featuredQuote && row({ label: '대표 명언', role: 'celeb', value: host.featuredQuote, field: ['host', 'featuredQuote'], key_: 'A3-featured-quote', duration: host.featuredQuoteDuration })}
      {row({ label: '인물 소개', role: 'narrator', value: narrator.celebIntro ?? '', field: ['narrator', 'celebIntro'], key_: 'B1-celeb-intro', duration: narrator.celebIntroDuration, rawValue: narrator.celebIntro ?? '' })}
      {row({ label: '감상철학', role: 'celeb', value: host.philosophy ?? '', field: ['host', 'philosophy'], key_: 'B2-philosophy', duration: host.voiceDuration, rawValue: host.philosophy ?? '' })}
      {narrator.bridge && row({ label: '브릿지', role: 'narrator', value: narrator.bridge, field: ['narrator', 'bridge'], key_: 'B3-bridge', duration: narrator.bridgeDuration })}
      {narrator.outro && row({ label: '마무리', role: 'narrator', value: narrator.outro, field: ['narrator', 'outro'], key_: 'Z1-outro', duration: narrator.outroDuration })}
    </EditorPanel>
  )
}
