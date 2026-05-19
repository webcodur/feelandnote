'use client'

import { useCallback, useState } from 'react'
import type { EpisodeData } from '../../EpisodeEditor'
import type { CinematicImage, ImageField, AnchorPick, ImageEditorProps } from '../types'
import { useFolderImages } from './useFolderImages'
import { makeImageOps } from './useImageOps'
import { usePoolMaps } from './usePoolMaps'

/**
 * 시나리오 페이지 이미지 편집 통합 훅.
 *
 * 폴더 동기 + 이미지 풀 맵 + 책/세그먼트 이미지 조작 + 앵커 픽업을 한 인스턴스에 묶어
 * imgProps로 LongformView·ShortsView에 한꺼번에 전달한다.
 *
 * 책 탭에서는 롱폼 영역과 쇼츠 영역이 동시 노출되므로 ScenarioView가 두 인스턴스를 만들어 운영.
 */
export function useImageEditor(params: {
  episode: EpisodeData
  updateEpisode: (ep: EpisodeData) => void
  series: string
  name: string
  view: string
  books: any[]
  shortsArr: any[]
  currentShortsIndex: number
  currentShorts: any
}) {
  const { episode, updateEpisode, series, name, view, books, shortsArr, currentShortsIndex, currentShorts } = params
  const isShortsView = view.startsWith('shorts-')
  const segments: any[] = currentShorts?.segments ?? []

  const folder = useFolderImages(series, name)
  const ops = makeImageOps({
    isShortsView, books, segments, currentShorts, currentShortsIndex, shortsArr, episode, updateEpisode,
    renameFile: folder.renameFile, mediaPath: folder.mediaPath,
  })
  const maps = usePoolMaps({ isShortsView, books, segments, currentShorts, shortsArr, view })

  const [anchorPick, setAnchorPick] = useState<AnchorPick>(null)
  const handlePick = useCallback((selected: string, field?: ImageField) => {
    setAnchorPick(prev => prev ? { ...prev, draft: selected, ...(field ? { field } : {}) } : null)
  }, [])
  const confirmAnchor = () => {
    if (!anchorPick?.draft) return
    const { itemIdx: idx, imgIdx, draft, field } = anchorPick
    const imgs = [...ops.getImages(idx)]
    imgs[imgIdx] = { ...imgs[imgIdx], text: draft, ...(field ? { field } : {}) } as CinematicImage
    ops.setImages(idx, imgs)
    setAnchorPick(null)
  }

  const imgProps: ImageEditorProps = {
    anchorPick, setAnchorPick,
    imageBaseUrl: folder.imageBaseUrl,
    folderImages: folder.folderImages,
    usedFiles: maps.usedFiles,
    fileBookMap: maps.fileBookMap,
    fileFieldMap: maps.fileFieldMap,
    refreshFolderImages: folder.refreshFolderImages,
    view,
    getImages: ops.getImages,
    removeImage: ops.removeImage,
    removeImageOnly: ops.removeImageOnly,
    replaceImage: ops.replaceImage,
    addAnchor: ops.addAnchor,
    dropImage: ops.dropImage,
    handlePick,
    confirmAnchor,
    crossUsage: maps.crossUsage,
    subFolders: folder.subFolders,
    fileFolders: folder.fileFolders,
    duplicates: folder.duplicates,
    moveFileToFolder: folder.moveFileToFolder,
    createFolder: folder.createFolder,
    renameFolder: folder.renameFolder,
    deleteFolder: folder.deleteFolder,
  }

  return {
    anchorPick, setAnchorPick,
    imageBaseUrl: folder.imageBaseUrl,
    folderImages: folder.folderImages,
    refreshFolderImages: folder.refreshFolderImages,
    assignedFiles: maps.assignedFiles,
    crossUsage: maps.crossUsage,
    usedFiles: maps.usedFiles,
    fileBookMap: maps.fileBookMap,
    fileFieldMap: maps.fileFieldMap,
    getImages: ops.getImages,
    imgProps,
    subFolders: folder.subFolders,
    fileFolders: folder.fileFolders,
    duplicates: folder.duplicates,
    moveFileToFolder: folder.moveFileToFolder,
    createFolder: folder.createFolder,
    renameFolder: folder.renameFolder,
    deleteFolder: folder.deleteFolder,
  }
}
