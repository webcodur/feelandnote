'use client'

import React from 'react'
import { TimeRuler, PlayheadOverlay } from '../TimeRuler'
import type { Props } from './types'
import { useAudioWavePlayer } from './useAudioWavePlayer'
import { WaveDisplayControls } from './WaveDisplayControls'

export function AudioWavePlayer({
  audioUrl, duration, boundaries, children,
  onClick, onTimeClick, onDoubleClick, heightClass = 'h-24', showRuler = true,
  trimStart, trimEnd, onTrimStart, onTrimEnd, onRegenerate, regenerating, pxPerSec: initialPxPerSec, autoPlay, onHoverTime, onDurationResolved,
  playbackRate, gainDb, autoActivate, headerTitle,
}: Props & { autoActivate?: boolean }) {
  const [zoom, setZoom] = React.useState(initialPxPerSec ?? 0)
  const [visualGain, setVisualGain] = React.useState(1)

  const {
    canvasRef, containerRef, playing, playhead, dur,
    onMouseMove, onMouseLeave, HoverOverlay,
    togglePlay, stop, handleClick, activate, isActive, handleDblClick, handleTrimDown,
    trimEndHandlePct, trimStartHandlePct, absWidth,
  } = useAudioWavePlayer({
    audioUrl, duration,
    onClick, onTimeClick, onDoubleClick,
    trimStart, trimEnd, onTrimStart, onTrimEnd, pxPerSec: zoom, autoPlay,
    playbackRate, gainDb, visualGain,
  })

  React.useEffect(() => {
    if (autoActivate) activate()
  }, [autoActivate, activate])

  // 실제 디코드된 오디오 길이를 부모에 보고 — 오버레이·경계 좌표 배율을 파형(실제 길이)에 맞춘다.
  React.useEffect(() => {
    if (dur > 0) onDurationResolved?.(dur)
  }, [dur, onDurationResolved])

  return (
    <div className={`rounded border transition-colors ${isActive ? 'border-accent shadow-[0_0_0_1px_var(--color-accent)]' : 'border-transparent'}`}>
    {headerTitle && (
      <div 
        onClick={() => activate()}
        className={`px-3 py-1.5 border-b rounded-t flex items-center justify-between cursor-pointer transition-colors ${
          isActive ? 'bg-accent/10 border-accent/30' : 'bg-bg-card border-border hover:bg-bg-hover'
        }`}
      >
        <div className={`text-xs font-semibold flex items-center gap-2 ${isActive ? 'text-accent' : 'text-text-primary'}`}>
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-accent' : 'bg-border'}`} />
          {headerTitle}
        </div>
        <span className="text-[10px] text-text-secondary font-mono">
          {playhead.toFixed(2)}s / {dur.toFixed(2)}s
        </span>
      </div>
    )}
    <div className={absWidth ? 'overflow-x-auto' : ''}>
    <div className="space-y-0" style={absWidth ? { width: `${absWidth}px` } : undefined}>
      {/* 눈금자 */}
      {showRuler && (
        <TimeRuler
          duration={dur}
          containerRef={containerRef}
          boundaries={boundaries}
          className={`${headerTitle ? '' : 'rounded-t'} border-b border-border`}
        />
      )}

      {/* 파형 + 트림 핸들 래퍼 */}
      <div className="relative">
        {/*
         * ⚠️ Space 정지 버그 근본 원인 & 해결 — 절대 tabIndex={0} 으로 되돌리지 말 것
         *
         * [증상] Space 누르면 "잠깐 멈췄다가 다시 재생됨" / 여러 번 눌러도 안 멈춤
         * [원인] tabIndex={0}이면 컨테이너가 키보드 focus 대상. 브라우저는
         *        focus된 요소에서 Space 키를 누르면 **click 이벤트를 자동 생성**(buttons·링크 접근성 표준).
         *        → window keydown이 togglePlay로 pause 한 직후,
         *          같은 Space가 click을 발동 → handleClick → playFrom → 다시 재생.
         *        재생↔정지가 한 번의 Space에 연달아 일어나 "방해만 잠깐"처럼 보인다.
         * [해결] 1) tabIndex={-1}  : 키보드 focus 제거 → Space-click 자동생성 차단
         *        2) onKeyDown에 Space preventDefault : 혹시 어떤 경로로 focus 들어와도 보호
         *        3) window keydown의 e.repeat 체크    : 키 길게 눌렀을 때 반복 toggle 방지
         *        4) _activePlayer 모듈 레벨 변수      : 여러 AudioWavePlayer 동시 반응 방지
         *
         * 이전 세션에서도 같은 버그로 여러 번 시도·실패했다. tabIndex 이슈를 건너뛰면 재발한다.
         */}
        <div
          ref={containerRef}
          tabIndex={-1}
          className={`relative w-full ${heightClass} bg-bg-main overflow-hidden select-none touch-none cursor-crosshair ${showRuler ? 'rounded-b' : 'rounded'}`}
          onClick={(e) => { activate(); handleClick(e) }}
          onPointerDown={activate}
          onMouseEnter={activate}
          onDoubleClick={onDoubleClick ? handleDblClick : undefined}
          onMouseMove={(e) => {
            onMouseMove(e)
            if (onHoverTime) {
              const r = containerRef.current?.getBoundingClientRect()
              if (r && dur > 0) onHoverTime(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * dur)
            }
          }}
          onMouseLeave={() => { onMouseLeave(); onHoverTime?.(null) }}
          onKeyDown={(e) => { if (e.code === 'Space') e.preventDefault() }}
        >
          <canvas ref={canvasRef} width={absWidth ?? 1200} height={96} className="w-full h-full" />
          {HoverOverlay}
          <PlayheadOverlay playhead={playhead} duration={dur} playing={playing} />
          {dur > 0 && trimEnd !== undefined && trimEnd < dur - 0.01 && (
            <div className="absolute inset-y-0 right-0 bg-red-900/40 pointer-events-none"
              style={{ width: `${(1 - trimEnd / dur) * 100}%` }} />
          )}
          {dur > 0 && trimStart !== undefined && trimStart > 0.01 && (
            <div className="absolute inset-y-0 left-0 bg-black/40 pointer-events-none"
              style={{ width: `${(trimStart / dur) * 100}%` }} />
          )}
          {children}
        </div>
        {onTrimStart && dur > 0 && (
          <div
            className="absolute top-0 bottom-0 w-6 -ml-3 cursor-ew-resize z-20 flex items-center justify-center group select-none"
            style={{ left: `${trimStartHandlePct}%`, touchAction: 'none' }}
            draggable={false}
            onPointerDown={handleTrimDown('start')}
          >
            <div className="w-1 h-full bg-red-400 group-hover:bg-red-300 group-hover:w-1.5 rounded-full transition-all" />
          </div>
        )}
        {onTrimEnd && dur > 0 && (
          <div
            className="absolute top-0 bottom-0 w-6 -ml-3 cursor-ew-resize z-20 flex items-center justify-center group select-none"
            style={{ left: `${trimEndHandlePct}%`, touchAction: 'none' }}
            draggable={false}
            onPointerDown={handleTrimDown('end')}
          >
            <div className="w-1 h-full bg-red-400 group-hover:bg-red-300 group-hover:w-1.5 rounded-full transition-all" />
          </div>
        )}
      </div>

    </div>
    </div>

      {/* 컨트롤 — 가로스크롤 영역 밖에 둬 긴 파형(가로 스크롤)에서도 좌하단에 항상 보인다 */}
      <div className="flex items-center gap-4 mt-2 px-1 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={togglePlay}
            className="px-2 py-0.5 rounded text-xs bg-bg-card border border-border hover:bg-bg-hover">
            {playing ? '⏸ 일시정지' : '▶ 재생'}
          </button>
          {(playing || playhead > 0) && (
            <button onClick={stop}
              className="px-2 py-0.5 rounded text-xs bg-bg-card border border-border hover:bg-bg-hover">
              ■ 정지
            </button>
          )}
          {onRegenerate && (
            <button onClick={onRegenerate} disabled={regenerating}
              className="px-2 py-0.5 rounded text-xs bg-bg-card border border-border hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed">
              {regenerating ? '↻ 생성 중…' : '↻ 재생성'}
            </button>
          )}
          {!headerTitle && (
            <span className="text-[10px] text-text-secondary font-mono ml-1">
              {playhead.toFixed(2)}s / {dur.toFixed(2)}s
            </span>
          )}
        </div>
        <div className="ml-auto">
          <WaveDisplayControls
            zoom={zoom} setZoom={setZoom}
            visualGain={visualGain} setVisualGain={setVisualGain}
          />
        </div>
      </div>
    </div>
  )
}
