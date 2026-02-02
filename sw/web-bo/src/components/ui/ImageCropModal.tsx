'use client'

import { useState, useCallback, useEffect } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import { X, ZoomIn, ZoomOut, RotateCcw, Grid3X3 } from 'lucide-react'
import Button from './Button'

interface Props {
  imageSrc: string
  aspectRatio?: number
  onComplete: (croppedImage: string) => void
  onCancel: () => void
}

// 격자 오버레이 컴포넌트 (중앙선 + 보조선)
function GridOverlay({ showGrid }: { showGrid: boolean }) {
  if (!showGrid) return null

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
      {/* 중앙 세로선 */}
      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/60" style={{ transform: 'translateX(-50%)' }} />
      {/* 중앙 가로선 */}
      <div className="absolute left-0 right-0 top-1/2 h-px bg-white/60" style={{ transform: 'translateY(-50%)' }} />

      {/* 3등분 세로선 */}
      <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/30" />
      <div className="absolute top-0 bottom-0 left-2/3 w-px bg-white/30" />

      {/* 3등분 가로선 */}
      <div className="absolute left-0 right-0 top-1/3 h-px bg-white/30" />
      <div className="absolute left-0 right-0 top-2/3 h-px bg-white/30" />

      {/* 눈높이 가이드 (상단 1/4 지점) - 인물 사진용 */}
      <div className="absolute left-0 right-0 top-1/4 h-px bg-yellow-400/40 border-dashed" />
    </div>
  )
}

export default function ImageCropModal({ imageSrc, aspectRatio = 1, onComplete, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [showGrid, setShowGrid] = useState(true)

  // 썸네일(3:4)에 초상화 이미지를 넣을 때 자동 크롭 위치 조정
  useEffect(() => {
    // 썸네일(3:4) 비율이 아니면 기본 동작
    if (Math.abs(aspectRatio - 3 / 4) > 0.01) return

    const img = new Image()
    img.onload = () => {
      const imageRatio = img.width / img.height

      // 이미지가 충분히 큰지 확인 (600x800 이상)
      const isLargeEnough = img.width >= 600 && img.height >= 800

      // 이미지가 세로로 긴 경우 (초상화 형태: 비율 < 0.75)
      const isPortraitLike = imageRatio < 0.75

      if (isLargeEnough && isPortraitLike) {
        // 가로 너비가 원본의 절반 정도가 되도록 zoom 설정
        setZoom(2)
        // 세로는 위쪽에 딱 붙이기 (y: -50이 최상단)
        setCrop({ x: 0, y: -50 })
      }
    }
    img.src = imageSrc
  }, [imageSrc, aspectRatio])

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
        <div className={`relative bg-black ${aspectRatio < 1 ? 'h-96' : 'h-80'}`}>
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
          {/* 커스텀 격자 오버레이 - 크롭 영역 내부에 표시 */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="relative"
              style={{
                aspectRatio: `${aspectRatio}`,
                height: aspectRatio < 1 ? '85%' : '70%',
              }}
            >
              <GridOverlay showGrid={showGrid} />
            </div>
          </div>
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
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-1.5 rounded ${showGrid ? 'text-accent bg-accent/10' : 'text-text-secondary hover:text-text-primary'}`}
              title="격자 가이드"
            >
              <Grid3X3 className="w-4 h-4" />
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
