/** 미디어 파일 확장자 상수와 판별 유틸 — 서버/클라이언트 공용. fs 의존성 없음. */

export const IMG_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
export const VID_EXTS = new Set(['.mp4', '.webm', '.mov', '.m4v'])

export const IMG_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

export const VID_MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
}

function extLower(fileName: string): string {
  const m = fileName.match(/(\.[^.\\/]+)$/)
  return m ? m[1].toLowerCase() : ''
}

export function isVideoFile(fileName: string): boolean {
  return VID_EXTS.has(extLower(fileName))
}

export function isImageFile(fileName: string): boolean {
  return IMG_EXTS.has(extLower(fileName))
}
