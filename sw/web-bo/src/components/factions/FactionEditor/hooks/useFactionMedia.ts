'use client'

import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react'
import type { FactionScript, FactionTrack } from '@/lib/faction-types'
import { folderToParam } from '@/lib/faction-edit-route'
import type { FactionVoiceMeta } from '../../shared/FactionVoiceContext'

interface UseFactionMediaOptions {
  series: string
  episodeName: string
  script: FactionScript | null
  scriptRef: RefObject<FactionScript | null>
  onChange: (patch: Partial<FactionScript>) => void
}

/** 브라우저에서 음악 파일의 실제 길이를 읽는다. */
function measureDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    audio.preload = 'metadata'
    let settled = false
    const finish = (done: () => void) => {
      if (settled) return
      settled = true
      audio.ontimeupdate = null
      done()
    }

    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration)) {
        finish(() => resolve(audio.duration))
        return
      }
      // VBR mp3 등이 duration=Infinity를 주면 파일 끝으로 이동해 실제 길이를 확정한다.
      audio.ontimeupdate = () => {
        if (Number.isFinite(audio.duration)) {
          audio.currentTime = 0
          finish(() => resolve(audio.duration))
        }
      }
      audio.currentTime = 1e101
    }
    audio.onerror = () => finish(() => reject(new Error('음악 메타데이터 로드 실패')))
    setTimeout(() => finish(() => reject(new Error('음악 길이 측정 시간 초과'))), 8000)
    audio.src = url
  })
}

/** 편집기에 필요한 로컬 음악·효과음·음성 목록과 배경음악 트랙 편집을 한곳에서 관리한다. */
export function useFactionMedia({ series, episodeName, script, scriptRef, onChange }: UseFactionMediaOptions) {
  const [musicList, setMusicList] = useState<string[]>([])
  const [musicUsage, setMusicUsage] = useState<Record<string, string[]>>({})
  const [sfxList, setSfxList] = useState<string[]>([])
  const [voiceFiles, setVoiceFiles] = useState<FactionVoiceMeta[]>([])

  const loadMusic = useCallback(() => {
    fetch(`/api/${series}/music`)
      .then(response => response.json())
      .then(data => {
        setMusicList(Array.isArray(data) ? data : (data?.files ?? []))
        setMusicUsage(Array.isArray(data) ? {} : (data?.usage ?? {}))
      })
      .catch(() => {
        setMusicList([])
        setMusicUsage({})
      })
  }, [series])

  const loadSfx = useCallback(() => {
    fetch(`/api/${series}/sfx`)
      .then(response => response.json())
      .then(data => setSfxList(Array.isArray(data) ? data : []))
      .catch(() => setSfxList([]))
  }, [series])

  const loadVoices = useCallback(() => {
    fetch(`/api/${series}/voice/${folderToParam(episodeName)}`)
      .then(response => response.json())
      .then(data => setVoiceFiles(Array.isArray(data?.files) ? data.files : []))
      .catch(() => setVoiceFiles([]))
  }, [episodeName, series])

  useEffect(() => { loadMusic() }, [loadMusic])
  useEffect(() => { loadSfx() }, [loadSfx])
  useEffect(() => { loadVoices() }, [loadVoices])

  const openMusicFolder = useCallback(() => {
    fetch(`/api/${series}/music`, { method: 'POST' }).catch(() => {})
  }, [series])

  const musicLabel = useCallback((file: string) => {
    const usedBy = musicUsage[file]
    return usedBy?.length ? `${file} — ${usedBy.join(' · ')}에 연결됨` : `${file} · 미연결`
  }, [musicUsage])

  const voiceUrl = useCallback(
    (file: string) => `/api/${series}/voice/${folderToParam(episodeName)}/${encodeURIComponent(file)}`,
    [episodeName, series],
  )
  const musicUrl = useCallback(
    (file: string) => `/api/${series}/music/${encodeURIComponent(file)}`,
    [series],
  )
  const voiceByFile = useMemo(() => new Map(voiceFiles.map(file => [file.file, file])), [voiceFiles])

  const tracks = useMemo<FactionTrack[]>(() => (
    script?.tracks?.length
      ? script.tracks
      : script?.music
        ? [{ file: script.music }]
        : []
  ), [script])
  const setTracks = useCallback((next: FactionTrack[]) => {
    onChange({ tracks: next.length ? next : undefined, music: undefined })
  }, [onChange])

  const addTrack = useCallback(async (file: string) => {
    if (!file) return
    let durationSec: number | undefined
    try {
      const measured = Math.round(await measureDuration(musicUrl(file)))
      if (Number.isFinite(measured) && measured > 0) durationSec = measured
    } catch {
      // 길이 측정이 실패해도 트랙 자체는 추가한다.
    }

    const current = scriptRef.current
    const currentTracks: FactionTrack[] = current?.tracks?.length
      ? current.tracks
      : current?.music
        ? [{ file: current.music }]
        : []
    onChange({ tracks: [...currentTracks, { file, durationSec }], music: undefined })
  }, [musicUrl, onChange, scriptRef])

  const moveTrack = useCallback((index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= tracks.length) return
    const next = [...tracks]
    ;[next[index], next[target]] = [next[target], next[index]]
    setTracks(next)
  }, [setTracks, tracks])

  const removeTrack = useCallback((index: number) => {
    setTracks(tracks.filter((_, current) => current !== index))
  }, [setTracks, tracks])

  const setTrackVolume = useCallback((index: number, volume: number) => {
    setTracks(tracks.map((track, current) => (
      current === index ? { ...track, volume: volume === 1 ? undefined : volume } : track
    )))
  }, [setTracks, tracks])

  // 길이 없는 기존 트랙을 보정해야 여러 곡을 순서대로 재생할 수 있다.
  useEffect(() => {
    const missing = (script?.tracks ?? []).filter(track => (
      track.file && (!Number.isFinite(track.durationSec) || (track.durationSec ?? 0) <= 0)
    ))
    if (!missing.length) return
    let cancelled = false

    ;(async () => {
      const measured: Record<string, number> = {}
      for (const track of missing) {
        try {
          const duration = Math.round(await measureDuration(musicUrl(track.file)))
          if (Number.isFinite(duration) && duration > 0) measured[track.file] = duration
        } catch {
          // 읽지 못한 파일은 다음 조회 때 다시 시도한다.
        }
      }
      if (cancelled || !Object.keys(measured).length) return

      const current = scriptRef.current
      if (!current?.tracks) return
      onChange({
        tracks: current.tracks.map(track => (
          !Number.isFinite(track.durationSec) && measured[track.file] != null
            ? { ...track, durationSec: measured[track.file] }
            : track
        )),
      })
    })()

    return () => { cancelled = true }
  }, [musicUrl, onChange, script?.tracks, scriptRef])

  return {
    musicList,
    sfxList,
    voiceFiles,
    replaceVoiceFiles: setVoiceFiles,
    loadVoices,
    openMusicFolder,
    musicLabel,
    voiceUrl,
    voiceByFile,
    tracks,
    addTrack,
    moveTrack,
    removeTrack,
    setTrackVolume,
  }
}
