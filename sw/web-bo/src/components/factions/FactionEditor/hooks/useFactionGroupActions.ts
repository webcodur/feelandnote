'use client'

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { projectFactionPrimaryQuotesToGroups } from '@feelandnote/shared/lib/faction-scene-unification'
import type { FactionGroup, FactionScript } from '@/lib/faction-types'
import {
  buildGroupMoveRenames,
  buildPersonCrossMoveRenames,
  remapFactionSceneVoiceFiles,
  reorderFactionVoice,
} from '@/lib/faction-voice'
import type { FactionEditTab } from '@/lib/faction-edit-route'
import {
  configuredShortsParts,
  DEFAULT_SHORTS_PART_COUNT,
  MAX_SHORTS_PART_COUNT,
  shortsPartCountOf,
} from '../sections/factionShorts'

interface UseFactionGroupActionsOptions {
  script: FactionScript | null
  series: string
  episodeName: string
  onChange: (patch: Partial<FactionScript>) => void
  loadVoices: () => void
  goTab: (tab: FactionEditTab) => void
  setCollapsedParts: Dispatch<SetStateAction<Record<number, boolean>>>
}

interface CrossMoveTarget {
  fromGi: number
  fromCi: number
  fromPi: number
}

const createGroup = (): FactionGroup => ({
  name: '',
  color: '#92400e',
  clusters: [{ people: [], beats: [] }],
  people: [],
})

