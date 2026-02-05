'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import { X, ZoomIn, ZoomOut, RotateCcw, Grid3X3, Sparkles, Loader2 } from 'lucide-react'

import Button from './Button'
import { detectFaceLandmarks, calculateOptimalCrop } from '@/utils/faceDetection'

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

      {/* 3등분 가로선 (미간/턱 가이드) */}
      <div className="absolute left-0 right-0 top-1/3 h-px bg-red-400/60 border-t border-red-500 shadow-[0_0_4px_rgba(248,113,113,0.8)]" />
      <div className="absolute left-0 right-0 top-2/3 h-px bg-blue-400/60 border-t border-blue-500 shadow-[0_0_4px_rgba(96,165,250,0.8)]" />
    </div>
  )
}

export default function ImageCropModal({ imageSrc, aspectRatio = 1, onComplete, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [showGrid, setShowGrid] = useState(true)

  // AI 분석 상태
  const [analyzing, setAnalyzing] = useState(false)
  const imageSize = useRef<{ width: number; height: number } | null>(null)
  
  // 컨테이너 ref (렌더링된 이미지 크기 계산용)
  const containerRef = useRef<HTMLDivElement>(null)

  // 이미지 크기 저장 + 썸네일(3:4)이면 자동 AI 맞춤
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imageSize.current = { width: img.width, height: img.height }

      // 썸네일(3:4) → 업로드 즉시 AI 자동 맞춤
      if (Math.abs(aspectRatio - 3 / 4) < 0.01) {
        handleAutoCrop()
      }
    }
    img.src = imageSrc
  }, [imageSrc, aspectRatio])


  // react-easy-crop 미디어 크기 계산 (zoom=1 기준)
  // 1) crop area = 컨테이너에 aspectRatio로 contain
  // 2) 미디어 = crop area를 cover
  const getRenderedDimensions = useCallback(() => {
    if (!containerRef.current || !imageSize.current) return null

    const containerW = containerRef.current.clientWidth
    const containerH = containerRef.current.clientHeight
    const imgRatio = imageSize.current.width / imageSize.current.height
    const containerRatio = containerW / containerH

    // 크롭 영역 크기 (컨테이너에 맞는 최대 크기)
    const cropAreaW = aspectRatio > containerRatio ? containerW : containerH * aspectRatio
    const cropAreaH = aspectRatio > containerRatio ? containerW / aspectRatio : containerH
    const cropRatio = cropAreaW / cropAreaH

    // 미디어가 크롭 영역을 cover하도록 스케일
    if (imgRatio > cropRatio) {
      return { width: cropAreaH * imgRatio, height: cropAreaH }
    }
    return { width: cropAreaW, height: cropAreaW / imgRatio }
  }, [aspectRatio])

  const handleAutoCrop = async () => {
    if (!imageSize.current) return
    setAnalyzing(true)

    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = imageSrc
      await img.decode()

      const result = await detectFaceLandmarks(img)
      if (result) {
        const suggestion = calculateOptimalCrop(result)
        
        const dims = getRenderedDimensions()
        if (dims) {
          // Crop Pixels 계산
          // Zoom된 상태에서의 거리를 이동해야 하므로 zoom을 곱해줍니다.
          const cropX = (0.5 - suggestion.center.x) * dims.width * suggestion.zoom
          const cropY = (0.5 - suggestion.center.y) * dims.height * suggestion.zoom
          
          console.log("Applying auto-crop with zoom:", { ...suggestion, crop: { x: cropX, y: cropY } })
          setZoom(suggestion.zoom)
          setCrop({ x: cropX, y: cropY })
        }
      } else {
        alert('얼굴을 찾을 수 없습니다.')
      }
    } catch (e) {
      console.error(e)
      alert(`이미지 분석 중 오류가 발생했습니다: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setAnalyzing(false)
    }
  }

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
        <div ref={containerRef} className={`relative bg-black ${aspectRatio < 1 ? 'h-96' : 'h-80'}`}>
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
          {/* 커스텀 격자 오버레이 (react-easy-crop crop area와 동일 크기) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="relative"
              style={{
                aspectRatio: `${aspectRatio}`,
                height: '100%',
                maxWidth: '100%',
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
            <div className="w-px h-4 bg-border mx-1" />
            <button
              onClick={handleAutoCrop}
              disabled={analyzing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                analyzing 
                  ? 'bg-accent/10 text-accent cursor-wait' 
                  : 'bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/20'
              }`}
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  AI 자동 맞춤
                </>
              )}
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
