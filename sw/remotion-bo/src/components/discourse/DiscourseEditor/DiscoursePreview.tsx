'use client'

/**
 * 미리보기 — 영상이 어떤 컷으로, 어떤 순서로, 몇 초씩 흐르는지 9:16 흐름 상자에 펼친다.
 *
 * 렌더 화면을 그대로 재생하지 않고 컷 흐름을 도식으로 본다.
 * 다만 팩션은 BO가 길이 산식을 근사치로 베껴 두었지만, 담화는 **렌더의 buildCues 를 그대로 불러 쓴다**
 * (shared/timing.ts). 미리보기 시각과 렌더 시각이 갈릴 여지를 없앤다.
 *
 * 렌더 화면 자체를 물리는 방법(@remotion/player)은 지금 쓸 수 없다 — 담화 렌더 뭉치는 에피소드 파일을
 * 빌드 시점에 훑어 담는 방식(require.context)이라 BO 앱 번들에 그대로 실을 수 없다. 그 통로가 열리면
 * 이 자리를 실제 재생 화면으로 바꾼다.
 */

import { useState } from 'react'
import type { DiscourseScript } from '@/lib/discourse-types'
import { KIND_LABEL } from '@feelandnote/remotion/src/compositions/Discourse/constants'
import { MediaThumb } from '@feelandnote/shared/bo/media'
import { buildCues, imageSrc, splitName, turnChunks, FPS } from '../shared/timing'
import { formatMmss } from '@feelandnote/shared/bo/editor'
import { castColorOf } from './sections/CastColorBar'

type Props = {
  script: DiscourseScript
  series: string
  episodeName: string
}

type Mode = { isShorts: boolean; part?: number; lvPart?: number; label: string }

