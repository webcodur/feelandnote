'use client'

/**
 * 「원고」 탭 — 발언마다 한 줄, 왼쪽이 대사 오른쪽이 그 대사의 사진이다.
 *
 * 격자(grid)로 짜여 있어 **한 발언의 대사와 사진이 언제나 같은 행에 놓인다.** 대사가 길면
 * 그 행이 대사 높이를 따르고 사진 쪽에 빈 자리가 남으며, 사진이 많으면 반대가 된다.
 * 높이를 재서 맞추는 것이 아니라 배치가 스스로 맞물리므로 글을 고쳐도 어긋나지 않는다.
 *
 * 팩션 인물 대사 편집기와 같은 짜임새이고, 대사 입력칸(`QuoteEditor`)과 사진 카드(`ImageCard`)도
 * 같은 공용 부품을 쓴다. 다른 것은 단위뿐 — 팩션은 인물 하나가 한 행, 담화는 발언 하나가 한 행이다.
 *
 * 발언 수를 바꾸는 조작(추가·삭제·순서) 직전의 turns 를 10단계까지 쌓아 되돌린다.
 * 저장은 부모(DiscourseEditor)가 통짜로 한다 — 여기는 turns 배열만 갱신한다.
 */

import { useMemo, useState } from 'react'
import type { DiscourseScript, Turn } from '@/lib/discourse-types'
import { vnTurn, vnVerify } from '@feelandnote/shared/lib/discourse-voice-names'
import { Plus, X } from '@feelandnote/shared/bo/icons'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { TurnRow } from './sections/TurnRow'
import { VoiceMismatchBanner } from './sections/VoiceMismatchBanner'
import { DiscourseLongformPanel } from './sections/DiscourseLongformPanel'
import type { DiscourseVoiceMeta } from './voice-meta'

type Props = {
  script: DiscourseScript
  update: (patch: Partial<DiscourseScript>) => void
  setTurns: (turns: Turn[]) => void
  series: string
  episodeName: string
  editLang: EditLang
  /** 디스크의 음원 목록 — 자리 대조 배너와 미리듣기에 쓴다 */
  voiceFiles: DiscourseVoiceMeta[]
  reloadVoices: () => void
}

/** 되돌리기 스냅샷 최대 깊이 */
const UNDO_DEPTH = 10

