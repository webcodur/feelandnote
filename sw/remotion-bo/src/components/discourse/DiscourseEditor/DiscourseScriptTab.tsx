'use client'

/**
 * 「원고」 탭 — 대본 전체가 하나의 연속 에디터다(팩션 대사 편집기 패턴의 담화판).
 *
 * 쓰기와 마킹이 한 화면에서 동시에 된다: 자유롭게 타이핑하고(엔터 = 덩어리, 빈 줄 = 발언 경계),
 * 줄 위 전환 라인으로 사진이 넘어가는 지점을 걸고, 발언 첫 줄 화자 칩으로 발언자를 바꾼다.
 * 커서가 놓인 발언의 세부(종류·대상·쇼츠 편·사진·음성·출처)는 오른쪽 패널에 뜬다.
 *
 * 타이핑은 재분배(remapTurns)로 즉시 발언 배열에 반영된다 — 문단이 그대로면 그 발언의
 * 속성이 전부 따라오고, 새 문단만 새 발언이 된다. 문단이 사라지면 발언도 소멸하되
 * 확인창을 남발하지 않는다: 사진·음성이 붙은 발언이 사라질 때만 배너로 알리고 undo 로 복구한다.
 *
 * 발언 수를 바꾸는 조작 직전의 turns 를 최근 10단계까지 쌓아 Ctrl+Z / 되돌리기로 복구한다.
 * 저장은 부모(DiscourseEditor)가 통짜로 한다 — 여기는 turns 배열만 갱신한다.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { DiscourseScript, Turn } from '@/lib/discourse-types'
import { vnTurn, vnVerify } from '@/lib/discourse-voice'
import { X } from '@/components/icons'
import type { EditLang } from '@/components/editor'
import { scriptToText, textToParagraphs, remapTurns } from '../shared/manuscript'
import { ManuscriptEditor, type AnchorPos } from '../shared/ManuscriptEditor'
import { TurnDetailPanel } from './sections/TurnDetailPanel'
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
  /** 디스크의 음원 목록 — 자리 대조 배너와 세부 패널 미리듣기에 쓴다 */
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

  // 선택 발언 = 커서가 놓인 발언 — 오른쪽 세부 패널의 대상
  const [selected, setSelected] = useState<number | null>(null)
  const selectedTurn = selected != null ? turns[selected] : undefined

  // 내용이 바뀌어 음원 재생성이 필요한 발언 번호(1-based) — 세션 동안 누적 표시
  const [staleTurns, setStaleTurns] = useState<number[]>([])
  // 문단 삭제로 발언이 소멸했을 때의 안내 — confirm 대신 배너 + undo
  const [dropNotice, setDropNotice] = useState<string | null>(null)

  // region 되돌리기 — 발언 수를 바꾸는 조작 직전의 turns 스냅샷
  const [undoStack, setUndoStack] = useState<Turn[][]>([])
  const pushUndo = () => setUndoStack(s => [...s.slice(-(UNDO_DEPTH - 1)), turns])
  const undo = () => {
    const last = undoStack[undoStack.length - 1]
    if (!last) return
    setUndoStack(s => s.slice(0, -1))
    setTurns(last)
    setSelected(null)
    setDropNotice(null)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return
      const t = e.target as HTMLElement | null
      // 입력칸 안에서는 브라우저 고유의 글자 되돌리기를 방해하지 않는다
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t?.isContentEditable) return
      if (!undoStack.length) return
      e.preventDefault()
      undo()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })
  // endregion

  // region 원고 텍스트 ↔ 발언 배열 동기화
  const [editorText, setEditorText] = useState(() => scriptToText(turns))
  // 에디터 발 갱신의 정본 표기 — 이 값과 다르게 turns 가 바뀌면(undo 등 외부 변경) 원고를 다시 그린다
  const lastApplied = useRef(scriptToText(turns))

  useEffect(() => {
    const canonical = scriptToText(turns)
    if (canonical !== lastApplied.current) {
      lastApplied.current = canonical
      setEditorText(canonical)
    }
  }, [turns])

  const markStale = (indices: number[]) => {
    if (!indices.length) return
    setStaleTurns(prev => [...new Set([...prev, ...indices.map(i => i + 1)])].sort((a, b) => a - b))
  }

  /** 타이핑 반영 — 재분배로 발언 속성을 따라 옮긴다. 발언 소멸은 배너 + undo 로 방어 */
  const handleText = (v: string) => {
    setEditorText(v)
    const res = remapTurns(turns, textToParagraphs(v))
    const structural = res.turns.length !== turns.length || res.dropped.length > 0
    if (structural) pushUndo()
    lastApplied.current = scriptToText(res.turns)
    setTurns(res.turns)
    markStale(res.stale)
    if (res.dropped.length) {
      const rich = res.dropped.some(d => d.image || d.imageChanges?.length || d.duration != null || d.voice || d.origin)
      setDropNotice(
        `발언 ${res.dropped.length}개가 원고에서 지워졌습니다${rich ? ' — 사진·음성 설정이 붙어 있던 발언입니다' : ''}. 되돌리기(Ctrl+Z 또는 버튼)로 복구할 수 있습니다.`,
      )
    }
    if (selected != null && selected >= res.turns.length) {
      setSelected(res.turns.length ? res.turns.length - 1 : null)
    }
  }
  // endregion

  const setTurn = (i: number, next: Turn) => setTurns(turns.map((t, idx) => (idx === i ? next : t)))

  // region 전환 앵커 — 에디터의 줄 좌표(발언, 덩어리)를 imageChanges 로 잇는다
  const addAnchor = ({ turn, chunk }: AnchorPos) => {
    const t = turns[turn]
    if (!t) return
    const list = t.imageChanges ?? []
    if (!list.some(c => c.chunk === chunk)) {
      const next = [...list, { chunk, image: '' }].sort((a, b) => a.chunk - b.chunk)
      setTurn(turn, { ...t, imageChanges: next })
    }
    setSelected(turn) // 사진 지정은 오른쪽 세부 패널의 덩어리 목록에서
  }

  const removeAnchor = ({ turn, chunk }: AnchorPos) => {
    const t = turns[turn]
    if (!t) return
    const next = (t.imageChanges ?? []).filter(c => c.chunk !== chunk)
    setTurn(turn, { ...t, imageChanges: next.length ? next : undefined })
  }

  const moveAnchor = (from: AnchorPos, to: AnchorPos) => {
    const src = turns[from.turn]
    const entry = src?.imageChanges?.find(c => c.chunk === from.chunk)
    if (!src || !entry) return
    if (from.turn === to.turn) {
      // 같은 발언 안 — 목적지에 이미 있으면 자리를 맞바꾼다(팩션과 동일)
      const list = (src.imageChanges ?? []).map(c => {
        if (c.chunk === from.chunk) return { ...c, chunk: to.chunk }
        if (c.chunk === to.chunk) return { ...c, chunk: from.chunk }
        return c
      }).sort((a, b) => a.chunk - b.chunk)
      setTurn(from.turn, { ...src, imageChanges: list })
      return
    }
    // 다른 발언으로 — 원래 자리에서 빼고, 목적지의 같은 자리는 덮어쓴다
    const next = [...turns]
    const srcList = (src.imageChanges ?? []).filter(c => c.chunk !== from.chunk)
    next[from.turn] = { ...src, imageChanges: srcList.length ? srcList : undefined }
    const dst = next[to.turn]
    if (!dst) return
    const dstList = [...(dst.imageChanges ?? []).filter(c => c.chunk !== to.chunk), { ...entry, chunk: to.chunk }]
      .sort((a, b) => a.chunk - b.chunk)
    next[to.turn] = { ...dst, imageChanges: dstList }
    setTurns(next)
  }
  // endregion

  return (
    <div className="space-y-3">
      {/* 음원 자리 경고 — 어긋난 채로 손대면 소리가 통째로 엇나간다 */}
      <VoiceMismatchBanner
        issues={issues}
        script={script}
        voiceCount={fileNames.length}
        onReload={reloadVoices}
      />

      {/* 안내 + 되돌리기 */}
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] text-text-dim">
          엔터로 덩어리(자막·사진 단위)를, 빈 줄로 발언을 나눕니다. 발언 첫 줄의 칩으로 화자를 바꾸고,
          커서 줄의 「＋ 전환」으로 사진이 넘어가는 지점을 겁니다. 세부(사진·음성·출처)는 오른쪽 패널에서.
        </p>
        {undoStack.length > 0 && (
          <button
            onClick={undo}
            className="ms-auto shrink-0 rounded border border-border bg-bg-card px-2 py-0.5 text-[11px] font-semibold text-text-secondary hover:border-accent hover:text-accent"
            title="발언 수가 바뀌기 직전 상태로 돌아갑니다"
          >
            되돌리기 (Ctrl+Z · {undoStack.length})
          </button>
        )}
      </div>

      {!cast.length && (
        <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-text-dim">
          아직 인물이 없습니다 — 「인물」 탭에서 인물을 먼저 넣으면 화자를 배정할 수 있습니다.
        </p>
      )}

      {/* 발언 소멸 안내 — confirm 대신 배너 + undo */}
      {dropNotice && (
        <p className="flex items-center gap-2 rounded-lg border border-warning-text/40 bg-warning p-2 text-[11px] font-semibold text-warning-text">
          <span>{dropNotice}</span>
          <button onClick={() => setDropNotice(null)} className="ms-auto rounded p-0.5 hover:bg-warning/70" title="이 안내를 닫습니다">
            <X size={12} />
          </button>
        </p>
      )}

      {/* 음원 재생성 안내 — 음원이 있던 발언의 내용이 바뀌었다 */}
      {staleTurns.length > 0 && (
        <p className="flex items-center gap-2 rounded-lg border border-warning-text/40 bg-warning p-2 text-[11px] font-semibold text-warning-text">
          <span>{staleTurns.join(', ')}번 발언의 내용이 바뀌었습니다 — 음성을 다시 만들어야 소리와 자막이 맞습니다.</span>
          <button onClick={() => setStaleTurns([])} className="ms-auto rounded p-0.5 hover:bg-warning/70" title="이 안내를 닫습니다">
            <X size={12} />
          </button>
        </p>
      )}

      <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
        {/* 원고 — 연속 에디터 */}
        <div className="min-w-0 flex-1 space-y-3">
          <ManuscriptEditor
            value={editorText}
            onChange={handleText}
            turns={turns}
            cast={cast}
            onSetCast={(ti, ci) => { const t = turns[ti]; if (t) setTurn(ti, { ...t, cast: ci }) }}
            onAddAnchor={addAnchor}
            onRemoveAnchor={removeAnchor}
            onMoveAnchor={moveAnchor}
            onCursorTurn={ti => { if (ti != null) setSelected(ti) }}
            placeholder={'여기에 대본을 씁니다.\n\n엔터 = 덩어리 나눔(자막이 뜨는 단위), 빈 줄 = 발언 나눔.'}
          />

          {/* 롱폼 배치 — 편 경계·장 표지 */}
          <DiscourseLongformPanel script={script} update={update} editLang={editLang} />
        </div>

        {/* 세부 패널 — 커서가 놓인 발언의 종류·대상·편·사진·음성·출처 */}
        {selectedTurn && selected != null && (
          <div className="w-full shrink-0 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:w-[24rem] xl:overflow-y-auto">
            <TurnDetailPanel
              turn={selectedTurn}
              index={selected}
              cast={cast}
              series={series}
              episodeName={episodeName}
              voiceFile={vnTurn(selected, cast[selectedTurn.cast]?.slug)}
              voiceMeta={voiceFiles.find(f => f.file === vnTurn(selected, cast[selectedTurn.cast]?.slug))}
              onChange={next => setTurn(selected, next)}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
