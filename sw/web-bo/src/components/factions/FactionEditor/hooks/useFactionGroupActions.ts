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
import { withFactionSequenceCut } from '@feelandnote/shared/lib/faction-sequence'
import { factionSequenceOf } from '@/lib/faction-types'
import { moveFactionSceneBeat } from '../FactionGroupEditor/faction-scene-beat-move'

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

interface BeatMoveTarget {
  fromGi: number
  fromCi: number
  fromBi: number
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
  const [beatMoveTarget, setBeatMoveTarget] = useState<BeatMoveTarget | null>(null)
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

  const addGroup = useCallback(() => updateGroups([...groups, createGroup()]), [groups, updateGroups])

  const moveGroup = useCallback((index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target >= 0 && target < groups.length) void swapGroups(index, target)
  }, [groups.length, swapGroups])

  /**
   * 쇼츠 편 경계 켜고 끄기. boundary 는 경계 앞에 오는 장면 수 — 장면 사이(1…n-1)와 세력 끝(n)이 자리다.
   * 목차(사이드바)와 본문이 같은 경계를 같은 규칙으로 다룬다.
   */
  const setSequenceCut = useCallback((index: number, boundary: number, on: boolean) => {
    const group = groups[index]
    if (!group) return
    const sequence = factionSequenceOf(group)
    const clusters = sequence.filter(item => item.kind === 'cluster').length
    if (boundary < 1 || boundary > clusters) return
    setGroup(index, { ...group, sequence: withFactionSequenceCut(sequence, boundary, on) })
  }, [groups, setGroup])

  /**
   * 쇼츠 편 경계 옮기기(목차에서 가로선을 끌어 놓기). 세력을 넘나들어도 그룹 배열을 한 번에 갱신한다 —
   * setSequenceCut 을 두 번 부르면 뒤 호출이 앞 호출의 결과를 덮는다(둘 다 같은 groups 클로저에서 만든다).
   */
  const moveSequenceCut = useCallback((from: { groupIndex: number; boundary: number }, to: { groupIndex: number; boundary: number }) => {
    if (from.groupIndex === to.groupIndex && from.boundary === to.boundary) return
    const next = groups.map((group, index) => {
      if (index !== from.groupIndex && index !== to.groupIndex) return group
      let sequence = factionSequenceOf(group)
      const clusters = sequence.filter(item => item.kind === 'cluster').length
      if (index === from.groupIndex) sequence = withFactionSequenceCut(sequence, from.boundary, false)
      if (index === to.groupIndex && to.boundary >= 1 && to.boundary <= clusters) sequence = withFactionSequenceCut(sequence, to.boundary, true)
      return { ...group, sequence }
    })
    updateGroups(projectFactionPrimaryQuotesToGroups(next) as FactionGroup[])
  }, [groups, updateGroups])

  /** 장면 안 컷 사이 경계(shortsCutBefore) 전부 지우기 — 목차 배지의 ✕. 컷 단위 위치 조정은 본문 컷 목록이 맡는다. */
  const clearBeatCuts = useCallback((groupIndex: number, clusterIndex: number) => {
    const group = groups[groupIndex]
    const cluster = group?.clusters?.[clusterIndex]
    if (!group || !cluster?.beats?.length) return
    const clusters = group.clusters!.map((current, index) => (
      index === clusterIndex
        ? { ...current, beats: current.beats!.map(beat => (beat.shortsCutBefore ? { ...beat, shortsCutBefore: undefined } : beat)) }
        : current
    ))
    setGroup(groupIndex, { ...group, clusters })
  }, [groups, setGroup])

  /**
   * 장면 안 컷 경계를 장면 사이 경계로 끌어내기(목차 배지를 장면 사이 자리에 놓음).
   * 그 장면의 컷 경계는 전부 빠지고 놓은 자리에 sequence cut 이 생긴다. 세력이 달라도 한 번에 갱신한다.
   */
  const moveBeatCutToBoundary = useCallback((from: { groupIndex: number; clusterIndex: number }, to: { groupIndex: number; boundary: number }) => {
    const next = groups.map((group, index) => {
      if (index !== from.groupIndex && index !== to.groupIndex) return group
      let result = group
      if (index === from.groupIndex && group.clusters?.[from.clusterIndex]?.beats?.length) {
        result = {
          ...result,
          clusters: group.clusters.map((cluster, ci) => (
            ci === from.clusterIndex
              ? { ...cluster, beats: cluster.beats!.map(beat => (beat.shortsCutBefore ? { ...beat, shortsCutBefore: undefined } : beat)) }
              : cluster
          )),
        }
      }
      if (index === to.groupIndex) {
        const sequence = factionSequenceOf(result)
        const clusters = sequence.filter(item => item.kind === 'cluster').length
        if (to.boundary >= 1 && to.boundary <= clusters) result = { ...result, sequence: withFactionSequenceCut(sequence, to.boundary, true) }
      }
      return result
    })
    updateGroups(projectFactionPrimaryQuotesToGroups(next) as FactionGroup[])
  }, [groups, updateGroups])

  /** 세력 끝 경계 — 이 세력과 다음 세력 사이에서 쇼츠 편이 갈린다. 장면 사이 경계와 같은 표식이다. */
  const setGroupEndCut = useCallback((index: number, on: boolean) => {
    const group = groups[index]
    if (!group) return
    setSequenceCut(index, factionSequenceOf(group).filter(item => item.kind === 'cluster').length, on)
  }, [groups, setSequenceCut])

  const requestPersonMove = useCallback((fromGi: number, fromCi: number, fromPi: number) => {
    setCrossMoveTarget({ fromGi, fromCi, fromPi })
  }, [])

  const closePersonMove = useCallback(() => setCrossMoveTarget(null), [])

  const requestBeatMove = useCallback((fromGi: number, fromCi: number, fromBi: number) => {
    setBeatMoveTarget({ fromGi, fromCi, fromBi })
  }, [])

  const closeBeatMove = useCallback(() => setBeatMoveTarget(null), [])

  const confirmBeatMove = useCallback((toGi: number, toCi: number) => {
    if (!beatMoveTarget) return
    const nextGroups = moveFactionSceneBeat({
      groups,
      fromGroupIndex: beatMoveTarget.fromGi,
      fromClusterIndex: beatMoveTarget.fromCi,
      fromBeatIndex: beatMoveTarget.fromBi,
      toGroupIndex: toGi,
      toClusterIndex: toCi,
    })
    if (!nextGroups) {
      setBeatMoveTarget(null)
      return
    }

    updateGroups(projectFactionPrimaryQuotesToGroups(nextGroups) as FactionGroup[])
    setBeatMoveTarget(null)
  }, [beatMoveTarget, groups, updateGroups])

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
    beatMoveTarget,
    setGroup,
    setGroupTagSlug,
    deleteGroup,
    addGroup,
    moveGroup,
    setGroupEndCut,
    setSequenceCut,
    moveSequenceCut,
    clearBeatCuts,
    moveBeatCutToBoundary,
    requestPersonMove,
    closePersonMove,
    confirmPersonMove,
    requestBeatMove,
    closeBeatMove,
    confirmBeatMove,
    jumpToGroup,
    editGroup,
  }
}
