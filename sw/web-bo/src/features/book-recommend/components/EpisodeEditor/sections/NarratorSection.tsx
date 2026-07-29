import { Section, FieldWithDuration } from '../fields'
import { BADGE_CLS } from '../constants'
import type { useEpisodeEditor } from '../useEpisodeEditor'

type Ctx = ReturnType<typeof useEpisodeEditor>

export function NarratorSection({ ctx }: { ctx: Ctx }) {
  const { episode, openSections, toggle, setNarrator } = ctx
  return (
    <Section id="narrator" title="NARRATOR" open={!!openSections.narrator} onToggle={toggle}>
      <FieldWithDuration label="서비스 인사" value={episode.narrator.serviceGreeting ?? ''} onChange={v => setNarrator('serviceGreeting', v)}
        duration={episode.narrator.serviceGreetingDuration} rows={2} />
      <FieldWithDuration label="서비스 소개" value={episode.narrator.serviceIntro ?? ''} onChange={v => setNarrator('serviceIntro', v)}
        duration={episode.narrator.serviceIntroDuration} rows={2} />
      <FieldWithDuration label="인물 소개" value={episode.narrator.celebIntro ?? ''} onChange={v => setNarrator('celebIntro', v)}
        duration={episode.narrator.celebIntroDuration} rows={3} />
      <FieldWithDuration label="브릿지" value={episode.narrator.bridge} onChange={v => setNarrator('bridge', v)}
        duration={episode.narrator.bridgeDuration} />
      <FieldWithDuration label="아웃트로" value={episode.narrator.outro} onChange={v => setNarrator('outro', v)}
        duration={episode.narrator.outroDuration} rows={3} />
      {episode.narrator.returnIntro != null && (
        <FieldWithDuration label="복귀 인사 (continuation)" value={episode.narrator.returnIntro ?? ''} onChange={v => setNarrator('returnIntro', v)}
          duration={episode.narrator.returnIntroDuration} rows={2} />
      )}
      {episode.narrator.prevRecap != null && (
        <FieldWithDuration label="이전 파트 요약 (continuation)" value={episode.narrator.prevRecap ?? ''} onChange={v => setNarrator('prevRecap', v)}
          duration={episode.narrator.prevRecapDuration} rows={2} />
      )}
      <div className="flex gap-3 flex-wrap">
        {episode.narrator.labelSummaryDuration != null && <span className={BADGE_CLS}>요약 라벨: {episode.narrator.labelSummaryDuration}s</span>}
        {episode.narrator.labelContextDuration != null && <span className={BADGE_CLS}>맥락 라벨: {episode.narrator.labelContextDuration}s</span>}
        {episode.narrator.interludeDuration != null && <span className={BADGE_CLS}>중간안내: {episode.narrator.interludeDuration}s</span>}
      </div>
    </Section>
  )
}
