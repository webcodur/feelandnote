'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import { X, ZoomIn, ZoomOut, RotateCcw, Grid3X3, Sparkles, Loader2, AlertTriangle } from 'lucide-react'

import Button from './Button'
import { detectFaceLandmarks, calculateFaceCropArea } from '@/utils/faceDetection'

interface Props {
  imageSrc: string
  aspectRatio?: number
  /** 자른 그림을 무손실 PNG 데이터 URL로 넘긴다. 최종 압축은 받는 쪽(lib/image.ts)에서 한 번만 한다. */
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
  const [notice, setNotice] = useState<{ tone: 'warn' | 'error'; lines: string[] } | null>(null)
  const imageSize = useRef<{ width: number; height: number } | null>(null)

  // initialCroppedAreaPixels + key remount 방식
  const [initialArea, setInitialArea] = useState<Area | undefined>(undefined)
  const [cropperKey, setCropperKey] = useState(0)

  // 이미지 크기 저장 + 1:1이면 자동 AI 맞춤
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imageSize.current = { width: img.width, height: img.height }

      if (Math.abs(aspectRatio - 1) < 0.01) {
        handleAutoCrop()
      }
    }
    img.src = imageSrc
  }, [imageSrc, aspectRatio])

  const handleAutoCrop = async () => {
    if (!imageSize.current) return
    setAnalyzing(true)
    setNotice(null)

    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = imageSrc
      await img.decode()

      const result = await detectFaceLandmarks(img)
      if (!result) {
        setNotice({ tone: 'error', lines: ['얼굴을 찾지 못했습니다. 아래 조절 막대로 직접 맞춰 주세요.'] })
        return
      }

      const { area, warnings } = calculateFaceCropArea(result, img.naturalWidth, img.naturalHeight)

      // react-easy-crop에게 "이 영역을 보여줘"라고 지시 → 내부에서 crop+zoom 자동 계산
      setInitialArea(area)
      setCropperKey(k => k + 1)

      // 규격을 벗어난 채로 잘렸으면 조용히 넘기지 않는다
      if (warnings.length > 0) setNotice({ tone: 'warn', lines: warnings })
    } catch (e) {
      console.error(e)
      setNotice({
        tone: 'error',
        lines: [`이미지를 분석하지 못했습니다: ${e instanceof Error ? e.message : String(e)}`],
      })
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
    setInitialArea(undefined)
    setCropperKey(k => k + 1)
    setNotice(null)
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
            key={cropperKey}
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape={aspectRatio === 1 ? 'round' : 'rect'}
            showGrid={false}
            restrictPosition={false}
            initialCroppedAreaPixels={initialArea}
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
          {/* 자동 맞춤 안내 — 규격을 벗어났거나 얼굴을 못 찾았을 때 */}
          {notice && (
            <div
              className={`flex gap-2 p-3 rounded-lg text-xs leading-relaxed ${
                notice.tone === 'error'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
              <div className="flex-1 space-y-1">
                {notice.lines.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              <button onClick={() => setNotice(null)} className="shrink-0 opacity-70 hover:opacity-100">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

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
/**
 * 자른 결과를 무손실 PNG로 돌려준다.
 * 여기서 webp로 줄이면 뒤이은 축소(lib/image.ts)와 합쳐 손실이 두 겹 쌓인다 — 압축은 마지막 한 번만 한다.
 */
async function getCroppedImage(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // restrictPosition=false 시 크롭 영역이 이미지 밖으로 나갈 수 있음
  // 이미지 밖 영역은 투명 유지 (누끼 보존)
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 이미지 소스 영역 클램핑
  const sx = Math.max(0, pixelCrop.x)
  const sy = Math.max(0, pixelCrop.y)
  const sRight = Math.min(image.naturalWidth, pixelCrop.x + pixelCrop.width)
  const sBottom = Math.min(image.naturalHeight, pixelCrop.y + pixelCrop.height)
  const sw = sRight - sx
  const sh = sBottom - sy

  // 캔버스 대상 위치 (음수 오프셋 보정)
  const dx = sx - pixelCrop.x
  const dy = sy - pixelCrop.y

  if (sw > 0 && sh > 0) {
    ctx.drawImage(image, sx, sy, sw, sh, dx, dy, sw, sh)
  }

  return canvas.toDataURL('image/png')
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
