'use client'

import { useState } from 'react'
import { AudioWavePlayer, usePct } from '../AudioWavePlayer'
import type { Props } from './types'
import { useTimingEditor } from './useTimingEditor'
import { WaveOverlay } from './sections/WaveOverlay'
import { ResetControls } from './sections/ResetControls'
import { GuideAccordion } from './sections/GuideAccordion'
import { SegmentList } from './sections/SegmentList'
import { JsonEditor } from './sections/JsonEditor'

export function VoiceTimingEditor({ audioUrl, duration, sentences: initialSentences, timings, onChange, onSegmentsChange, segmentsRef }: Props) {
  // 파형·오버레이·경계 드래그의 위치 배율은 실제 디코드된 오디오 길이로 통일한다.
  // prop duration(메타)이 실제 파일 길이와 다르면 오버레이(주황선·경계)가 마우스와 어긋나므로 실측 길이를 단일 기준으로 삼는다.
  const [realDur, setRealDur] = useState(duration)
  const pct = usePct(realDur)
  const editor = useTimingEditor({ timings, duration: realDur, initialSentences, onChange, onSegmentsChange, segmentsRef })

  return (
    <div className="relative space-y-2">
      <AudioWavePlayer
        audioUrl={audioUrl}
        duration={duration}
        boundaries={timings.slice(0, -1).map(t => t.end)}
        onDoubleClick={editor.handleDblClick}
        onTimeClick={editor.handleWaveTimeClick}
        onHoverTime={editor.setHoverT}
        onDurationResolved={setRealDur}
        headerTitle="자막 타이밍 보정 영역"
        heightClass="h-56"
        pxPerSec={120}
        autoActivate
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
