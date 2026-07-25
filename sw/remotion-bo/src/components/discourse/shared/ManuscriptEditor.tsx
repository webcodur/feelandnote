'use client'

/**
 * 담화 원고 연속 에디터 — 팩션 대사 편집기(FactionQuoteEditor)의 이식·확장판.
 *
 * 같은 기법: 투명 미러 오버레이 + textarea. 자유롭게 타이핑하고, 줄 위 장식(전환 라인·라벨)이
 * 마킹을 겸한다 — 쓰기와 마킹이 한 화면에서 동시에 된다.
 *
 * 팩션에서 그대로 가져온 것: 엔터 = 덩어리(chunk) 경계, 덩어리 줄 위 점선 전환 라인 + 라벨,
 * 커서 줄의 「＋ 전환」, 라벨 드래그 이동, ✕ 삭제, [field-sizing:content] 자동 높이.
 * 담화 확장: **빈 줄 = 발언(turn) 경계**, 발언 첫 줄의 화자 칩(클릭해 교체) + 인물색 세로 라인,
 * 앵커 좌표가 (발언, 발언 내 덩어리)의 2차원, 커서 위치가 선택 발언을 알린다(세부 패널 연동).
 */

import { useMemo, useRef, useState } from 'react'
import type { Speaker, Turn } from '@/lib/discourse-types'
import { ImageIcon, X } from '@feelandnote/shared/bo/icons'
import { castColorOf } from '../DiscourseEditor/sections/CastColorBar'

/** 앵커 좌표 — 몇 번째 발언의 몇 번째 덩어리인가 (chunk 0 = 시작 사진 자리라 앵커 제외) */
export type AnchorPos = { turn: number; chunk: number }

type Props = {
  value: string
  onChange: (v: string) => void
  /** 문단 순서와 1:1 대응하는 발언 배열 — 화자 칩·앵커 표시용 */
  turns: Turn[]
  cast: Speaker[]
  onSetCast: (turnIdx: number, castIdx: number) => void
  onAddAnchor: (pos: AnchorPos) => void
  onRemoveAnchor: (pos: AnchorPos) => void
  onMoveAnchor: (from: AnchorPos, to: AnchorPos) => void
  /** 커서가 놓인 발언 — 세부 패널이 따라온다. 빈 줄이면 null */
  onCursorTurn: (turnIdx: number | null) => void
  placeholder?: string
}

/** 줄 하나의 정체 — 빈 줄(발언 경계) 또는 (발언, 덩어리) 좌표 */
type LineInfo = { blank: true } | { blank: false; turn: number; chunk: number }

function buildLineMap(value: string): { lines: string[]; map: LineInfo[] } {
  const lines = value.split('\n')
  let turn = -1
  let chunk = 0
  let inPara = false
  const map = lines.map<LineInfo>(l => {
    if (!l.trim()) {
      inPara = false
      return { blank: true }
    }
    if (!inPara) {
      turn++
      chunk = 0
      inPara = true
    } else {
      chunk++
    }
    return { blank: false, turn, chunk }
  })
  return { lines, map }
}

/** 오버레이와 textarea 가 완전히 같은 글자 배치를 갖도록 공유하는 타이포 클래스 */
const TYPO = 'text-sm leading-7 whitespace-pre-wrap break-words'
const PAD = 'ps-4 pe-28 py-2'

