'use client'

import { AudioWavePlayer, usePct } from '../AudioWavePlayer'
import type { Props } from './types'
import { useTimingEditor } from './useTimingEditor'
import { WaveOverlay } from './sections/WaveOverlay'
import { ResetControls } from './sections/ResetControls'
import { GuideAccordion } from './sections/GuideAccordion'
import { SegmentList } from './sections/SegmentList'
import { JsonEditor } from './sections/JsonEditor'
import { UiLabel } from '@/components/ui-label'

export function VoiceTimingEditor({ audioUrl, duration, sentences: initialSentences, timings, onChange, onSegmentsChange, segmentsRef }: Props) {
  const pct = usePct(duration)
  const editor = useTimingEditor({ timings, duration, initialSentences, onChange, onSegmentsChange, segmentsRef })

  return (
    <div className="relative space-y-2">
      <UiLabel ko="자막 타이밍 편집" code="VoiceTimingEditor" />
      <AudioWavePlayer
        audioUrl={audioUrl}
        duration={duration}
        boundaries={timings.slice(0, -1).map(t => t.end)}
        onDoubleClick={editor.handleDblClick}
        onTimeClick={editor.handleWaveTimeClick}
        onHoverTime={editor.setHoverT}
        heightClass="h-56"
        pxPerSec={120}
      >
        <WaveOverlay
          timings={timings}
          segments={editor.segments}
          activeSegment={editor.activeSegment}
          hoveredMark={editor.hoveredMark}
          shiftHeld={editor.shiftHeld}
          hoverT={editor.hoverT}
          pct={pct}
          handlePointerDown={editor.handlePointerDown}
          handleSubPointerDown={editor.handleSubPointerDown}
        />
      </AudioWavePlayer>

      <ResetControls
        onResetAll={editor.resetAll}
        onRedistributeText={editor.redistributeText}
      />

      <GuideAccordion
        guideOpen={editor.guideOpen}
        setGuideOpen={editor.setGuideOpen}
      />

      <SegmentList
        timings={timings}
        segments={editor.segments}
        activeSegment={editor.activeSegment}
        setActiveSegment={editor.setActiveSegment}
        inputRefs={editor.inputRefs}
        updateSegments={editor.updateSegments}
        updateSub={editor.updateSub}
        removeSubBoundary={editor.removeSubBoundary}
        shiftWord={editor.shiftWord}
      />

      <JsonEditor
        jsonOpen={editor.jsonOpen}
        jsonText={editor.jsonText}
        jsonError={editor.jsonError}
        setJsonOpen={editor.setJsonOpen}
        setJsonText={editor.setJsonText}
        setJsonError={editor.setJsonError}
        onToggle={editor.toggleJson}
        onChange={onChange}
      />
    </div>
  )
}
