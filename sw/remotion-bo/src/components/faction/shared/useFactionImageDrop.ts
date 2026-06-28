'use client'

import { useState, type DragEvent } from 'react'

/** 이미지 풀 → 칸 연결용 드래그 데이터 타입 */
export const FACTION_IMAGE_DND = 'application/x-faction-image'

/**
 * 이미지 풀에서 끌어온 이미지를 받는 드롭 칸 공통 훅.
 * onDropImage(path) — 놓인 이미지 경로(에피소드 폴더 상대경로)를 받아 연결한다.
 * 반환 dropProps 를 드롭 대상 요소에 펼쳐 붙이고, dragOver 로 강조 표시한다.
 */
export function useFactionImageDrop(onDropImage: (path: string) => void) {
  const [dragOver, setDragOver] = useState(false)
  const dropProps = {
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes(FACTION_IMAGE_DND)) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      if (!dragOver) setDragOver(true)
    },
    onDragLeave: () => setDragOver(false),
    onDrop: (e: DragEvent) => {
      const path = e.dataTransfer.getData(FACTION_IMAGE_DND)
      setDragOver(false)
      if (!path) return
      e.preventDefault()
      e.stopPropagation()
      onDropImage(path)
    },
  }
  return { dragOver, dropProps }
}
