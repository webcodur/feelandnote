/** 기존 원본 옆에 두는 표시용 화보. 원본·구도는 바꾸지 않는다. */
export const PORTRAIT_DISPLAY = { widths: [480, 768, 1024], quality: 82 } as const
export const MYTH_TITLE_DISPLAY = { widths: [768, 1024, 1536], quality: 82 } as const

export function artworkVariantKey(key: string, width: number): string {
  return key.replace(/\.(?:webp|png|jpe?g)$/i, `.display-${width}.webp`)
}

export function portraitVariantUrl(src: string, width: number): string {
  const match = /^(https:\/\/assets\.feelandnote\.com\/)(celebs\/[^/]+\/photo\.webp|faction\/[^/]+\/celeb-[^/?#]+\.webp)([?#].*)?$/.exec(src)
  return match ? match[1] + artworkVariantKey(match[2], width) + (match[3] ?? '') : src
}
