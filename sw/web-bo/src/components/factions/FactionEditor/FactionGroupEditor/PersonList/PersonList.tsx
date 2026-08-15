'use client'

import type { FactionImageCrop, FactionPerson } from '@/lib/faction-types'
import { FactionPersonRow } from '../FactionPersonRow/FactionPersonRow'
import { useFactionVoice } from '../../../shared/FactionVoiceContext'
import { buildPersonSwapRenames, reorderFactionVoice } from '@/lib/faction-voice'
import { Search } from '@feelandnote/shared/bo/icons'
import type { EditLang } from '@feelandnote/shared/bo/editor'

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
  /** 인물 사진이 비었거나 이 경로와 같으면 그룹 화보를 상속한다 */
  inheritedImage?: string
  inheritedImageCrop?: FactionImageCrop
  editLang: EditLang
  onMoveCrossGroup?: (personIndex: number) => void
  /** 셀럽 DB 등록 배지용 대조 결과 — 에피소드 레벨에서 배치 조회한 것을 그대로 내려받는다 */
  celebExisting: Set<string>
  celebLoaded: boolean
}

export function PersonList({
  people, onPeopleChange, onAddCeleb, series, episodeName, groupIndex, clusterIndex, editLang, onMoveCrossGroup,
  inheritedImage, inheritedImageCrop, celebExisting, celebLoaded,
}: Props) {
  const voiceCtx = useFactionVoice()
  const setPerson = (i: number, p: FactionPerson) => {
    const normalized = inheritedImage && p.image === inheritedImage
      ? { ...p, image: undefined, imageCrop: undefined }
      : p
    onPeopleChange(people.map((x, idx) => (idx === i ? normalized : x)))
  }
  const deletePerson = (i: number) => {
    const name = people[i]?.name || `인물 ${i + 1}`
    if (!confirm(`${name}을(를) 삭제할까요? 입력한 소개·대사·이미지 연결도 함께 사라집니다.`)) return
    onPeopleChange(people.filter((_, idx) => idx !== i))
  }

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
  return (
    <div className="space-y-2">
      {people.map((p, i) => (
        <FactionPersonRow
          key={p.celebId ?? p.slug ?? `${p.name}-${i}`}
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
          inheritedImage={inheritedImage}
          inheritedImageCrop={inheritedImageCrop}
          editLang={editLang}
          totalPeople={people.length}
          onMoveCrossGroup={onMoveCrossGroup ? () => onMoveCrossGroup(i) : undefined}
          celebExisting={celebExisting}
          celebLoaded={celebLoaded}
        />
      ))}
      {people.length === 0 && <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-text-dim">등록된 인물이 없습니다.</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAddCeleb}
          className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 text-sm font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Search size={15} /> 실제 인물 DB 추가
        </button>
      </div>
    </div>
  )
}
