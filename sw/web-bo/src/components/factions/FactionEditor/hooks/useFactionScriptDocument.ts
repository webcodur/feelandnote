'use client'

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useEpisodeEditor } from '@feelandnote/shared/bo/editor'
import type { FactionScript } from '@/lib/faction-types'
import {
  loadFactionScript,
  saveFactionScript,
  type CelebVoiceEntry,
} from '@/actions/admin/factions/script'
import { remapFactionImages } from '../../shared/usedImages'
import { partSectionsOf, shortsPartCountOf } from '../sections/factionShorts'

interface UseFactionScriptDocumentOptions {
  series: string
  episodeName: string
  setCollapsedParts: Dispatch<SetStateAction<Record<number, boolean>>>
}

/** DB 원본 대본의 로드·낙관적 잠금 저장·로컬 렌더 export 상태를 관리한다. */
export function useFactionScriptDocument({
  series,
  episodeName,
  setCollapsedParts,
}: UseFactionScriptDocumentOptions) {
  const [script, setScript] = useState<FactionScript | null>(null)
  const [celebVoices, setCelebVoices] = useState<Record<string, CelebVoiceEntry>>({})
  const [atlasReloadKey, setAtlasReloadKey] = useState(0)
  const [saveNote, setSaveNote] = useState<{ text: string; warn: boolean } | null>(null)
  const scriptRef = useRef<FactionScript | null>(null)
  const updatedAtRef = useRef<string | null>(null)
  scriptRef.current = script

  useEffect(() => {
    if (!saveNote) return
    const timeout = setTimeout(() => setSaveNote(null), saveNote.warn ? 12000 : 5000)
    return () => clearTimeout(timeout)
  }, [saveNote])

  const persistScript = useCallback(async (next: FactionScript) => {
    const expectedUpdatedAt = updatedAtRef.current
    if (!expectedUpdatedAt) throw new Error('대본을 아직 다 불러오지 못했습니다 — 잠시 후 다시 저장하세요')

    const result = await saveFactionScript(
      episodeName,
      next as unknown as Record<string, unknown>,
      expectedUpdatedAt,
    )
    updatedAtRef.current = result.updatedAt
    // 저장이 인물 행을 전량 교체하므로 도감 구획이 DB 상태를 다시 읽게 한다.
    setAtlasReloadKey(current => current + 1)

    if (result.exported && !result.exported.written) {
      setSaveNote({ text: `저장 완료 · 로컬 렌더 데이터 갱신 실패: ${result.exported.reason}`, warn: true })
      alert(`저장은 됐지만 렌더용 파일을 새로 쓰지 못했습니다.\n${result.exported.reason}`)
    } else if (result.exported) {
      setSaveNote({ text: '저장 완료 · 로컬 렌더 데이터 갱신', warn: false })
    } else {
      setSaveNote({ text: '저장 완료', warn: false })
    }
  }, [episodeName])

  const {
    dirty,
    setDirty,
    saving,
    save,
    createFolder,
    deleteFolder,
    moveFile,
    renameFolder,
    deleteFile,
  } = useEpisodeEditor({
    series,
    episodeName,
    scriptRef,
    setScript,
    remapImages: remapFactionImages,
    persist: persistScript,
  })

  const reloadScript = useCallback(() => {
    return loadFactionScript(episodeName)
      .then(loaded => {
        updatedAtRef.current = loaded.updatedAt
        setCelebVoices(loaded.celebVoices)
        const data = loaded.script as unknown as FactionScript
        const groups = data.groups ?? []
        const next = { ...data, groups }
        setScript(next)

        // 편 수는 경계 수 + 1 — 편이 둘 이상이면 접어 두고 하나면 펼친다.
        const shownParts = partSectionsOf(shortsPartCountOf(next)).filter(section => section.key > 0)
        setCollapsedParts(
          shownParts.length >= 2
            ? Object.fromEntries(shownParts.map(section => [section.key, true]))
            : {},
        )
        setDirty(false)
      })
      .catch(error => {
        // 빈 대본으로 조용히 위장하면 다음 저장에서 원본을 지울 수 있으므로 반드시 알린다.
        console.error('[FactionEditor] 대본 로드 실패:', error)
        alert(`대본을 불러오지 못했습니다 — ${error instanceof Error ? error.message : String(error)}`)
        setScript({ title: episodeName, groups: [] })
        setCollapsedParts({})
      })
  }, [episodeName, setCollapsedParts, setDirty])

  useEffect(() => { void reloadScript() }, [reloadScript])
  useEffect(() => {
    if (script) document.title = `${script.title || episodeName} — 세력도감`
  }, [episodeName, script])

  const update = useCallback((patch: Partial<FactionScript>) => {
    setScript(current => current ? { ...current, ...patch } : current)
    setDirty(true)
  }, [setDirty])

  const replaceScript = useCallback((next: FactionScript) => {
    setScript(next)
    setDirty(true)
  }, [setDirty])

  return {
    script,
    scriptRef,
    celebVoices,
    atlasReloadKey,
    saveNote,
    dirty,
    saving,
    save,
    reloadScript,
    update,
    replaceScript,
    createFolder,
    deleteFolder,
    moveFile,
    renameFolder,
    deleteFile,
  }
}