function scrollToGroup(groupIndex: number) {
  requestAnimationFrame(() => requestAnimationFrame(() =>
    document.getElementById(`faction-group-${groupIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
  ))
}

/** 세력 배열과 음성 파일 위치를 함께 바꿔야 하는 편집 동작을 한곳에서 책임진다. */
export function useFactionGroupActions({
  script,
  series,
  episodeName,
  onChange,
  loadVoices,
  goTab,
  setCollapsedParts,
}: UseFactionGroupActionsOptions) {
  const groups = useMemo(() => script?.groups ?? [], [script?.groups])
  const [crossMoveTarget, setCrossMoveTarget] = useState<CrossMoveTarget | null>(null)
  const updateGroups = useCallback((next: FactionGroup[]) => onChange({ groups: next }), [onChange])

  const setGroup = useCallback((index: number, group: FactionGroup) => {
    updateGroups(
      projectFactionPrimaryQuotesToGroups(groups.map((current, currentIndex) => (
        currentIndex === index ? group : current
      ))) as FactionGroup[],
    )
  }, [groups, updateGroups])

  const setGroupTagSlug = useCallback((index: number, tagSlug: string) => {
    const group = groups[index]
    if (!group) return
    setGroup(index, { ...group, tagSlug: tagSlug || undefined })
  }, [groups, setGroup])

  const deleteGroup = useCallback((index: number) => {
    if (!confirm('이 세력을 삭제하시겠습니까?')) return
    updateGroups(groups.filter((_, current) => current !== index))
  }, [groups, updateGroups])

  // 세력 위치가 음성 파일명의 F번호를 정하므로 파일 재배치가 성공한 뒤 배열을 바꾼다.
  const swapGroups = useCallback(async (first: number, second: number) => {
    const firstGroup = groups[first]
    const secondGroup = groups[second]
    if (!firstGroup || !secondGroup) return
    const renames = [
      ...buildGroupMoveRenames(firstGroup, first, second),
      ...buildGroupMoveRenames(secondGroup, second, first),
    ]
    const { ok, error } = await reorderFactionVoice(series, episodeName, renames)
    if (!ok) {
      console.error('[FactionEditor] 세력 이동 음원 재배치 실패:', error)
      alert('세력 순서를 바꾸지 못했습니다. 음성 파일 이동에 실패했습니다.')
      return
    }

    const next = [...remapFactionSceneVoiceFiles(groups, renames)]
    ;[next[first], next[second]] = [next[second], next[first]]
    updateGroups(next)
    loadVoices()
  }, [episodeName, groups, loadVoices, series, updateGroups])

  const moveGroupInPart = useCallback((index: number, direction: -1 | 1) => {
    const current = groups[index]
    if (!current) return
    const sameBucket = groups
      .map((group, currentIndex) => ({ group, currentIndex }))
      .filter(({ group }) => (
        !!group.disabled === !!current.disabled
        && (current.disabled || (group.part ?? 0) === (current.part ?? 0))
      ))
      .map(({ currentIndex }) => currentIndex)
    const target = sameBucket[sameBucket.indexOf(index) + direction]
    if (target !== undefined) void swapGroups(index, target)
  }, [groups, swapGroups])

  const addGroup = useCallback(() => updateGroups([...groups, createGroup()]), [groups, updateGroups])

  const moveGroup = useCallback((index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target >= 0 && target < groups.length) void swapGroups(index, target)
  }, [groups.length, swapGroups])

  const setGroupPart = useCallback((index: number, part: number) => {
    const group = groups[index]
    if (!group || !script) return
    const currentPartCount = shortsPartCountOf(script)

    if (part === -1) {
      setGroup(index, { ...group, disabled: true })
      return
    }
    if (part > currentPartCount) {
      onChange({
        groups: groups.map((current, currentIndex) => (
          currentIndex === index ? { ...current, disabled: undefined, part } : current
        )),
        shortsPartCount: part === DEFAULT_SHORTS_PART_COUNT ? undefined : part,
      })
      setCollapsedParts(current => ({ ...current, [part]: false }))
      return
    }
    setGroup(index, { ...group, disabled: undefined, part: part === 0 ? undefined : part })
  }, [groups, onChange, script, setCollapsedParts, setGroup])

  const changeShortsPartCount = useCallback((requested: number) => {
    if (!script || !Number.isFinite(requested)) return
    const currentPartCount = shortsPartCountOf(script)
    const next = Math.max(1, Math.min(MAX_SHORTS_PART_COUNT, Math.floor(requested)))
    if (next === currentPartCount) return

    const blockedParts = configuredShortsParts(script).filter(part => part > next)
    if (blockedParts.length) {
      alert(`${blockedParts.join(', ')}편에 배정된 세력 또는 편별 설정이 남아 있습니다. 해당 내용을 ${next}편 이하로 옮기거나 비운 뒤 편수를 줄여주세요.`)
      return
    }

    onChange({ shortsPartCount: next === DEFAULT_SHORTS_PART_COUNT ? undefined : next })
    setCollapsedParts(current => {
      const kept = Object.fromEntries(Object.entries(current).filter(([key]) => Number(key) <= next))
      return next > currentPartCount ? { ...kept, [next]: false } : kept
    })
  }, [onChange, script, setCollapsedParts])

  const requestPersonMove = useCallback((fromGi: number, fromCi: number, fromPi: number) => {
    setCrossMoveTarget({ fromGi, fromCi, fromPi })
  }, [])

  const closePersonMove = useCallback(() => setCrossMoveTarget(null), [])

  const confirmPersonMove = useCallback(async (toGi: number, toCi: number) => {
    if (!crossMoveTarget) return
    const { fromGi, fromCi, fromPi } = crossMoveTarget
    if (fromGi === toGi && fromCi === toCi) {
      setCrossMoveTarget(null)
      return
    }

    const sourceCluster = groups[fromGi]?.clusters?.[fromCi]
    const targetCluster = groups[toGi]?.clusters?.[toCi]
    const person = sourceCluster?.people[fromPi]
    if (!sourceCluster || !targetCluster || !person || person.isPerson === false) return

    const toPi = targetCluster.people.length
    const renames = buildPersonCrossMoveRenames(
      fromGi,
      fromCi,
      fromPi,
      toGi,
      toCi,
      sourceCluster.people.length,
      toPi,
    )
    const { ok, error } = await reorderFactionVoice(series, episodeName, renames)
    if (!ok) {
      console.error('[FactionEditor] 인물 이동 음원 재배치 실패:', error)
      alert('인물 이동을 완료하지 못했습니다. 음성 파일 이동에 실패했습니다.')
      return
    }

    const nextGroups = JSON.parse(JSON.stringify(remapFactionSceneVoiceFiles(groups, renames))) as FactionGroup[]
    const movedPerson = nextGroups[fromGi].clusters![fromCi].people.splice(fromPi, 1)[0]
    nextGroups[toGi].clusters![toCi].people.splice(toPi, 0, movedPerson)
    updateGroups(nextGroups)
    setCrossMoveTarget(null)
    loadVoices()
  }, [crossMoveTarget, episodeName, groups, loadVoices, series, updateGroups])

  const jumpToGroup = useCallback((part: number, groupIndex: number) => {
    setCollapsedParts(current => ({ ...current, [part]: false }))
    scrollToGroup(groupIndex)
  }, [setCollapsedParts])

  const editGroup = useCallback((groupIndex: number) => {
    goTab('info')
    scrollToGroup(groupIndex)
  }, [goTab])

  return {
    groups,
    crossMoveTarget,
    setGroup,
    setGroupTagSlug,
    deleteGroup,
    moveGroupInPart,
    addGroup,
    moveGroup,
    setGroupPart,
    changeShortsPartCount,
    requestPersonMove,
    closePersonMove,
    confirmPersonMove,
    jumpToGroup,
    editGroup,
  }
}