export function ManuscriptEditor({
  value, onChange, turns, cast, onSetCast, onAddAnchor, onRemoveAnchor, onMoveAnchor, onCursorTurn, placeholder,
}: Props) {
  const [focused, setFocused] = useState(false)
  const [cursorLine, setCursorLine] = useState<number | null>(null)
  const [dragOverLine, setDragOverLine] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const [speakerMenu, setSpeakerMenu] = useState<number | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)

  const { lines, map } = useMemo(() => buildLineMap(value), [value])

  // 전환 앵커가 걸린 (발언:덩어리) 좌표 — chunk 0 은 시작 사진 자리라 여기 안 잡힌다
  const anchors = useMemo(() => {
    const s = new Set<string>()
    turns.forEach((t, ti) => (t.imageChanges ?? []).forEach(c => { if (c.chunk > 0) s.add(`${ti}:${c.chunk}`) }))
    return s
  }, [turns])

  /** 커서가 놓인 줄·발언 갱신 — textarea 의 현재 값 기준으로 계산해 한 타 늦지 않게 */
  const updateCursor = () => {
    const el = ref.current
    if (!el) return
    const li = el.value.slice(0, el.selectionStart).split('\n').length - 1
    setCursorLine(li)
    const info = buildLineMap(el.value).map[li]
    onCursorTurn(info && !info.blank ? info.turn : null)
  }

  return (
    <div className="relative rounded-lg border border-border bg-bg-card">
      {/* 오버레이 — 전환 라인·화자 칩·인물색 라인. 글자는 투명(자리만 잡는다) */}
      <div
        aria-hidden
        className={`absolute inset-0 z-10 ${PAD} ${TYPO} ${dragging ? 'pointer-events-auto' : 'pointer-events-none'}`}
        onDragLeave={e => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverLine(null)
        }}
        onDrop={() => { setDragOverLine(null); setDragging(false) }}
      >
        {lines.map((line, li) => {
          const info = map[li]
          const tail = li < lines.length - 1 ? '\n' : ''

          if (info.blank) {
            // 빈 줄 = 발언 경계 — 가운데 흐린 선으로 경계임을 알린다
            return (
              <div key={li} className="relative">
                <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-border/30" />
                <span className="text-transparent">{line || ' '}</span>{tail}
              </div>
            )
          }

          const turn = turns[info.turn]
          const color = castColorOf(turn ? cast[turn.cast] : undefined, turn?.cast ?? info.turn)
          const hasAnchor = anchors.has(`${info.turn}:${info.chunk}`)
          const isCursorHere = focused && cursorLine === li

          return (
            <div
              key={li}
              className="relative"
              onDragOver={e => {
                if (info.chunk === 0) return // 발언 첫 줄은 시작 사진 자리 — 앵커를 못 받는다
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (dragOverLine !== li) setDragOverLine(li)
              }}
              onDrop={e => {
                if (info.chunk === 0) return
                e.preventDefault()
                setDragOverLine(null)
                const [ft, fc] = e.dataTransfer.getData('text/plain').split(':').map(Number)
                if (!Number.isNaN(ft) && !Number.isNaN(fc) && !(ft === info.turn && fc === info.chunk)) {
                  onMoveAnchor({ turn: ft, chunk: fc }, { turn: info.turn, chunk: info.chunk })
                }
              }}
            >
              {/* 인물색 세로 라인 — 이 줄이 누구의 발언인지 */}
              <span className="pointer-events-none absolute inset-y-0 start-0 w-[3px] rounded-sm opacity-70" style={{ backgroundColor: color }} />

              {/* 드래그 중 드롭 위치 표시 */}
              {dragOverLine === li && (
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 border-t-2 border-accent shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              )}

              {/* 이미지 전환 라인 — 이 줄부터 사진이 바뀐다 */}
              {hasAnchor && (
                <div className="pointer-events-auto absolute start-0 end-24 top-0 border-t-2 border-dashed border-warning-text/70">
                  <div
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('text/plain', `${info.turn}:${info.chunk}`)
                      e.dataTransfer.effectAllowed = 'move'
                      setDragging(true)
                    }}
                    onDragEnd={() => { setDragOverLine(null); setDragging(false) }}
                    className="absolute -top-2.5 end-[-5.5rem] flex cursor-grab items-center gap-1 rounded-sm bg-warning px-1.5 py-0.5 text-[10px] font-bold leading-tight text-warning-text shadow-sm active:cursor-grabbing hover:bg-warning/80"
                    title="끌어서 다른 줄로 옮기거나 ✕로 지웁니다. 사진 지정은 오른쪽 세부 패널에서."
                  >
                    <ImageIcon size={10} /> 이미지 전환
                    <button
                      type="button"
                      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onRemoveAnchor({ turn: info.turn, chunk: info.chunk }) }}
                      className="flex h-3 w-3 items-center justify-center rounded-full hover:bg-bg-main/40"
                      title="전환 지점 삭제"
                    >
                      <X size={9} />
                    </button>
                  </div>
                </div>
              )}

              {/* 커서 줄 — 전환 추가 버튼 */}
              {!hasAnchor && isCursorHere && info.chunk > 0 && (
                <div className="group pointer-events-none absolute inset-x-0 top-0">
                  <div className="absolute start-0 end-24 top-0 border-t-2 border-dashed border-border/50 group-hover:border-warning-text/70" />
                  <div className="pointer-events-auto absolute end-0 top-0">
                    <button
                      type="button"
                      onMouseDown={e => { e.preventDefault(); onAddAnchor({ turn: info.turn, chunk: info.chunk }) }}
                      className="-mt-1 flex items-center gap-1 rounded-md border border-border bg-bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-text-secondary shadow-sm hover:border-warning-text/70 hover:text-warning-text"
                      title="이 줄이 시작될 때 새 사진으로 넘어갑니다"
                    >
                      ＋ 전환
                    </button>
                  </div>
                </div>
              )}

              {/* 화자 칩 — 발언 첫 줄. 클릭해서 바꾼다 */}
              {info.chunk === 0 && (
                <div className="pointer-events-auto absolute end-0 top-0.5">
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => setSpeakerMenu(speakerMenu === info.turn ? null : info.turn)}
                    className="flex max-w-[6.5rem] items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold leading-tight"
                    style={{ color, borderColor: color, backgroundColor: `${color}1f` }}
                    title="발언자 — 눌러서 바꿉니다"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="truncate">{(turn && cast[turn.cast]?.name) || '?'}</span>
                  </button>
                  {speakerMenu === info.turn && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setSpeakerMenu(null)} />
                      <div className="absolute end-0 top-full z-30 mt-1 flex w-max flex-col overflow-hidden rounded-md border border-border bg-bg-card shadow-lg">
                        {cast.map((s, ci) => (
                          <button
                            key={ci}
                            type="button"
                            onClick={() => { onSetCast(info.turn, ci); setSpeakerMenu(null) }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-start text-[11px] font-semibold hover:bg-bg-hover"
                            style={{ color: castColorOf(s, ci) }}
                          >
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: castColorOf(s, ci) }} />
                            {s.name || `${ci + 1}번 인물`}
                          </button>
                        ))}
                        {cast.length === 0 && (
                          <span className="px-2.5 py-1.5 text-[11px] text-text-dim">「인물」 탭에서 인물을 먼저 넣으세요</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              <span className="text-transparent">{line || ' '}</span>{tail}
            </div>
          )
        })}
      </div>

      {/* 실제 입력창 — 오른쪽은 칩·라벨 거터(pe-28) */}
      <textarea
        ref={ref}
        value={value}
        onChange={e => { onChange(e.target.value); updateCursor() }}
        onFocus={() => { setFocused(true); updateCursor() }}
        onBlur={() => { setFocused(false); setCursorLine(null) }}
        onKeyUp={updateCursor}
        onMouseUp={updateCursor}
        placeholder={placeholder}
        rows={4}
        spellCheck={false}
        className={`relative min-h-[16rem] w-full resize-none rounded-lg bg-transparent ${PAD} ${TYPO} text-text-primary caret-accent outline-none [field-sizing:content] focus:ring-1 focus:ring-accent/30`}
      />
    </div>
  )
}
