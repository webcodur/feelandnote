'use client'

import { useState } from 'react'
import type { FolderDropState } from './constants'

/**
 * 다중 선택과 폴더 이동/삭제 일괄 처리.
 *
 * - selected: 사용자가 클릭으로 모은 파일명 집합.
 * - 드래그 시작 시 선택 집합이 2개 이상이면 dataTransfer에 batch payload를 넣는다.
 * - 폴더 드롭존이 받은 batch는 차례로 onMoveFile을 호출해 이동.
 * - 일괄 삭제는 confirm 후 onDelete 반복.
 */
export function useImagePoolSelection({
  fileFolders, onMoveFile, onDelete,
}: {
  fileFolders: Record<string, string>
  onMoveFile?: (fileName: string, targetFolder: string) => Promise<boolean>
  onDelete?: (fileName: string) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [folderDrop, setFolderDrop] = useState<FolderDropState | null>(null)
  const [batchBusy, setBatchBusy] = useState(false)

  const toggleSelect = (fn: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(fn)) next.delete(fn); else next.add(fn)
      return next
    })
  }

  const clearSelection = () => setSelected(new Set())

  /** 드래그 시작 — 선택 집합에 포함된 파일이면 multi 페이로드 동봉 */
  const handleDragStartMulti = (e: React.DragEvent, fileName: string) => {
    e.dataTransfer.effectAllowed = 'copyMove'
    if (selected.has(fileName) && selected.size > 1) {
      e.dataTransfer.setData('text/plain', fileName)
      e.dataTransfer.setData('application/x-image-batch', JSON.stringify([...selected]))
    } else {
      e.dataTransfer.setData('text/plain', fileName)
    }
  }

  const handleFolderDrop = async (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault()
    e.stopPropagation()
    setFolderDrop(null)
    if (!onMoveFile) return
    const batch = e.dataTransfer.getData('application/x-image-batch')
    const files: string[] = batch ? JSON.parse(batch) : [e.dataTransfer.getData('text/plain')].filter(Boolean)
    if (!files.length) return
    setBatchBusy(true)
    try {
      for (const fn of files) {
        const current = fileFolders[fn] ?? ''
        if (current === targetFolder) continue
        const ok = await onMoveFile(fn, targetFolder)
        if (!ok) break
      }
    } finally {
      setBatchBusy(false)
      clearSelection()
    }
  }

  const batchMove = async (targetFolder: string) => {
    if (!onMoveFile || !selected.size) return
    setBatchBusy(true)
    try {
      for (const fn of selected) {
        const current = fileFolders[fn] ?? ''
        if (current === targetFolder) continue
        const ok = await onMoveFile(fn, targetFolder)
        if (!ok) break
      }
    } finally {
      setBatchBusy(false)
      clearSelection()
    }
  }

  const batchDelete = async () => {
    if (!onDelete || !selected.size) return
    if (!window.confirm(`선택한 ${selected.size}장을 휴지통으로 이동할까?`)) return
    setBatchBusy(true)
    try {
      for (const fn of selected) await onDelete(fn)
    } finally {
      setBatchBusy(false)
      clearSelection()
    }
  }

  return {
    selected, toggleSelect, clearSelection,
    folderDrop, setFolderDrop,
    batchBusy, batchMove, batchDelete,
    handleDragStartMulti, handleFolderDrop,
  }
}
