'use client'

import type { FactionPerson } from '@/lib/faction-types'
import { FactionPersonRow } from '../FactionPersonRow/FactionPersonRow'
import { useFactionVoice } from '../../../shared/FactionVoiceContext'
import { buildPersonSwapRenames, reorderFactionVoice } from '@/lib/faction-voice'
import { Search, UserPlus } from '../../../shared/icons'
import type { EditLang } from '../../../FactionEditor'

type Props = {
  people: FactionPerson[]
  onPeopleChange: (next: FactionPerson[]) => void
  onAddCeleb: () => void
  series: string
  episodeName: string
  /** 세력 인덱스 (0-based) — 음성 파일명 계산용 */
  groupIndex: number
  /** 그룹 인덱스 (0-based) — 항상 존재(단일 모드·solo는 0) */
  clusterIndex: number
  editLang: EditLang
  onMoveCrossGroup?: (personIndex: number) => void
}

export function PersonList({
  people, onPeopleChange, onAddCeleb, series, episodeName, groupIndex, clusterIndex, editLang, onMoveCrossGroup
}: Props) {
  const voiceCtx = useFactionVoice()
  const setPerson = (i: number, p: FactionPerson) =>
    onPeopleChange(people.map((x, idx) => (idx === i ? p : x)))
  const deletePerson = (i: number) => onPeopleChange(people.filter((_, idx) => idx !== i))

  // 인물 순서 변경 — 음원 파일은 "인물 위치" 기반이라, 인물만 바꾸면 옛 음원이 그대로 남아
  // 다른 사람 목소리가 나온다. 그래서 음원을 먼저 swap 하고, 성공하면 인물 배열을 바꾼다.
  const movePerson = async (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= people.length) return

    // i번째 음원 ↔ j번째 음원 swap(quote+epithet 모두).
    const { ok, error } = await reorderFactionVoice(
      series, episodeName, buildPersonSwapRenames(groupIndex, i, j, clusterIndex),
    )
    if (!ok) {
      // 음원 swap 실패 시 인물 순서도 바꾸지 않는다(음성·인물 정합 유지).
      console.error('[FactionGroupEditor] 인물 음원 재배치 실패:', error)
      alert('인물 순서를 바꾸지 못했습니다. 음성 파일 이동에 실패했습니다.')
      return
    }

    // 음원 swap 성공 — 인물 배열도 swap(인물 객체째 옮겨 quoteDuration 등 음성 메타도 함께 이동)
    const next = [...people]
    ;[next[i], next[j]] = [next[j], next[i]]
    onPeopleChange(next)
    // 디스크 음원이 swap 됐으니 음원 캐시(byFile)도 다시 읽어 패널 표시 길이를 새 위치에 맞춘다.
    voiceCtx?.reload?.()
  }
  const addBlank = () => onPeopleChange([...people, { name: '', role: '', org: '' }])

  return (
    <div className="space-y-2">
      {people.map((p, i) => (
        <FactionPersonRow
          key={i}
          person={p}
          onChange={next => setPerson(i, next)}
          onDelete={() => deletePerson(i)}
          onMoveUp={() => movePerson(i, -1)}
          onMoveDown={() => movePerson(i, 1)}
          series={series}
          episodeName={episodeName}
          groupIndex={groupIndex}
          personIndex={i}
          clusterIndex={clusterIndex}
          editLang={editLang}
          totalPeople={people.length}
          onMoveCrossGroup={onMoveCrossGroup ? () => onMoveCrossGroup(i) : undefined}
        />
      ))}
      {people.length === 0 && <p className="text-xs text-text-dim">아직 인물이 없습니다.</p>}
      <div className="flex gap-2">
        <button
          onClick={onAddCeleb}
          className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-1.5 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
        >
          <Search size={15} /> 셀럽에서 추가
        </button>
        <button
          onClick={addBlank}
          className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-1.5 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
        >
          <UserPlus size={15} /> 직접 추가
        </button>
      </div>
    </div>
  )
}
