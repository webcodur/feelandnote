'use client'

/**
 * 「편성」 탭 — 발언(turns) 순서. **팩션에 없는 신규 화면이다.**
 *
 * 팩션 편성은 세력 순서만 다루지만, 담화는 발언 하나하나를 넣고 빼고 옮긴다.
 * 그런데 음원 파일 이름이 발언 자리(T01-<slug>.wav)에 묶여 있어, 발언을 옮기면 뒤 음원이 한 칸씩 밀린다.
 * 그 사고를 소리로 발견하면 이미 늦다 — 그래서 이 화면이 디스크의 wav 목록과 발언 배열을 대조해
 * 어긋난 자리를 위에 띄운다(vnVerify). 이 경고가 이 화면의 존재 이유 중 하나다(discourse.md §5-1).
 */

import { useMemo, useState } from 'react'
import type { DiscourseScript, Turn } from '@/lib/discourse-types'
import { vnVerify, vnTurn } from '@/lib/discourse-voice'
import { Plus } from '@/components/faction/shared/icons'
import type { EditLang } from '../shared/editLang'
import { totalSec, formatMmss, shortsPartNumbers } from '../shared/timing'
import { TurnRow } from './sections/TurnRow'
import { DiscourseLongformPanel } from './sections/DiscourseLongformPanel'
import { VoiceMismatchBanner } from './sections/VoiceMismatchBanner'
import type { DiscourseVoiceMeta } from './voice-meta'

type Props = {
  script: DiscourseScript
  update: (patch: Partial<DiscourseScript>) => void
  setTurns: (turns: Turn[]) => void
  series: string
  episodeName: string
  editLang: EditLang
  voiceFiles: DiscourseVoiceMeta[]
  reloadVoices: () => void
}

const newTurn = (cast: number): Turn => ({ cast, kind: 'monologue', text: '' })

export function DiscourseTurnsTab({
  script, update, setTurns, series, episodeName, editLang, voiceFiles, reloadVoices,
}: Props) {
  const turns = script.turns ?? []
  const cast = script.cast ?? []
  // 한 발언만 펼쳐 본다 — 목록 조망이 기본, 편집은 펼친 하나에서
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const fileNames = useMemo(() => voiceFiles.map(f => f.file), [voiceFiles])
  const voiceByFile = useMemo(() => new Map(voiceFiles.map(f => [f.file, f])), [voiceFiles])

  // 음원 자리 대조 — 발언 배열이 기대하는 파일이 그 자리에 있는가
  const issues = useMemo(() => {
    if (!cast.length || !turns.length) return []
    return vnVerify(script, fileNames)
  }, [script, fileNames, cast.length, turns.length])
  const issueByTurn = useMemo(() => new Map(issues.map(i => [i.turnIndex, i])), [issues])

  const setTurn = (i: number, next: Turn) => setTurns(turns.map((t, idx) => (idx === i ? next : t)))

  /** 발언을 옮기거나 넣고 빼면 음원 자리가 밀린다 — 옮기기 전에 무엇이 어긋날지 알린다 */
  const warnShift = (msg: string): boolean =>
    !fileNames.length || confirm(`${msg}\n\n이 자리부터 뒤 발언의 음원 파일 이름이 한 칸씩 밀립니다. 음원 파일도 함께 옮겨야 소리가 맞습니다. 계속할까요?`)

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= turns.length) return
    if (!warnShift(`${i + 1}번 발언과 ${j + 1}번 발언의 자리를 맞바꿉니다.`)) return
    const next = [...turns]
    ;[next[i], next[j]] = [next[j], next[i]]
    setTurns(next)
    setOpenIndex(openIndex === i ? j : openIndex === j ? i : openIndex)
  }

  const insertAfter = (i: number) => {
    if (i < turns.length - 1 && !warnShift(`${i + 2}번 자리에 발언을 새로 끼웁니다.`)) return
    const next = [...turns]
    next.splice(i + 1, 0, newTurn(turns[i]?.cast ?? 0))
    setTurns(next)
    setOpenIndex(i + 1)
  }

  const duplicate = (i: number) => {
    if (i < turns.length - 1 && !warnShift(`${i + 1}번 발언을 복제해 바로 뒤에 넣습니다.`)) return
    const next = [...turns]
    next.splice(i + 1, 0, JSON.parse(JSON.stringify(turns[i])) as Turn)
    setTurns(next)
    setOpenIndex(i + 1)
  }

  const remove = (i: number) => {
    if (!confirm(`${i + 1}번 발언을 지울까요?${fileNames.length ? '\n\n뒤 발언의 음원 파일 이름이 한 칸씩 당겨집니다.' : ''}`)) return
    setTurns(turns.filter((_, idx) => idx !== i))
    setOpenIndex(null)
  }

  const parts = shortsPartNumbers(script)
  const hasParts = turns.some(t => !t.disabled && t.part != null)

  return (
    <div className="space-y-4">
      {/* 음원 자리 경고 — 화면 맨 위. 어긋난 채로 손대면 소리가 통째로 엇나간다 */}
      <VoiceMismatchBanner
        issues={issues}
        script={script}
        voiceCount={fileNames.length}
        onReload={reloadVoices}
      />

      {/* 요약 */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-bg-card/40 p-2.5 text-xs text-text-secondary">
        <span>발언 {turns.length}개</span>
        <span>·</span>
        <span>롱폼 {formatMmss(totalSec(script, false))}</span>
        <span>·</span>
        <span>{hasParts ? `쇼츠 ${parts.length}편 (${parts.join('·')}편)` : '쇼츠 편 배정 없음 — 담화 전체가 한 편'}</span>
        <span>·</span>
        <span>음원 {fileNames.length}개</span>
        {!hasParts && turns.length > 6 && (
          <span className="text-warning-text">발언이 많습니다. 쇼츠로 낼 「한 합」에 편을 배정하세요.</span>
        )}
      </div>

      {/* 발언 목록 — 이 배열이 곧 영상의 뼈대다 */}
      <div className="space-y-2">
        {turns.map((t, i) => (
          <TurnRow
            key={i}
            turn={t}
            index={i}
            total={turns.length}
            cast={cast}
            episodeName={episodeName}
            series={series}
            editLang={editLang}
            open={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            voiceFile={vnTurn(i, cast[t.cast]?.slug)}
            voiceMeta={voiceByFile.get(vnTurn(i, cast[t.cast]?.slug))}
            issue={issueByTurn.get(i)}
            onChange={next => setTurn(i, next)}
            onMoveUp={() => move(i, -1)}
            onMoveDown={() => move(i, 1)}
            onInsertAfter={() => insertAfter(i)}
            onDuplicate={() => duplicate(i)}
            onDelete={() => remove(i)}
          />
        ))}

        {turns.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-text-dim">
            아직 발언이 없습니다. 아래 「발언 추가」로 첫 발언을 넣으세요.
          </p>
        )}

        <button
          onClick={() => { setTurns([...turns, newTurn(0)]); setOpenIndex(turns.length) }}
          disabled={!cast.length}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-bg-card/40 py-2.5 text-xs font-semibold text-text-secondary hover:border-accent hover:text-accent disabled:opacity-40"
          title={cast.length ? '맨 뒤에 발언을 더합니다' : '먼저 「정보」 탭에서 인물을 넣으세요'}
        >
          <Plus size={14} /> 발언 추가
        </button>
      </div>

      {/* 롱폼 배치 — 편 경계·장 표지 */}
      <DiscourseLongformPanel script={script} update={update} editLang={editLang} />
    </div>
  )
}
