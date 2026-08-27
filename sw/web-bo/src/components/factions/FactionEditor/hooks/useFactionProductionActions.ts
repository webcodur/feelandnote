'use client'

import { useCallback, useState, type RefObject } from 'react'
import type { FactionPerson, FactionSceneBeat, FactionScript } from '@/lib/faction-types'
import { factionVoiceFile, vnSceneBeat } from '@/lib/faction-voice'
import { folderToParam } from '@/lib/faction-edit-route'
import type { FactionVoiceMeta } from '../../shared/FactionVoiceContext'
import type { FactionVoiceOptions } from '../FactionVoiceModal'

interface UseFactionProductionActionsOptions {
  series: string
  episodeName: string
  dirty: boolean
  save: () => Promise<unknown>
  scriptRef: RefObject<FactionScript | null>
  onChange: (patch: Partial<FactionScript>) => void
  loadVoices: () => void
  replaceVoiceFiles: (files: FactionVoiceMeta[]) => void
}

interface TriggerVoiceOptions {
  only?: string
  engine?: string
  normalize?: boolean
  force?: boolean
  normalizeOnly?: boolean
}

/** 저장 이후에만 실행해야 하는 렌더·음성 생성·음성 길이 동기화를 묶는다. */
export function useFactionProductionActions({
  series,
  episodeName,
  dirty,
  save,
  scriptRef,
  onChange,
  loadVoices,
  replaceVoiceFiles,
}: UseFactionProductionActionsOptions) {
  const [rendering, setRendering] = useState(false)
  const [regeneratingFile, setRegeneratingFile] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  const ensureSaved = useCallback(async () => {
    if (scriptRef.current && dirty) await save()
  }, [dirty, save, scriptRef])

  const render = useCallback(async () => {
    await ensureSaved()
    setRendering(true)
    try {
      const response = await fetch(`/api/${series}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode: episodeName }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) alert('렌더 시작 실패: ' + (data.error ?? response.statusText))
    } catch (error) {
      alert('렌더 시작 실패: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setRendering(false)
    }
  }, [ensureSaved, episodeName, series])

  const triggerVoice = useCallback(async (options: TriggerVoiceOptions = {}) => {
    await ensureSaved()
    try {
      const body: Record<string, unknown> = { episode: episodeName }
      if (options.only) body.only = options.only
      if (options.engine) body.engine = options.engine
      if (options.normalize !== undefined) body.normalize = options.normalize
      if (options.force !== undefined) body.force = options.force
      if (options.normalizeOnly) body.normalizeOnly = true

      const response = await fetch(`/api/${series}/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) alert('음성 생성 시작 실패: ' + (data.error ?? response.statusText))
    } catch (error) {
      alert('음성 생성 시작 실패: ' + (error instanceof Error ? error.message : String(error)))
    }
  }, [ensureSaved, episodeName, series])

  const generateVoice = useCallback((options: FactionVoiceOptions) => {
    return triggerVoice({
      only: options.only,
      engine: options.engine,
      normalize: options.normalize,
      force: options.force,
    })
  }, [triggerVoice])

  const normalizeVoice = useCallback(() => {
    if (!confirm('이 에피소드의 모든 음성(ElevenLabs 포함)을 같은 음량으로 균일화합니다. 원본은 voice/.raw 에 백업됩니다. 진행할까요?')) return
    void triggerVoice({ normalizeOnly: true })
  }, [triggerVoice])

  const regenerateVoice = useCallback(async (file: string) => {
    setRegeneratingFile(file)
    try {
      await triggerVoice({ only: file.replace(/\.wav$/i, '') })
      // 생성 API가 백그라운드 작업만 시작하므로 잠시 뒤 파일 목록을 다시 읽는다.
      setTimeout(loadVoices, 4000)
    } finally {
      setRegeneratingFile(null)
    }
  }, [loadVoices, triggerVoice])

  const syncVoiceDurations = useCallback(async () => {
    const current = scriptRef.current
    if (!current) return
    setSyncing(true)
    try {
      const data = await fetch(`/api/${series}/voice/${folderToParam(episodeName)}`).then(response => response.json())
      const files: FactionVoiceMeta[] = Array.isArray(data?.files) ? data.files : []
      const byFile = new Map(files.map(file => [file.file, file]))
      let changed = 0

      const updatePerson = (person: FactionPerson, groupIndex: number, personIndex: number, clusterIndex: number) => {
        if (person.isPerson === false) return person
        const meta = byFile.get(factionVoiceFile(groupIndex, personIndex, clusterIndex))
        if (!meta || meta.duration <= 0 || Math.abs((person.quoteDuration ?? 0) - meta.duration) <= 0.05) return person
        changed += 1
        return { ...person, quoteDuration: meta.duration }
      }

      const updateBeat = (
        beat: FactionSceneBeat,
        groupIndex: number,
        clusterIndex: number,
        people: FactionPerson[],
      ) => {
        const personIndex = beat.speakerCelebId
          ? people.findIndex(person => person.celebId === beat.speakerCelebId)
          : -1
        const file = beat.voiceFile
          ?? (beat.legacyPersonVoice && personIndex >= 0
            ? factionVoiceFile(groupIndex, personIndex, clusterIndex)
            : vnSceneBeat(beat.speaker, beat.text))
        const meta = byFile.get(file)
        if (!meta || meta.duration <= 0 || Math.abs((beat.voiceDuration ?? 0) - meta.duration) <= 0.05) return beat
        changed += 1
        return { ...beat, voiceDuration: meta.duration }
      }

      const groups = current.groups.map((group, groupIndex) => {
        if (group.clusters?.length) {
          return {
            ...group,
            clusters: group.clusters.map((cluster, clusterIndex) => ({
              ...cluster,
              beats: cluster.beats?.map(beat => updateBeat(beat, groupIndex, clusterIndex, cluster.people)),
              people: cluster.people.map((person, personIndex) => updatePerson(person, groupIndex, personIndex, clusterIndex)),
            })),
          }
        }
        return {
          ...group,
          people: (group.people ?? []).map((person, personIndex) => updatePerson(person, groupIndex, personIndex, 0)),
        }
      })

      replaceVoiceFiles(files)
      if (changed > 0) {
        onChange({ groups })
        alert(`음성 길이 ${changed}개를 실제 음원에 맞췄습니다. 저장(Ctrl+S)으로 반영하세요.`)
      } else {
        alert('모든 음성 길이가 이미 실제 음원과 일치합니다.')
      }
    } catch (error) {
      alert('음성 길이 동기화 실패: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setSyncing(false)
    }
  }, [episodeName, onChange, replaceVoiceFiles, scriptRef, series])

  return {
    rendering,
    syncing,
    regeneratingFile,
    ensureSaved,
    render,
    generateVoice,
    normalizeVoice,
    regenerateVoice,
    syncVoiceDurations,
  }
}
