'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { FactionImageCrop, ZoomFocus } from '@/lib/faction-types'
import { imageSrc } from '../../../../shared/timing'
import { FactionMediaThumb } from '../../../../shared/FactionMediaThumb'
import { FactionImageCropEditor } from './FactionImageCropEditor'
import { FactionZoomFocusPicker } from './FactionZoomFocusPicker'

type Props = {
  value?: string
  onChange: (next: string | undefined) => void
  series: string
  episodeName: string
  slug?: string
  onClose: () => void
  /** 사진 맞춤(잘릴 위치·확대) — 있으면 미리보기 자리에 9:16 위치 편집기를 띄운다 */
  crop?: FactionImageCrop
  onCropChange?: (crop: FactionImageCrop | undefined) => void
  /** 편집기 채움 방식 — 인물 컷 'cover', 로고·화보 'contain'. 기본 'cover' */
  cropFit?: 'cover' | 'contain'
  /** 줌 푸시인 목표점 — 있으면 보일 위치 편집기 아래에 「다가갈 지점」 클릭 picker를 띄운다 */
  zoomFocus?: ZoomFocus
  onZoomFocusChange?: (focus: ZoomFocus | undefined) => void
}

export function FactionImagePicker({ value, onChange, series, episodeName, slug, onClose, crop, onCropChange, cropFit = 'cover', zoomFocus, onZoomFocusChange }: Props) {
  const [images, setImages] = useState<string[]>([])
  const [urlInput, setUrlInput] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const loadImages = useCallback(() => {
    fetch(`/api/${series}/faction-image?ep=${encodeURIComponent(episodeName)}`)
      .then(r => r.json())
      .then(d => setImages(Array.isArray(d) ? d : []))
      .catch(() => setImages([]))
  }, [series, episodeName])

  useEffect(() => { loadImages() }, [loadImages])

  // 파일 업로드 → basename 적용
  const handleUpload = async (file: File) => {
    setBusy(true)
    try {
      const form = new FormData()
      form.append('ep', episodeName)
      form.append('file', file)
      const res = await fetch(`/api/${series}/faction-image`, { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok && data.file) {
        onChange(data.file)
        loadImages()
      } else {
        alert('업로드 실패: ' + (data.error ?? ''))
      }
    } catch {
      alert('업로드 중 오류가 발생했습니다.')
    } finally {
      setBusy(false)
    }
  }

  // 기존 이미지 삭제
  const handleDeleteImage = async (file: string) => {
    if (!confirm(`${file} 이미지를 삭제하시겠습니까?`)) return
    setBusy(true)
    try {
      await fetch(`/api/${series}/faction-image?ep=${encodeURIComponent(episodeName)}&file=${encodeURIComponent(file)}`, { method: 'DELETE' })
      if (value === file) onChange(undefined)
      loadImages()
    } finally {
      setBusy(false)
    }
  }

  // URL 이미지를 셀럽 아바타로 로컬 저장
  const handleSaveAvatar = async () => {
    if (!value || !value.startsWith('http') || !slug) return
    setBusy(true)
    try {
      const res = await fetch(`/api/${series}/faction-avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ep: episodeName, url: value, slug }),
      })
      const data = await res.json()
      if (res.ok && data.file) {
        onChange(data.file)
        loadImages()
      } else {
        alert('저장 실패: ' + (data.error ?? ''))
      }
    } finally {
      setBusy(false)
    }
  }

  const canSaveAvatar = !!slug && !!value && value.startsWith('http')

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20" onClick={onClose}>
      <div
        className="flex max-h-[calc(100vh-6rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border bg-bg-card shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border p-3">
          <span className="font-semibold text-text-primary">이미지 선택</span>
          <button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover">
            닫기
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* 현재 미리보기 — onCropChange 가 있으면 9:16 위치 편집기로, 없으면 작은 썸네일 */}
          {value && onCropChange ? (
            <div className="space-y-2 rounded-md border border-border bg-bg-secondary p-2">
              <div className="flex flex-wrap justify-center gap-4">
                <div>
                  <p className="mb-1 text-center text-[10px] font-semibold text-text-secondary">보일 위치</p>
                  <FactionImageCropEditor src={imageSrc(series, episodeName, value)!} crop={crop} onChange={onCropChange} fit={cropFit} />
                </div>
                {onZoomFocusChange && (
                  <div>
                    <p className="mb-1 text-center text-[10px] font-semibold text-text-secondary">다가갈 지점(줌)</p>
                    <FactionZoomFocusPicker src={imageSrc(series, episodeName, value)!} focus={zoomFocus} onChange={onZoomFocusChange} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">{value}</span>
                <button onClick={() => onChange(undefined)} className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-danger-text hover:bg-danger">
                  제거
                </button>
              </div>
            </div>
          ) : value ? (
            <div className="flex items-center gap-3 rounded-md border border-border bg-bg-secondary p-2">
              <FactionMediaThumb src={imageSrc(series, episodeName, value)!} alt="" className="h-14 w-14 rounded-md object-cover" />
              <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">{value}</span>
              <button onClick={() => onChange(undefined)} className="rounded-md border border-border px-2 py-1 text-xs text-danger-text hover:bg-danger">
                제거
              </button>
            </div>
          ) : null}

          {/* 파일 업로드 */}
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg-main hover:bg-accent-hover disabled:opacity-50"
            >
              파일 업로드
            </button>
            {canSaveAvatar && (
              <button
                onClick={handleSaveAvatar}
                disabled={busy}
                className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
              >
                아바타로 저장
              </button>
            )}
          </div>

          {/* URL 직접 입력 */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="이미지 URL 붙여넣기"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              className="flex-1 rounded-md border border-border bg-bg-main px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
            <button
              onClick={() => { if (urlInput.trim()) { onChange(urlInput.trim()); setUrlInput('') } }}
              className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
            >
              적용
            </button>
          </div>

          {/* 기존 이미지 목록 */}
          <div>
            <p className="mb-2 text-xs font-semibold text-text-secondary">에피소드 이미지</p>
            {images.length === 0 ? (
              <p className="text-xs text-text-dim">업로드된 이미지가 없습니다.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {images.map(f => (
                  <div key={f} className="group relative">
                    <button
                      onClick={() => onChange(f)}
                      className={`block w-full overflow-hidden rounded-md border ${value === f ? 'border-accent' : 'border-border'}`}
                    >
                      <FactionMediaThumb src={imageSrc(series, episodeName, f)!} alt="" className="aspect-square w-full object-cover" />
                    </button>
                    <button
                      onClick={() => handleDeleteImage(f)}
                      className="absolute end-1 top-1 rounded bg-danger px-1.5 py-px text-[11px] text-danger-text opacity-0 group-hover:opacity-100"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
