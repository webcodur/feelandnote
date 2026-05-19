'use client'

import { mediaSrc, isVideoFile } from '../utils'

/**
 * 파일 확장자로 `<img>` / `<video muted loop>` 자동 분기하는 공통 미디어 프리뷰.
 * 풀·인라인 썸네일에서 공용 사용. onError 콜백으로 에러 표시.
 */
export function MediaThumb({ fileName, imageBaseUrl, className, onError }: {
  fileName: string; imageBaseUrl: string; className?: string; onError?: () => void
}) {
  const src = mediaSrc(imageBaseUrl, fileName)
  if (isVideoFile(fileName)) {
    return (
      <video
        src={src}
        className={className}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        onError={onError}
      />
    )
  }
  return <img src={src} alt="" className={className} onError={onError} />
}
