// 배포가 "Cloudflare에 캐시된 화면(인물·작품 상세, 명부·연표, SEO 이미지)"의 모양을 바꿨는지 판정한다.
// 바꿨으면 배포 뒤 Cloudflare 전체 퍼지 1회. 아니면 아무것도 안 한다 — 대부분의 배포가 여기 해당한다.
// 판정이 애매하면 퍼지 쪽으로 기운다(그 배포는 지금과 같은 재생성 1회 비용, 낡은 화면은 없다).

const CACHED_SCREEN_PREFIXES = [
  // 캐시되는 화면 본체
  'sw/web/src/app/[locale]/(main)/celeb/',
  'sw/web/src/app/[locale]/(main)/content/',
  'sw/web/src/app/[locale]/(main)/explore/directory/',
  'sw/web/src/app/[locale]/(main)/explore/timeline/',
  'sw/web/src/app/[locale]/(main)/explore/layout.tsx',
  'sw/web/src/app/seo-image/',
  'sw/web/src/lib/seoImage',
  // 모든 화면에 깔리는 것들
  'sw/web/src/app/[locale]/layout.tsx',
  'sw/web/src/app/[locale]/(main)/layout.tsx',
  'sw/web/src/app/globals.css',
  'sw/web/src/components/layout/',
  'sw/web/src/components/shared/',
  'sw/web/src/components/ui/',
  'sw/web/src/components/features/celeb/',
  'sw/web/src/components/features/user/contentLibrary/',
  'sw/web/src/components/features/content/',
  'sw/web/src/components/features/profile/',
  'sw/web/src/i18n/',
  'sw/web/messages/',
  'sw/web/src/lib/celeb/',
  'sw/web/src/actions/celebs/',
  'sw/web/src/actions/contents/',
  'sw/web/src/actions/user/getCelebBySlug',
  // 빌드 산출물 전체가 바뀌는 것들
  'sw/web/next.config.ts',
  'sw/web/package.json',
  'sw/web/tsconfig.json',
  'pnpm-lock.yaml',
  'packages/shared/',
]

function normalize(file) {
  return String(file).trim().split(String.fromCharCode(92)).join('/').replace(/^[.][/]/, '')
}

/** 바뀐 파일 목록으로 전체 퍼지 필요 여부를 정한다. */
export function shouldPurgeCloudflare(changedFiles) {
  return changedFiles.some((raw) => {
    const file = normalize(raw)
    if (!file) return false
    return CACHED_SCREEN_PREFIXES.some((prefix) => (
      prefix.endsWith('/') ? file.startsWith(prefix) : file.startsWith(prefix)
    ))
  })
}
