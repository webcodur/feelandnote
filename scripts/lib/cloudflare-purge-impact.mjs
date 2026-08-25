import { readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const CLOUDFLARE_PURGE_SCOPES = Object.freeze([
  'none',
  'celeb',
  'content',
  'seo',
  'cached-html',
  'emergency-zone',
])

export const CLOUDFLARE_EMERGENCY_CONFIRMATION = 'PURGE-ENTIRE-FEELANDNOTE-ZONE'

const SITE_HOST = 'feelandnote.com'
const SITE_ORIGIN = `https://${SITE_HOST}`

const SCOPE_TARGETS = Object.freeze({
  none: Object.freeze({ prefixes: [], files: [] }),
  celeb: Object.freeze({
    prefixes: [
      `${SITE_HOST}/celeb/`,
      `${SITE_HOST}/en/celeb/`,
    ],
    files: [],
  }),
  content: Object.freeze({
    prefixes: [
      `${SITE_HOST}/content/`,
      `${SITE_HOST}/en/content/`,
    ],
    files: [],
  }),
  seo: Object.freeze({
    prefixes: [
      `${SITE_HOST}/seo-image/`,
      `${SITE_HOST}/sitemaps/`,
    ],
    files: [
      `${SITE_ORIGIN}/sitemap.xml`,
      `${SITE_ORIGIN}/robots.txt`,
      `${SITE_ORIGIN}/feed.xml`,
      `${SITE_ORIGIN}/opengraph-image`,
    ],
  }),
  'cached-html': Object.freeze({
    // Cloudflare ruleset v4가 실제로 보관하는 익명 HTML만 비운다. 빌드 해시가 붙은
    // _next/static과 별도 30일 캐시인 SEO 이미지는 이 범위에 넣지 않는다.
    prefixes: [
      `${SITE_HOST}/celeb/`,
      `${SITE_HOST}/en/celeb/`,
      `${SITE_HOST}/content/`,
      `${SITE_HOST}/en/content/`,
    ],
    files: [
      `${SITE_ORIGIN}/explore/directory`,
      `${SITE_ORIGIN}/en/explore/directory`,
      `${SITE_ORIGIN}/explore/timeline`,
      `${SITE_ORIGIN}/en/explore/timeline`,
    ],
  }),
})

const ROOT_WEB_BUILD_FILES = new Set([
  '.npmrc',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'pnpmfile.cjs',
])

const WEB_CONFIG_FILES = new Set([
  'sw/web/next.config.ts',
  'sw/web/package.json',
  'sw/web/postcss.config.mjs',
  'sw/web/tsconfig.json',
])

const NON_RUNTIME_WEB_ROOT_FILES = new Set([
  'sw/web/.gitignore',
  'sw/web/README.md',
  'sw/web/build_log.txt',
  'sw/web/build_output.txt',
  'sw/web/build_result.txt',
  'sw/web/check_missing_images.js',
  'sw/web/convert-webp.js',
  'sw/web/copy-images.js',
  'sw/web/cUserswebco바탕',
  'sw/web/eslint.config.mjs',
  'sw/web/missing_images_report.txt',
  'sw/web/split_json.mjs',
  'sw/web/temp_spotify_result.json',
  'sw/web/ts_to_json.js',
  'sw/web/vercel.json',
])

const SEO_PREFIXES = [
  'sw/web/src/app/seo-image/',
  'sw/web/src/app/sitemap.xml/',
  'sw/web/src/app/sitemaps/',
]

const SEO_FILES = new Set([
  'sw/web/src/app/feed.xml/route.ts',
  'sw/web/src/app/opengraph-image/route.tsx',
  'sw/web/src/app/opengraph-image.tsx',
  'sw/web/src/app/robots.ts',
  'sw/web/src/lib/seoImageOrigin.ts',
  'sw/web/src/lib/sitemap.ts',
])

const CELEB_PREFIXES = [
  'sw/web/src/app/[locale]/(main)/celeb/',
  // 이 묶음은 사용자 서재에도 쓰이지만 Cloudflare가 보관하는 화면 중에서는
  // 인물 상세의 감상배경에만 영향을 준다.
  'sw/web/src/components/features/user/contentLibrary/',
  // 현재 WorldGlobe의 유일한 런타임 소비자는 인물 상세의 여정 구획이다.
  'sw/web/src/components/shared/WorldGlobe/',
]

const CELEB_FILES = new Set([
  'sw/web/src/actions/celebs/getCelebSideData.ts',
  'sw/web/src/actions/celebs/getCelebSidePresence.ts',
  'sw/web/src/actions/celebs/getContemporaries.ts',
  'sw/web/src/actions/user/getCelebBySlug.ts',
  'sw/web/src/components/features/celeb/CelebAffiliateBooks.tsx',
  'sw/web/src/components/features/celeb/CelebAffiliateBooksLoadGate.ts',
  // Only the celeb archive consumes these presenter-gating changes among the
  // Cloudflare-cached route families. Keep this allow-list exact so any other
  // future ContentCard runtime edit fails closed instead of widening a purge.
  'sw/web/src/components/ui/cards/ContentCard/sections/DefaultLayout.tsx',
  'sw/web/src/components/ui/cards/ContentCard/sections/ReviewLayout.tsx',
  'sw/web/src/components/ui/cards/ContentCard/types.ts',
  'sw/web/src/components/ui/cards/ContentCard/useContentCardState.ts',
])

const CONTENT_PREFIXES = [
  'sw/web/src/app/[locale]/(main)/content/',
  'sw/web/src/components/features/content/',
]

const CONTENT_FILES = new Set([
  'sw/web/src/actions/contents/getContentById.ts',
  'sw/web/src/actions/contents/getContentDetail.ts',
  'sw/web/src/actions/contents/getReviewFeed.ts',
  'sw/web/src/actions/library/curated.ts',
  'sw/web/src/components/features/content/ContentDetailPage.tsx',
])

const CELEB_AND_CONTENT_FILES = new Set([
  // 픽션 원전·등장인물은 인물 상세와 작품 상세 양쪽에서 렌더링한다.
  'sw/web/src/actions/fiction/getFictionSources.ts',
])

const CACHED_HTML_AND_SEO_FILES = new Set([
  // 등급 계약은 상세·명부·연표뿐 아니라 sitemap의 색인 대상도 바꾼다.
  'packages/shared/src/constants/celeb-tiers.ts',
])

const NON_HTML_RUNTIME_FILES = new Set([
  // 배포 diff에 함께 들어오는 캐시 무효화 계약/호출부다. HTML 렌더 결과는 바꾸지 않는다.
  'packages/shared/src/constants/cache-tags.ts',
  // Remotion과 web-bo만 소비하며 public web HTML에는 들어오지 않는 공유 타이밍 계약이다.
  'packages/shared/src/lib/faction-scene-timing.ts',
  'sw/web/src/lib/cloudflarePurge.ts',
  // 아래 경로는 Cloudflare가 보관하지 않는 로그인·홈·서재·성향·실험실 런타임만 바꾼다.
  'sw/web/src/actions/auth/login.ts',
  'sw/web/src/actions/home/getCelebFeed.ts',
  'sw/web/src/actions/library/helpers.ts',
  'sw/web/src/actions/library/today-figure.ts',
  'sw/web/src/actions/spectrum/getSimilarByCelebId.ts',
  'sw/web/src/components/lab/SeaWavesBackground.tsx',
  'sw/web/src/lib/game/voice/voiceUrl.ts',
])

const CACHED_HTML_PREFIXES = [
  'packages/',
  'patches/',
  'sw/web/messages/',
  'sw/web/src/components/layout/',
  'sw/web/src/components/shared/',
  'sw/web/src/constants/',
  'sw/web/src/contexts/',
  'sw/web/src/fonts/',
  'sw/web/src/hooks/',
  'sw/web/src/i18n/',
  'sw/web/src/types/',
]

const CACHED_HTML_FILES = new Set([
  'sw/web/src/app/[locale]/(main)/layout.tsx',
  'sw/web/src/app/[locale]/layout.tsx',
  'sw/web/src/app/globals.css',
  'sw/web/src/app/layout.tsx',
  'sw/web/src/middleware.ts',
])

const CACHED_ROUTE_PREFIXES = [
  'sw/web/src/app/[locale]/(main)/explore/directory/',
  'sw/web/src/app/[locale]/(main)/explore/timeline/',
]

const NON_RUNTIME_PREFIXES = [
  '.agents/',
  '.claude/',
  '.github/',
  'data/',
  'docs/',
  'scripts/',
  'sw/audio-bo/',
  'sw/android/',
  'sw/lab/',
  'sw/remotion/',
  'sw/web-bo/',
  'sw/web/scripts/',
  'sw/web/supabase/',
]

const NON_HTML_RUNTIME_PREFIXES = [
  'sw/web/src/app/api/',
]

function normalizeGitPath(rawFile) {
  if (typeof rawFile !== 'string') {
    throw new TypeError('Changed file paths must be strings.')
  }

  const file = rawFile.trim().replaceAll('\\', '/').replace(/^\.\//u, '')
  if (!file) return ''
  if (file.includes('\0') || file.startsWith('/') || /^[A-Za-z]:\//u.test(file)) {
    throw new Error(`Unsafe Git path: ${JSON.stringify(rawFile)}`)
  }

  const segments = file.split('/')
  if (segments.some((segment) => segment === '..')) {
    throw new Error(`Unsafe Git path: ${JSON.stringify(rawFile)}`)
  }

  return file
}

function matchesPrefix(file, prefixes) {
  return prefixes.some((prefix) => file.startsWith(prefix))
}

function isTestOnlyPath(file) {
  return (
    /(^|\/)(__tests__|fixtures?)(\/|$)/u.test(file)
    || /\.(?:test|spec)\.[^/]+$/u.test(file)
    || file.endsWith('.snap')
  )
}

function classifyFile(file) {
  if (
    !file
    || isTestOnlyPath(file)
    || NON_RUNTIME_WEB_ROOT_FILES.has(file)
    || matchesPrefix(file, NON_RUNTIME_PREFIXES)
  ) {
    return []
  }

  if (NON_HTML_RUNTIME_FILES.has(file) || matchesPrefix(file, NON_HTML_RUNTIME_PREFIXES)) {
    return []
  }

  if (ROOT_WEB_BUILD_FILES.has(file) || WEB_CONFIG_FILES.has(file)) {
    return ['cached-html']
  }

  if (SEO_FILES.has(file) || matchesPrefix(file, SEO_PREFIXES)) {
    return ['seo']
  }

  // 이 둘은 HTML 안의 canonical·이미지 URL과 SEO 응답 양쪽에 영향을 줄 수 있다.
  if (file === 'sw/web/src/lib/seo.ts' || file === 'sw/web/src/lib/seoImage.ts') {
    return ['cached-html', 'seo']
  }

  if (CACHED_HTML_AND_SEO_FILES.has(file)) {
    return ['cached-html', 'seo']
  }

  // 구체적인 전용 컴포넌트를 shared/feature 전역 규칙보다 먼저 판정한다.
  if (CELEB_FILES.has(file) || matchesPrefix(file, CELEB_PREFIXES)) {
    return ['celeb']
  }

  if (CONTENT_FILES.has(file) || matchesPrefix(file, CONTENT_PREFIXES)) {
    return ['content']
  }

  if (CELEB_AND_CONTENT_FILES.has(file)) {
    return ['celeb', 'content']
  }

  if (
    CACHED_HTML_FILES.has(file)
    || matchesPrefix(file, CACHED_ROUTE_PREFIXES)
    || matchesPrefix(file, CACHED_HTML_PREFIXES)
  ) {
    return ['cached-html']
  }

  if (file.startsWith('sw/web/src/')) {
    throw new Error(`Unclassified public-web runtime path: ${file}`)
  }

  if (file.startsWith('sw/web/public/')) {
    throw new Error(`Unclassified public asset path: ${file}`)
  }

  if (file.startsWith('sw/web/')) {
    throw new Error(`Unclassified public-web project path: ${file}`)
  }

  return []
}

function unique(items) {
  return [...new Set(items)]
}

export function createCloudflarePurgePlan(rawScopes) {
  if (!Array.isArray(rawScopes)) {
    throw new TypeError('Purge scopes must be an array.')
  }

  const requestedScopes = unique(rawScopes)
  for (const scope of requestedScopes) {
    if (!CLOUDFLARE_PURGE_SCOPES.includes(scope)) {
      throw new Error(`Unknown Cloudflare purge scope: ${scope}`)
    }
    if (scope === 'emergency-zone') {
      throw new Error('emergency-zone is manual-only and cannot be inferred from changed files.')
    }
  }

  const meaningfulScopes = requestedScopes.filter((scope) => scope !== 'none')
  let scopes = meaningfulScopes.length ? meaningfulScopes : ['none']

  // cached-html은 두 상세 경로군을 이미 포함한다. SEO는 독립으로 남겨 전역 UI 변경이
  // 변경 없는 SEO 응답까지 버리지 않게 한다.
  if (scopes.includes('cached-html')) {
    scopes = scopes.filter((scope) => scope !== 'celeb' && scope !== 'content')
  }

  scopes = CLOUDFLARE_PURGE_SCOPES.filter((scope) => scopes.includes(scope))
  const prefixes = unique(scopes.flatMap((scope) => SCOPE_TARGETS[scope]?.prefixes ?? []))
  const files = unique(scopes.flatMap((scope) => SCOPE_TARGETS[scope]?.files ?? []))

  return {
    scopes,
    prefixes,
    files,
    emergencyZone: false,
  }
}

export function classifyCloudflarePurgeImpact(changedFiles) {
  if (!Array.isArray(changedFiles)) {
    throw new TypeError('Changed files must be an array.')
  }

  const scopes = []
  for (const rawFile of changedFiles) {
    const file = normalizeGitPath(rawFile)
    scopes.push(...classifyFile(file))
  }

  return createCloudflarePurgePlan(scopes)
}

export function createManualCloudflarePurgePlan(scope, confirmation = '') {
  if (!CLOUDFLARE_PURGE_SCOPES.includes(scope)) {
    throw new Error(`Unknown Cloudflare purge scope: ${scope}`)
  }

  if (scope === 'emergency-zone') {
    if (confirmation !== CLOUDFLARE_EMERGENCY_CONFIRMATION) {
      throw new Error(
        `emergency-zone requires the exact confirmation ${CLOUDFLARE_EMERGENCY_CONFIRMATION}`,
      )
    }

    return {
      scopes: ['emergency-zone'],
      prefixes: [],
      files: [],
      emergencyZone: true,
    }
  }

  return createCloudflarePurgePlan([scope])
}

function argumentValue(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

function runCli() {
  const manualScope = argumentValue('--scope')
  const filesPath = argumentValue('--files-z')
  const modes = [manualScope, filesPath].filter(Boolean)

  if (modes.length !== 1) {
    throw new Error('Select exactly one classifier mode.')
  }

  if (manualScope) {
    const plan = createManualCloudflarePurgePlan(
      manualScope,
      argumentValue('--confirmation') ?? '',
    )
    process.stdout.write(`${JSON.stringify(plan)}\n`)
    return
  }

  if (filesPath) {
    const changedFiles = readFileSync(filesPath, 'utf8').split('\0').filter(Boolean)
    const plan = classifyCloudflarePurgeImpact(changedFiles)
    process.stdout.write(`${JSON.stringify(plan)}\n`)
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : ''
if (import.meta.url === invokedPath) {
  try {
    runCli()
  } catch (error) {
    console.error(`[cf-purge-impact] ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
