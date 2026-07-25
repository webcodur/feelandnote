import React from 'react'

type Props = {
  zoom: number
  setZoom: (v: number) => void
  visualGain: number
  setVisualGain: (v: number) => void
  /** 확대 슬라이더의 기본값 및 범위 (기본 0~1000) */
  zoomMax?: number
  /** 증폭 슬라이더의 기본값 및 범위 (기본 1~10) */
  gainMax?: number
}

export function WaveDisplayControls({
  zoom, setZoom,
  visualGain, setVisualGain,
  zoomMax = 1000,
  gainMax = 10,
}: Props) {
  return (
    <div className="flex items-center gap-4 text-xs text-text-secondary">
      <label className="flex items-center gap-2" title="파형 가로 길이 확대 (0이면 화면에 맞춤)">
        <span className="shrink-0">확대</span>
        <input 
          type="range" min={0} max={zoomMax} step={10} value={zoom}
          onChange={e => setZoom(Number(e.target.value))} 
          className="w-20 accent-accent" 
        />
      </label>
      <label className="flex items-center gap-2" title="파형 세로 높이 증폭 (소리에는 영향 없음)">
        <span className="shrink-0">증폭</span>
        <input 
          type="range" min={1} max={gainMax} step={0.5} value={visualGain}
          onChange={e => setVisualGain(Number(e.target.value))} 
          className="w-20 accent-accent" 
        />
      </label>
    </div>
  )
}
