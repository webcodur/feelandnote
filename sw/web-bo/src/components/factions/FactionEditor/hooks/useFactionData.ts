'use client'

import { useState, useEffect, useCallback } from 'react'
import type { FactionVoiceMeta } from '../../shared/FactionVoiceContext'
import { folderToParam } from '@/lib/faction-edit-route'

export function useFactionData(series: string, episodeName: string) {
  const [musicList, setMusicList] = useState<string[]>([])
  const [sfxList, setSfxList] = useState<string[]>([])
  const [voiceFiles, setVoiceFiles] = useState<FactionVoiceMeta[]>([])

  // 음악 목록 로드
  const loadMusic = useCallback(() => {
    fetch(`/api/${series}/music`)
      .then(r => r.json())
      .then(d => setMusicList(Array.isArray(d) ? d : (d?.files ?? [])))
      .catch(() => setMusicList([]))
  }, [series])

  useEffect(() => { loadMusic() }, [loadMusic])

  // 효과음 목록 로드
  const loadSfx = useCallback(() => {
    fetch(`/api/${series}/sfx`)
      .then(r => r.json())
      .then(d => setSfxList(Array.isArray(d) ? d : []))
      .catch(() => setSfxList([]))
  }, [series])

  useEffect(() => { loadSfx() }, [loadSfx])

  // 음성 파일 목록 로드 — 인물별 음성 존재 여부·길이 판정용
  const loadVoices = useCallback(() => {
    fetch(`/api/${series}/voice/${folderToParam(episodeName)}`)
      .then(r => r.json())
      .then(d => setVoiceFiles(Array.isArray(d?.files) ? d.files : []))
      .catch(() => setVoiceFiles([]))
  }, [series, episodeName])

  useEffect(() => { loadVoices() }, [loadVoices])

  return { musicList, sfxList, voiceFiles, loadVoices, loadMusic, loadSfx }
}
