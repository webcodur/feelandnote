// 작은 미리보기만 서버 캐시에서 축소한다. 원본·외부 사진은 편집과 드래그에 그대로 쓴다.
export const ADMIN_PREVIEW_REMOTE_PATTERN = {
  protocol: 'https',
  hostname: 'assets.feelandnote.com',
  port: '',
} as const

export function imagePreviewProps(src: string, sizes?: string) {
  return {
    sizes,
    unoptimized: !sizes || !src.startsWith(`https://${ADMIN_PREVIEW_REMOTE_PATTERN.hostname}/`),
  }
}