export function DiscourseScriptTab({
  script, update, setTurns, series, episodeName, editLang, voiceFiles, reloadVoices,
}: Props) {
  const turns = script.turns ?? []
  const cast = script.cast ?? []

  // 음원 자리 대조 — 발언 배열이 기대하는 파일이 그 자리에 있는가
  const fileNames = useMemo(() => voiceFiles.map(f => f.file), [voiceFiles])
  const issues = useMemo(() => {
    if (!cast.length || !turns.length) return []
    return vnVerify(script, fileNames)
  }, [script, fileNames, cast.length, turns.length])

  /** 지금 손보는 발언 — 행이 강조된다 */
  const [selected, setSelected] = useState<number | null>(null)

  // 내용이 바뀌어 음원 재생성이 필요한 발언 번호(1-based) — 세션 동안 누적 표시
  const [staleTurns, setStaleTurns] = useState<number[]>([])

  // region 되돌리기 — 발언 수·순서를 바꾸는 조작 직전의 turns 스냅샷
  const [undoStack, setUndoStack] = useState<Turn[][]>([])
  const pushUndo = () => setUndoStack(s => [...s.slice(-(UNDO_DEPTH - 1)), turns])
  const undo = () => {
    const last = undoStack[undoStack.length - 1]
    if (!last) return
    setUndoStack(s => s.slice(0, -1))
    setTurns(last)
    setSelected(null)
  }
  // endregion

  const setTurn = (i: number, next: Turn) => setTurns(turns.map((t, idx) => (idx === i ? next : t)))

  const markStale = (i: number) =>
    setStaleTurns(prev => (prev.includes(i + 1) ? prev : [...prev, i + 1].sort((a, b) => a - b)))

  /** 발언 추가 — 마지막 발언과 같은 사람이 이어 말하는 것으로 시작한다 */
  const addTurn = () => {
    pushUndo()
    const last = turns[turns.length - 1]
    const next: Turn = { cast: last?.cast ?? 0, kind: 'monologue', text: '', chunks: [''] }
    setTurns([...turns, next])
    setSelected(turns.length)
  }

  const deleteTurn = (i: number) => {
    const t = turns[i]
    const rich = !!(t?.image || t?.imageChanges?.length || t?.duration != null || t?.origin)
    if (rich && !confirm(`${i + 1}번 발언에는 사진·음성 설정이 붙어 있습니다. 지울까요?\n(되돌리기로 복구할 수 있습니다)`)) return
    pushUndo()
    setTurns(turns.filter((_, idx) => idx !== i))
    setSelected(null)
  }

  /** 자리 옮기기 — 음원은 자리 기준이라 옮기면 소리가 밀린다(배너가 잡아 준다) */
  const moveTurn = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= turns.length) return
    pushUndo()
    const next = [...turns]
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
    setTurns(next)
    setSelected(j)
  }

  return (
    <div className="space-y-3">
      {/* 음원 자리 경고 — 어긋난 채로 손대면 소리가 통째로 엇나간다 */}
      <VoiceMismatchBanner
        issues={issues}
        script={script}
        voiceCount={fileNames.length}
        onReload={reloadVoices}
      />

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] text-text-dim">
          엔터로 덩어리(자막·사진 단위)를 나눕니다. 커서 줄의 「＋ 전환」을 누르면 사진 고르는 창이 바로 뜨고,
          사진이 떠 있는 구간은 오른쪽 카드와 같은 색으로 칠해집니다.
        </p>
        {undoStack.length > 0 && (
          <button
            onClick={undo}
            className="ms-auto shrink-0 rounded border border-border bg-bg-card px-2 py-0.5 text-[11px] font-semibold text-text-secondary hover:border-accent hover:text-accent"
            title="발언을 더하거나 지우거나 옮기기 직전으로 돌아갑니다"
          >
            되돌리기 ({undoStack.length})
          </button>
        )}
      </div>

      {!cast.length && (
        <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-text-dim">
          아직 인물이 없습니다 — 「인물」 탭에서 인물을 먼저 넣으면 말하는 사람을 고를 수 있습니다.
        </p>
      )}

      {/* 음원 재생성 안내 — 음원이 있던 발언의 내용이 바뀌었다 */}
      {staleTurns.length > 0 && (
        <p className="flex items-center gap-2 rounded-lg border border-warning-text/40 bg-warning/15 p-2 text-[11px] font-semibold text-warning-text">
          <span>{staleTurns.join(', ')}번 발언의 내용이 바뀌었습니다 — 음성을 다시 만들어야 소리와 자막이 맞습니다.</span>
          <button onClick={() => setStaleTurns([])} className="ms-auto rounded p-0.5 hover:bg-warning/25" title="이 안내를 닫습니다">
            <X size={12} />
          </button>
        </p>
      )}

      {/*
        발언 격자 — 한 발언이 두 칸(대사·사진)을 내놓아 한 행을 이룬다.
        행 높이는 둘 중 깊은 쪽을 따르고 얕은 쪽엔 빈 자리가 남는다(items-start 로 위 맞춤).
      */}
      <div className="grid grid-cols-1 items-start gap-x-4 gap-y-3 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {turns.map((turn, i) => {
          const file = vnTurn(i, cast[turn.cast]?.slug)
          return (
            <TurnRow
              key={i}
              turn={turn}
              index={i}
              cast={cast}
              series={series}
              episodeName={episodeName}
              editLang={editLang}
              onChange={next => setTurn(i, next)}
              onDelete={() => deleteTurn(i)}
              onMoveUp={() => moveTurn(i, -1)}
              onMoveDown={() => moveTurn(i, 1)}
              voiceFile={file}
              voiceMeta={voiceFiles.find(f => f.file === file)}
              selected={selected === i}
              onSelect={() => setSelected(i)}
              onStale={() => markStale(i)}
            />
          )
        })}
      </div>

      <button
        onClick={addTurn}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2.5 text-xs font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-accent"
      >
        <Plus size={14} /> 발언 추가
      </button>

      {turns.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-text-dim">
          아직 발언이 없습니다 — 「발언 추가」로 첫 대사를 넣으세요.
        </p>
      )}

      {/* 롱폼 배치 — 편 경계·장 표지 */}
      <DiscourseLongformPanel script={script} update={update} editLang={editLang} />
    </div>
  )
}
