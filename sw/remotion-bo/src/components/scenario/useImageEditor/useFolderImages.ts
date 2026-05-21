'use client'

import { useCallback, useEffect, useState } from 'react'
import { isVideoFile } from '../utils'

const mediaRoot = (fileName: string) => (isVideoFile(fileName) ? 'videos' : 'images')

/**
 * 에피소드 폴더의 미디어 파일 목록과 폴더 트리를 디스크와 동기화하는 훅.
 *
 * - 이미지·영상 두 API를 병렬 호출해 합집합으로 풀 구성. 영상은 서브폴더 미지원.
 * - 창 포커스/visibility 변화 시 자동 재동기화 (외부 탐색기 변경 즉시 반영).
 * - 파일 rename/이동/폴더 CRUD를 fetch로 처리하고 성공 시 풀 재로드.
 * - mediaPath: 신구조(인물 폴더가 스캔 루트)와 레거시(images/ 안 서브폴더) 모두 처리.
 */
export function useFolderImages(series: string, name: string) {
  const [folderImages, setFolderImages] = useState<string[]>([])
  const [subFolders, setSubFolders] = useState<string[]>([])
  const [fileFolders, setFileFolders] = useState<Record<string, string>>({})
  const [duplicates, setDuplicates] = useState<Array<{ name: string; folders: string[] }>>([])
  const [epStatus, setEpStatus] = useState<string>('live')
  const [newLayout, setNewLayout] = useState<boolean>(false)
  const imageBaseUrl = `/api/${series}/images/${name}`

  const refreshFolderImages = useCallback(() => {
    Promise.all([
      fetch(`/api/${series}/images/${name}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/${series}/videos/${name}`).then(r => r.json()).catch(() => ({})),
    ]).then(([img, vid]) => {
      const imgFiles: string[] = img.files ?? []
      const vidFiles: string[] = vid.files ?? []
      setFolderImages([...imgFiles, ...vidFiles])
      setSubFolders(img.folders ?? [])
      setFileFolders({ ...(img.fileFolders ?? {}), ...(vid.fileFolders ?? {}) })
      setDuplicates([...(img.duplicates ?? []), ...(vid.duplicates ?? [])])
      if (img.status) setEpStatus(img.status)
      else if (vid.status) setEpStatus(vid.status)
      if (typeof img.newLayout === 'boolean') setNewLayout(img.newLayout)
    }).catch(() => {})
  }, [series, name])

  useEffect(() => { refreshFolderImages() }, [refreshFolderImages])

  // 외부에서 변경된 폴더·파일이 사용자가 브라우저로 돌아오는 시점에 즉시 반영되도록.
  useEffect(() => {
    const onFocus = () => refreshFolderImages()
    const onVisibility = () => { if (document.visibilityState === 'visible') refreshFolderImages() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refreshFolderImages])

  const renameFile = useCallback(async (oldName: string, newName: string): Promise<string | null> => {
    if (oldName === newName) return oldName
    try {
      const res = await fetch(`/api/${series}/${mediaRoot(oldName)}/${name}/${oldName}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName }),
      })
      if (res.ok) { refreshFolderImages(); return newName }
      console.warn('[미디어 rename 실패]', await res.text())
      return null
    } catch { return null }
  }, [series, name, refreshFolderImages])

  const moveFileToFolder = useCallback(async (fileName: string, targetFolder: string): Promise<boolean> => {
    if (isVideoFile(fileName) && targetFolder) {
      alert('영상은 서브폴더 이동을 지원하지 않습니다.')
      return false
    }
    try {
      const res = await fetch(`/api/${series}/${mediaRoot(fileName)}/${name}/${fileName}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetFolder }),
      })
      if (res.ok) { refreshFolderImages(); return true }
      const err = await res.json().catch(() => ({}))
      alert(`이동 실패: ${err.error ?? res.statusText}`)
      return false
    } catch (e) {
      alert(`이동 실패: ${(e as Error).message}`)
      return false
    }
  }, [series, name, refreshFolderImages])

  const createFolder = useCallback(async (folderPath: string): Promise<boolean> => {
    const parts = folderPath.split('/').filter(Boolean)
    if (!parts.length) return false
    try {
      const res = await fetch(`/api/${series}/folders/${name}/${parts.join('/')}`, { method: 'POST' })
      if (res.ok) { refreshFolderImages(); return true }
      const err = await res.json().catch(() => ({}))
      alert(`폴더 생성 실패: ${err.error ?? res.statusText}`)
      return false
    } catch (e) {
      alert(`폴더 생성 실패: ${(e as Error).message}`)
      return false
    }
  }, [series, name, refreshFolderImages])

  const renameFolder = useCallback(async (folderPath: string, nextName: string): Promise<boolean> => {
    const parts = folderPath.split('/').filter(Boolean)
    if (!parts.length || !nextName) return false
    try {
      const res = await fetch(`/api/${series}/folders/${name}/${parts.join('/')}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: nextName }),
      })
      if (res.ok) { refreshFolderImages(); return true }
      const err = await res.json().catch(() => ({}))
      alert(`폴더 이름 변경 실패: ${err.error ?? res.statusText}`)
      return false
    } catch (e) {
      alert(`폴더 이름 변경 실패: ${(e as Error).message}`)
      return false
    }
  }, [series, name, refreshFolderImages])

  const deleteFolder = useCallback(async (folderPath: string): Promise<boolean> => {
    const parts = folderPath.split('/').filter(Boolean)
    if (!parts.length) return false
    try {
      const res = await fetch(`/api/${series}/folders/${name}/${parts.join('/')}`, { method: 'DELETE' })
      if (res.ok) { refreshFolderImages(); return true }
      const err = await res.json().catch(() => ({}))
      alert(`폴더 삭제 실패: ${err.error ?? res.statusText}`)
      return false
    } catch (e) {
      alert(`폴더 삭제 실패: ${(e as Error).message}`)
      return false
    }
  }, [series, name, refreshFolderImages])

  /**
   * 파일명 확장자에 따라 실제 저장 경로 합성.
   * 신구조: fileFolders[file] = '09-슈퍼인텔리전스' 또는 '09-슈퍼인텔리전스/E-rival' 같은 책 폴더 상대경로(PoolFolders 표시 호환).
   *         실제 디스크는 books/<책>/images/<sub?>/<file> 이므로 합성 시 books/ prefix 와 images/ 중간 토막을 펼친다.
   * 레거시: epDir/images/ 가 스캔 루트라 sub은 'images' 안의 서브폴더(예 'shorts/s2'). 영상은 videos/ 라우트.
   */
  const mediaPath = (fileName: string) => {
    const sub = fileFolders[fileName] ?? ''
    // 활성 status(live·done)는 디스크에 status 폴더가 없고 인물 폴더가 episodes 직속.
    // 그 외 status(todo·excluded 등)는 episodes/{status}/{인물} 폴더 안.
    const activeStatuses = new Set(['live', 'done'])
    const statusPart = activeStatuses.has(epStatus) ? '' : `${epStatus}/`
    const episodeBaseDir = `episodes/${statusPart}${name}`
    if (newLayout) {
      if (!sub) return `${episodeBaseDir}/${fileName}`
      const [bookFolder, ...rest] = sub.split('/')
      const subInside = rest.length ? `${rest.join('/')}/` : ''
      return `${episodeBaseDir}/books/${bookFolder}/images/${subInside}${fileName}`
    }
    const subPart = sub ? `${sub}/` : ''
    return `${episodeBaseDir}/${mediaRoot(fileName)}/${subPart}${fileName}`
  }

  return {
    folderImages, subFolders, fileFolders, duplicates,
    imageBaseUrl, refreshFolderImages,
    renameFile, mediaPath,
    moveFileToFolder, createFolder, renameFolder, deleteFolder,
  }
}
