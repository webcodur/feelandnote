'use client'

import { useState, useCallback } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import Button from './Button'

interface Props {
  imageSrc: string
  aspectRatio?: number
  onComplete: (croppedImage: string) => void
  onCancel: () => void
}

export default function ImageCropModal({ imageSrc, aspectRatio = 1, onComplete, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return

    const croppedImage = await getCroppedImage(imageSrc, croppedAreaPixels)
    onComplete(croppedImage)
  }

  const handleReset = () => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/80" onClick={onCancel} />

      {/* 모달 */}
      <div className="relative bg-bg-card border border-border rounded-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-text-primary">이미지 편집</h3>
          <button onClick={onCancel} className="p-1 text-text-secondary hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 크롭 영역 */}
        <div className="relative h-80 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape={aspectRatio === 1 ? 'round' : 'rect'}
            showGrid={false}
          />
        </div>

        {/* 컨트롤 */}
        <div className="p-4 space-y-4">
          {/* 줌 슬라이더 */}
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-text-secondary shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1 bg-bg-secondary rounded-full appearance-none cursor-pointer accent-accent"
            />
            <ZoomIn className="w-4 h-4 text-text-secondary shrink-0" />
            <button onClick={handleReset} className="p-1.5 text-text-secondary hover:text-text-primary" title="초기화">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onCancel}>취소</Button>
            <Button type="button" onClick={handleConfirm}>적용</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// #region getCroppedImage
async function getCroppedImage(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return canvas.toDataURL('image/webp', 0.9)
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.src = url
  })
}
// #endregion