export function DiscoursePreview({ script, series, episodeName }: Props) {
  // 편 선택 — 롱폼 전체가 기본. 편이 갈리면 그 편만 따로 본다
  const lvCount = (script.longformLayout ?? []).filter(it => 'cut' in it).length + 1
  const shortsParts = [...new Set((script.turns ?? []).filter(t => !t.disabled && t.part != null).map(t => t.part as number))].sort((a, b) => a - b)

  const modes: Mode[] = [
    { isShorts: false, label: lvCount > 1 ? '롱폼 전체' : '롱폼' },
    ...(lvCount > 1 ? Array.from({ length: lvCount }, (_, i) => ({ isShorts: false, lvPart: i + 1, label: `롱폼 ${i + 1}편` })) : []),
    ...(shortsParts.length ? shortsParts.map(p => ({ isShorts: true, part: p, label: `쇼츠 ${p}편` })) : [{ isShorts: true, label: '쇼츠' }]),
  ]
  const [modeIdx, setModeIdx] = useState(0)
  const mode = modes[modeIdx] ?? modes[0]

  const cues = buildCues(script, mode.isShorts, mode.part, mode.lvPart)
  const last = cues[cues.length - 1]
  const total = last ? (last.start + last.duration) / FPS : 0

  return (
    <div>
      {/* 편 선택 */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {modes.map((m, i) => (
          <button
            key={i}
            onClick={() => setModeIdx(i)}
            className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
              modeIdx === i ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-card text-text-secondary hover:border-accent hover:text-accent'
            }`}
          >
            {m.label}
          </button>
        ))}
        <span className="ms-2 text-xs text-text-secondary">총 길이 {formatMmss(total)} · 컷 {cues.length}개</span>
      </div>

      {/* 9:16 흐름 상자 */}
      <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-lg border border-border bg-bg-card">
        <div className="flex flex-col" style={{ aspectRatio: '9 / 16', minHeight: 560 }}>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {cues.map((tc, i) => {
              const at = formatMmss(tc.start / FPS)
              const sec = (tc.duration / FPS).toFixed(1)
              const c = tc.cue

              if (c.kind === 'intro') {
                const { head, rest } = splitName(script.title)
                return (
                  <div key={i} className="rounded-md bg-bg-secondary p-3 text-center">
                    <p className="text-[10px] text-text-dim">{at} · 시작 화면 {sec}초</p>
                    <p className="text-sm font-bold text-text-primary">{head || '영상 명칭 없음'}</p>
                    {rest && <p className="text-xs text-text-secondary">{rest}</p>}
                    {script.topic && <p className="mt-1 text-xs font-semibold text-accent">{script.topic}</p>}
                    {script.logline && <p className="text-[11px] text-text-secondary">{script.logline}</p>}
                  </div>
                )
              }

              if (c.kind === 'cast') {
                const sp = script.cast[c.castIndex]
                const color = castColorOf(sp, c.castIndex)
                const src = imageSrc(series, episodeName, sp?.image)
                return (
                  <div key={i} className="flex items-center gap-2 rounded-md bg-bg-main/40 p-2" style={{ borderInlineStart: `3px solid ${color}` }}>
                    {src
                      ? <MediaThumb src={src} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                      : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-secondary text-xs font-bold">{(sp?.name || '?')[0]}</span>}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] text-text-dim">{at} · 인물 소개 {sec}초</span>
                      <span className="block truncate text-xs font-semibold" style={{ color }}>{sp?.name || '?'}</span>
                      {sp?.epithet && <span className="block truncate text-[10px] text-text-dim">{sp.epithet}</span>}
                    </span>
                  </div>
                )
              }

              if (c.kind === 'era') {
                const { head, rest } = splitName(c.label)
                return (
                  <div key={i} className="rounded-md border-s-2 border-amber-500 bg-amber-500/10 p-2.5 text-center">
                    <p className="text-[10px] text-text-dim">{at} · 장 표지 {sec}초</p>
                    <p className="text-sm font-bold text-text-primary">{head || '문구 없음'}</p>
                    {rest && <p className="text-xs text-amber-600">{rest}</p>}
                  </div>
                )
              }

              if (c.kind === 'turn') {
                const t = script.turns[c.turnIndex]
                const sp = script.cast[t.cast]
                const color = castColorOf(sp, t.cast)
                const lead = KIND_LABEL[t.kind]
                const src = imageSrc(series, episodeName, t.image ?? sp?.image)
                const chunks = turnChunks(t)
                const changeAt = new Map((t.imageChanges ?? []).map(x => [x.chunk, x.image]))
                return (
                  <div key={i} className="space-y-1 rounded-md bg-bg-main/40 p-2" style={{ borderInlineStart: `3px solid ${color}` }}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-text-dim">{at} · {sec}초</span>
                      <span className="text-xs font-semibold" style={{ color }}>{sp?.name || '?'}</span>
                      {lead && (
                        <span className="rounded bg-bg-secondary px-1 text-[10px] font-semibold text-text-secondary">
                          {lead}{t.to != null && script.cast[t.to] ? ` → ${script.cast[t.to].name}` : ''}
                        </span>
                      )}
                      {!t.duration && <span className="rounded bg-warning px-1 text-[10px] font-semibold text-warning-text" title="음성이 없어 글자 수로 길이를 어림잡았습니다">추정</span>}
                    </div>
                    <div className="flex gap-2">
                      {src && <MediaThumb src={src} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        {chunks.map((ch, ci) => {
                          const img = changeAt.get(ci)
                          const chSrc = imageSrc(series, episodeName, img)
                          return (
                            <div key={ci} className="flex items-center gap-1">
                              {img && (chSrc
                                ? <MediaThumb src={chSrc} alt="" className="h-5 w-5 shrink-0 rounded object-cover" />
                                : <span className="h-5 w-5 shrink-0 rounded bg-danger" title="연결된 사진을 찾을 수 없습니다" />)}
                              <span className={`min-w-0 flex-1 truncate text-[11px] ${img ? 'font-semibold text-text-primary' : 'text-text-secondary'}`} title={ch}>
                                {ch}
                              </span>
                            </div>
                          )
                        })}
                        {t.origin && <p className="truncate text-[10px] italic text-info-text" title={t.origin}>“{t.origin}”</p>}
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <div key={i} className="rounded-md border border-dashed border-border bg-bg-main/40 p-2.5 text-center">
                  <p className="text-[10px] text-text-dim">{at} · 마지막 화면 {sec}초</p>
                  <p className="text-xs text-text-secondary">로고 · 고지</p>
                </div>
              )
            })}
          </div>

          {/* 상시 고지 — 어떤 컷에서도 화면 하단에 떠 있다 */}
          <div className="border-t border-border bg-bg-secondary px-3 py-1.5 text-center text-[10px] text-text-secondary">
            {script.notice?.trim() || '(기본 고지 문구가 나갑니다)'}
          </div>
        </div>
      </div>
    </div>
  )
}
