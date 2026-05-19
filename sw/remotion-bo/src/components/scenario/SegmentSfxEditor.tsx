'use client'

import React from 'react'

type SfxItem = { file: string; text?: string; offset?: number; volume?: number; duration?: number; fadeIn?: number; fadeOut?: number }
type FileMeta = { name: string; duration: number | null }

const fileName = (full: string) => full.split('/').pop() ?? ''

export function SegmentSfxEditor({ sfx, files, basePath, onChange }: {
  sfx?: SfxItem[]
  files: FileMeta[]
  basePath: string
  onChange: (next: SfxItem[] | undefined) => void
}) {
  const list = sfx ?? []

  const update = (idx: number, patch: Partial<SfxItem>) => {
    const next = [...list]
    const cur: SfxItem = { ...next[idx], ...patch }
    if (cur.text == null || cur.text === '') delete cur.text
    if (cur.offset == null || !Number.isFinite(cur.offset)) delete cur.offset
    if (cur.volume == null || !Number.isFinite(cur.volume)) delete cur.volume
    if (cur.duration == null || !Number.isFinite(cur.duration) || cur.duration <= 0) delete cur.duration
    if (cur.fadeIn == null || !Number.isFinite(cur.fadeIn) || cur.fadeIn <= 0) delete cur.fadeIn
    if (cur.fadeOut == null || !Number.isFinite(cur.fadeOut) || cur.fadeOut <= 0) delete cur.fadeOut
    next[idx] = cur
    onChange(next)
  }

  const remove = (idx: number) => {
    const next = list.filter((_, i) => i !== idx)
    onChange(next.length ? next : undefined)
  }

  const add = () => {
    const first = files[0]?.name
    if (!first || !basePath) return
    onChange([...list, { file: `${basePath}/${first}`, offset: 0, volume: 0.7 }])
  }

  return (
    <div className="flex items-start gap-1.5">
      <span className="text-text-secondary w-14 shrink-0 text-center text-[11px] pt-1">SFX</span>
      <div className="flex-1 space-y-1.5 min-w-0">
        {files.length === 0 ? (
          <div className="text-[11px] text-text-dim pt-1">soundeffect/ 폴더가 비어있다</div>
        ) : list.length === 0 ? (
          <div className="pt-0.5">
            <button type="button" onClick={add} className="text-[11px] text-text-secondary hover:text-accent transition-colors">+ 사운드 추가</button>
          </div>
        ) : (
          <div className="space-y-1 px-1">
            <div className="grid grid-cols-[1fr_60px_110px_50px_55px_55px_55px_24px] gap-1.5 items-center text-[10px] text-text-dim uppercase tracking-wide">
              <span>앵커 텍스트</span>
              <span className="text-center">시점 ± 초</span>
              <span>파일</span>
              <span className="text-center">볼륨</span>
              <span className="text-center" title="재생 길이 제한(초). 비우면 음원 끝까지">길이</span>
              <span className="text-center" title="시작 페이드인(초)">페이드인</span>
              <span className="text-center" title="끝나기 전 페이드아웃(초). 길이 지정 시에만 작동">페이드아웃</span>
              <span />
            </div>
            {list.map((s, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_60px_110px_50px_55px_55px_55px_24px] gap-1.5 items-center text-[11px]">
                <input
                  value={s.text ?? ''}
                  onChange={e => update(idx, { text: e.target.value })}
                  placeholder="비우면 구간 시작"
                  className="bg-bg-main border border-border/50 rounded px-1.5 py-0 h-[22px] focus:outline-none focus:border-accent/60"
                  title="대사에서 이 구절이 시작되는 시점이 기준점. 비우면 구간 시작 0초가 기준점"
                />
                <input
                  type="number" step={0.05}
                  value={Number.isFinite(s.offset) ? String(s.offset) : ''}
                  onChange={e => update(idx, { offset: parseFloat(e.target.value) })}
                  placeholder="0"
                  className="bg-bg-main border border-border/50 rounded px-1 py-0 h-[22px] text-center focus:outline-none focus:border-accent/60"
                  title="기준점에서 ± 초 (양수=뒤로 밀기, 음수=앞당기기)"
                />
                <select
                  value={fileName(s.file)}
                  onChange={e => update(idx, { file: basePath ? `${basePath}/${e.target.value}` : e.target.value })}
                  className="bg-bg-main border border-border/50 rounded px-1 py-0 h-[22px] focus:outline-none focus:border-accent/60"
                  title="재생할 사운드 이펙트 파일"
                >
                  {files.map(f => (
                    <option key={f.name} value={f.name}>
                      {f.name}{f.duration != null ? ` (${f.duration.toFixed(1)}s)` : ''}
                    </option>
                  ))}
                  {/* 현재 선택된 파일이 목록에 없으면 표시 (이름 변경/삭제된 경우) */}
                  {fileName(s.file) && !files.find(f => f.name === fileName(s.file)) && (
                    <option value={fileName(s.file)}>{fileName(s.file)} (없음)</option>
                  )}
                </select>
                <input
                  type="number" step={0.05} min={0} max={1}
                  value={Number.isFinite(s.volume) ? String(s.volume) : ''}
                  onChange={e => update(idx, { volume: parseFloat(e.target.value) })}
                  placeholder="0.7"
                  className="bg-bg-main border border-border/50 rounded px-1 py-0 h-[22px] text-center focus:outline-none focus:border-accent/60"
                  title="볼륨 0~1 (기본 0.7)"
                />
                <input
                  type="number" step={0.1} min={0}
                  value={Number.isFinite(s.duration) ? String(s.duration) : ''}
                  onChange={e => update(idx, { duration: parseFloat(e.target.value) })}
                  placeholder="끝까지"
                  className="bg-bg-main border border-border/50 rounded px-1 py-0 h-[22px] text-center focus:outline-none focus:border-accent/60"
                  title="재생 길이 제한(초). 비우면 음원 자체 길이만큼 끝까지 재생"
                />
                <input
                  type="number" step={0.1} min={0}
                  value={Number.isFinite(s.fadeIn) ? String(s.fadeIn) : ''}
                  onChange={e => update(idx, { fadeIn: parseFloat(e.target.value) })}
                  placeholder="0"
                  className="bg-bg-main border border-border/50 rounded px-1 py-0 h-[22px] text-center focus:outline-none focus:border-accent/60"
                  title="시작 페이드인(초). 0초부터 이 시간 동안 0→설정볼륨으로 차오름"
                />
                <input
                  type="number" step={0.1} min={0}
                  value={Number.isFinite(s.fadeOut) ? String(s.fadeOut) : ''}
                  onChange={e => update(idx, { fadeOut: parseFloat(e.target.value) })}
                  placeholder="0"
                  disabled={!Number.isFinite(s.duration) || (s.duration ?? 0) <= 0}
                  className="bg-bg-main border border-border/50 rounded px-1 py-0 h-[22px] text-center focus:outline-none focus:border-accent/60 disabled:opacity-40"
                  title="끝나기 전 페이드아웃(초). 길이 칸이 비어있으면 작동하지 않음"
                />
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="text-red-400 hover:text-red-300 text-xs"
                  title="이 SFX 삭제"
                >✕</button>
              </div>
            ))}
            <div>
              <button type="button" onClick={add} className="text-[10px] text-text-secondary hover:text-accent transition-colors">+ 사운드 추가</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
