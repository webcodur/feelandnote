'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import { X, ZoomIn, ZoomOut, RotateCcw, Grid3X3, Sparkles, Loader2, AlertTriangle } from 'lucide-react'

import Button from './Button'
import { detectFaceLandmarks, calculateFaceCropArea } from '@/utils/faceDetection'

interface Props {
  imageSrc: string
  aspectRatio?: number
  title?: string
  description?: string
  cropShape?: 'round' | 'rect'
  enableAutoCrop?: boolean
  restrictPosition?: boolean
  /**
   * 이미지가 크롭 프레임보다 작아질 때 생기는 바깥 영역을 투명 여백으로 보존한다.
   * 누끼 아바타처럼 피사체를 원 안에 억지로 맞추지 않고 자유롭게 배치할 때 사용한다.
   */
  allowTransparentPadding?: boolean
  /** 자른 그림을 무손실 PNG 데이터 URL로 넘긴다. 최종 압축은 받는 쪽(lib/image.ts)에서 한 번만 한다. */
  onComplete: (croppedImage: string) => void
  onCancel: () => void
}

// 격자 오버레이 컴포넌트 (중앙선 + 보조선)
function GridOverlay({ showGrid, faceGuides }: { showGrid: boolean; faceGuides: boolean }) {
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

      {/* 아바타에서는 미간/턱 가이드, 일반 사진에서는 중립적인 3등분선 */}
      <div className={`absolute left-0 right-0 top-1/3 h-px ${faceGuides ? 'border-t border-red-500 bg-red-400/60 shadow-[0_0_4px_rgba(248,113,113,0.8)]' : 'bg-white/30'}`} />
      <div className={`absolute left-0 right-0 top-2/3 h-px ${faceGuides ? 'border-t border-blue-500 bg-blue-400/60 shadow-[0_0_4px_rgba(96,165,250,0.8)]' : 'bg-white/30'}`} />
    </div>
  )
}

export default function ImageCropModal({
  imageSrc,
  aspectRatio = 1,
  title = '이미지 편집',
  description,
  cropShape,
  enableAutoCrop = true,
  restrictPosition = false,
  allowTransparentPadding = false,
  onComplete,
  onCancel,
}: Props) {
  const minimumZoom = allowTransparentPadding ? 0.1 : 1
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

  const handleAutoCrop = useCallback(async () => {
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
  }, [imageSrc])

  // 이미지 크기 저장 + 1:1이면 자동 AI 맞춤
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imageSize.current = { width: img.width, height: img.height }

      if (enableAutoCrop && Math.abs(aspectRatio - 1) < 0.01) {
        handleAutoCrop()
      }
    }
    img.src = imageSrc
  }, [imageSrc, aspectRatio, enableAutoCrop, handleAutoCrop])

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
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative bg-bg-card border border-border rounded-2xl w-full max-w-lg mx-4 overflow-hidden"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-text-secondary">{description}</p>}
          </div>
          <button type="button" onClick={onCancel} aria-label="이미지 편집 닫기" className="p-1 text-text-secondary hover:text-text-primary">
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
            minZoom={minimumZoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape={cropShape ?? (aspectRatio === 1 ? 'round' : 'rect')}
            showGrid={false}
            restrictPosition={restrictPosition}
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
              <GridOverlay showGrid={showGrid} faceGuides={enableAutoCrop} />
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

          {allowTransparentPadding && (
            <p className="rounded-lg border border-border bg-bg-secondary/60 px-3 py-2 text-xs leading-relaxed text-text-secondary">
              누끼 아바타 모드: 0.1배까지 축소하고 인물을 원 밖으로 자유롭게 옮길 수 있습니다. 이미지가 없는 부분은 투명하게 저장됩니다.
            </p>
          )}

          {/* 줌 슬라이더 */}
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-text-secondary shrink-0" />
            <input
              type="range"
              min={minimumZoom}
              max={3}
              step={allowTransparentPadding ? 0.05 : 0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1 bg-bg-secondary rounded-full appearance-none cursor-pointer accent-accent"
            />
            <span className="w-10 text-right text-[11px] tabular-nums text-text-secondary">
              {zoom.toFixed(zoom < 1 ? 2 : 1)}×
            </span>
            <ZoomIn className="w-4 h-4 text-text-secondary shrink-0" />
            <button type="button" onClick={handleReset} className="p-1.5 text-text-secondary hover:text-text-primary" title="초기화">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              type="button"
              className={`p-1.5 rounded ${showGrid ? 'text-accent bg-accent/10' : 'text-text-secondary hover:text-text-primary'}`}
              title="격자 가이드"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            {enableAutoCrop && (
              <>
                <div className="w-px h-4 bg-border mx-1" />
                <button
                  type="button"
                  onClick={handleAutoCrop}
                  disabled={analyzing}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
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
              </>
            )}
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

  // 1배 미만으로 축소하면 원본 좌표계의 크롭 영역은 이미지보다 몇 배 커진다.
  // 그 크기로 캔버스를 만들면 대형 원본에서 브라우저 한도를 넘으므로, 최종 800/1080 리사이즈에
  // 충분한 2400px까지만 무손실 중간 결과를 만든다.
  const maxOutputEdge = 2400
  const outputScale = Math.min(1, maxOutputEdge / Math.max(pixelCrop.width, pixelCrop.height))

  canvas.width = Math.max(1, Math.round(pixelCrop.width * outputScale))
  canvas.height = Math.max(1, Math.round(pixelCrop.height * outputScale))
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

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
  const dx = (sx - pixelCrop.x) * outputScale
  const dy = (sy - pixelCrop.y) * outputScale

  if (sw > 0 && sh > 0) {
    ctx.drawImage(image, sx, sy, sw, sh, dx, dy, sw * outputScale, sh * outputScale)
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
