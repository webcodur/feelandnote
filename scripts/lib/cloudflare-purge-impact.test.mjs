import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  classifyCloudflarePurgeImpact,
  CLOUDFLARE_EMERGENCY_CONFIRMATION,
  createCloudflarePurgePlan,
  createManualCloudflarePurgePlan,
} from './cloudflare-purge-impact.mjs'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

test('current celeb-detail UI release evicts only the celeb detail family', () => {
  const plan = classifyCloudflarePurgeImpact([
    'sw/web/src/app/[locale]/(main)/celeb/[slug]/page.tsx',
    'sw/web/src/app/[locale]/(main)/celeb/[slug]/CelebPageContent.tsx',
    'sw/web/src/app/[locale]/(main)/celeb/[slug]/JourneySection.tsx',
    'sw/web/src/app/[locale]/(main)/celeb/[slug]/SpectrumSection.tsx',
    'sw/web/src/app/[locale]/(main)/celeb/[slug]/TimelineIndexTick.tsx',
    'sw/web/src/app/[locale]/(main)/celeb/[slug]/VirtueStatList.tsx',
    'sw/web/src/app/[locale]/(main)/celeb/[slug]/detail/CelebRecordSections.tsx',
    'sw/web/src/app/[locale]/(main)/celeb/[slug]/LibraryTabs.tsx',
    'sw/web/src/components/features/user/contentLibrary/ContentLibrary.tsx',
    'sw/web/src/components/features/user/contentLibrary/ContentLibraryBody.tsx',
    'sw/web/src/components/features/user/contentLibrary/contentLibraryDataState.ts',
    'sw/web/src/components/features/user/contentLibrary/contentLibraryTypes.ts',
    'sw/web/src/components/features/user/contentLibrary/types.ts',
    'sw/web/src/components/features/user/contentLibrary/useContentLibrary.ts',
    'sw/web/src/components/features/user/contentLibrary/useContentLibraryData.ts',
    'sw/web/src/components/features/user/contentLibrary/useDesktopLayout.ts',
    'sw/web/src/components/features/user/contentLibrary/controlBar/ArchiveActionRow.tsx',
    'sw/web/src/components/features/user/contentLibrary/controlBar/ArchiveControlBar.tsx',
    'sw/web/src/components/features/user/contentLibrary/controlBar/types.ts',
    'sw/web/src/components/features/user/contentLibrary/item/ContentItemRenderer.tsx',
    'sw/web/src/components/features/user/contentLibrary/expand/ContentMetaDetails.tsx',
    'sw/web/src/components/features/user/contentLibrary/expand/ContentMetaPanel.tsx',
    'sw/web/src/components/features/user/contentLibrary/expand/ExpandCard.tsx',
    'sw/web/src/components/features/user/contentLibrary/expand/ExpandDetailView.module.css',
    'sw/web/src/components/features/user/contentLibrary/expand/ExpandDetailView.tsx',
    'sw/web/src/components/features/user/contentLibrary/expand/ExpandIndexRail.tsx',
    'sw/web/src/components/features/user/contentLibrary/expand/buildExpandPresentation.ts',
    'sw/web/src/components/features/user/contentLibrary/expand/groupExpandIndexItems.ts',
    'sw/web/src/components/features/user/contentLibrary/expand/syncExpandIndexCurrent.ts',
    'sw/web/src/components/features/user/contentLibrary/expand/unit/ExpandIndexGroup.tsx',
    'sw/web/src/components/features/user/contentLibrary/expand/useContentBrief.ts',
    'sw/web/src/components/features/user/contentLibrary/expand/useExpandIndexSelection.ts',
    'sw/web/src/components/ui/cards/ContentCard/sections/DefaultLayout.tsx',
    'sw/web/src/components/ui/cards/ContentCard/sections/ReviewLayout.tsx',
    'sw/web/src/components/ui/cards/ContentCard/types.ts',
    'sw/web/src/components/ui/cards/ContentCard/useContentCardState.ts',
    'sw/web/src/app/[locale]/(main)/celeb/[slug]/JourneyMapPanel.tsx',
    'sw/web/src/components/shared/WorldGlobe/WorldGlobe.tsx',
    'sw/web/src/components/shared/WorldGlobe/globeLayout.ts',
    'sw/web/src/components/shared/WorldGlobe/globeSpin.ts',
    'sw/web/src/actions/celebs/getCelebSidePresence.ts',
    'sw/web/src/actions/celebs/getContemporaries.ts',
    'sw/web/src/components/features/celeb/CelebAffiliateBooks.tsx',
    'sw/web/src/components/features/celeb/CelebAffiliateBooksLoadGate.ts',
  ])

  assert.deepEqual(plan.scopes, ['celeb'])
  assert.deepEqual(plan.prefixes, [
    'feelandnote.com/celeb/',
    'feelandnote.com/en/celeb/',
  ])
  assert.deepEqual(plan.files, [])
  assert.equal(plan.emergencyZone, false)
  assert.equal(JSON.stringify(plan).includes('seo-image'), false)
  assert.equal(JSON.stringify(plan).includes('sitemap'), false)
})

test('the four presenter-gating ContentCard files affect only cached celeb detail', () => {
  const files = [
    'sw/web/src/components/ui/cards/ContentCard/sections/DefaultLayout.tsx',
    'sw/web/src/components/ui/cards/ContentCard/sections/ReviewLayout.tsx',
    'sw/web/src/components/ui/cards/ContentCard/types.ts',
    'sw/web/src/components/ui/cards/ContentCard/useContentCardState.ts',
  ]

  for (const file of files) {
    assert.deepEqual(classifyCloudflarePurgeImpact([file]).scopes, ['celeb'])
  }
})

test('docs, workflow, scripts, and test fixtures require no Cloudflare purge', () => {
  const plan = classifyCloudflarePurgeImpact([
    'docs/project/platform/external-services.md',
    '.github/workflows/cloudflare-purge.yml',
    'scripts/lib/cloudflare-purge-impact.mjs',
    'scripts/lib/cloudflare-purge-impact.test.mjs',
    'sw/web/scripts/check-content-expand-scroll.mjs',
    'sw/web/README.md',
    'sw/web/.gitignore',
    'sw/web/eslint.config.mjs',
    'sw/web/build_output.txt',
    'sw/web/check_missing_images.js',
    'sw/web/src/components/shared/WorldGlobe/globeLayout.test.ts',
    'sw/web/src/components/features/user/contentLibrary/expand/documentScroll.test.ts',
  ])

  assert.deepEqual(plan, {
    scopes: ['none'],
    prefixes: [],
    files: [],
    emergencyZone: false,
  })
})

test('content-detail runtime changes evict only Korean and English content families', () => {
  const plan = classifyCloudflarePurgeImpact([
    'sw/web/src/app/[locale]/(main)/content/[contentId]/page.tsx',
    'sw/web/src/actions/contents/getContentById.ts',
    'sw/web/src/actions/contents/getReviewFeed.ts',
    'sw/web/src/actions/library/curated.ts',
    'sw/web/src/components/features/content/ContentDetailPage.tsx',
    'sw/web/src/components/features/content/ContentInfoSection.tsx',
    'sw/web/src/components/features/content/AllReviewsSection.tsx',
  ])

  assert.deepEqual(plan.scopes, ['content'])
  assert.deepEqual(plan.prefixes, [
    'feelandnote.com/content/',
    'feelandnote.com/en/content/',
  ])
  assert.deepEqual(plan.files, [])
})

test('global runtime changes evict all cached HTML but not static chunks or SEO', () => {
  const plan = classifyCloudflarePurgeImpact([
    'sw/web/src/app/[locale]/(main)/layout.tsx',
    'sw/web/src/app/[locale]/layout.tsx',
    'sw/web/src/components/layout/header/Header.tsx',
    'sw/web/src/components/shared/SomeSharedRuntime.tsx',
    'sw/web/messages/ko.json',
  ])

  assert.deepEqual(plan.scopes, ['cached-html'])
  assert.deepEqual(plan.prefixes, [
    'feelandnote.com/celeb/',
    'feelandnote.com/en/celeb/',
    'feelandnote.com/content/',
    'feelandnote.com/en/content/',
  ])
  assert.deepEqual(plan.files, [
    'https://feelandnote.com/explore/directory',
    'https://feelandnote.com/en/explore/directory',
    'https://feelandnote.com/explore/timeline',
    'https://feelandnote.com/en/explore/timeline',
  ])
  assert.equal(JSON.stringify(plan).includes('_next/static'), false)
  assert.equal(JSON.stringify(plan).includes('seo-image'), false)
  assert.equal(JSON.stringify(plan).includes('sitemap'), false)
})

test('web package remains global while unknown feature and action paths widen to cached HTML', () => {
  assert.deepEqual(
    classifyCloudflarePurgeImpact(['sw/web/package.json']).scopes,
    ['cached-html'],
  )

  const plan = classifyCloudflarePurgeImpact([
    'sw/web/src/actions/home/getCelebInfluence.ts',
    'sw/web/src/components/features/home/HomeHero.tsx',
  ])

  assert.deepEqual(plan.scopes, ['cached-html'])
  assert.deepEqual(plan.unclassifiedPaths, [
    'sw/web/src/actions/home/getCelebInfluence.ts',
    'sw/web/src/components/features/home/HomeHero.tsx',
  ])
})

test('known celeb-detail dependencies stay narrowly scoped and never widen on their own', () => {
  const plan = classifyCloudflarePurgeImpact([
    'sw/web/src/actions/user/getCelebBySlug.ts',
  ])

  assert.deepEqual(plan.scopes, ['celeb'])
  // 규칙에 있는 경로만 왔으므로 미분류 목록 자체가 생기지 않는다.
  assert.equal('unclassifiedPaths' in plan, false)
})

test('generic celeb internals widen to cached HTML and are reported as unclassified', () => {
  for (const file of [
    'sw/web/src/actions/celebs/getCelebDirectory.ts',
    'sw/web/src/components/features/celeb/modals/LightCelebModal.tsx',
    'sw/web/src/lib/celeb/world.ts',
  ]) {
    const plan = classifyCloudflarePurgeImpact([file])
    assert.deepEqual(plan.scopes, ['cached-html'])
    assert.deepEqual(plan.unclassifiedPaths, [file])
  }
})

test('fiction sources evict both detail families without evicting directory or timeline', () => {
  const plan = classifyCloudflarePurgeImpact([
    'sw/web/src/actions/figure-books/getFigureBooks.ts',
  ])

  assert.deepEqual(plan.scopes, ['celeb', 'content'])
  assert.deepEqual(plan.prefixes, [
    'feelandnote.com/celeb/',
    'feelandnote.com/en/celeb/',
    'feelandnote.com/content/',
    'feelandnote.com/en/content/',
  ])
  assert.deepEqual(plan.files, [])
})

test('public asset changes fail closed because HTML purging cannot refresh the asset itself', () => {
  assert.throws(
    () => classifyCloudflarePurgeImpact(['sw/web/public/logo.svg']),
    /Unclassified public asset path/,
  )
})

test('cache-tag aggregate contract and revalidation API changes do not evict HTML', () => {
  const plan = classifyCloudflarePurgeImpact([
    'packages/shared/src/constants/cache-tags.ts',
    'packages/shared/src/constants/cache-tags.test.ts',
    'packages/shared/src/lib/faction-scene-timing.ts',
    'packages/shared/src/lib/faction-scene-timing.test.ts',
    'sw/web/src/app/api/revalidate/handler.ts',
    'sw/web/src/app/api/revalidate/route.test.ts',
    'sw/web/src/lib/cloudflarePurge.ts',
    'sw/web/src/lib/cloudflarePurge.test.ts',
  ])

  assert.deepEqual(plan.scopes, ['none'])
})

test('uncached login, home, library, spectrum, lab, and game runtime require no purge', () => {
  const plan = classifyCloudflarePurgeImpact([
    'sw/web/src/actions/auth/login.ts',
    'sw/web/src/actions/home/getCelebFeed.ts',
    'sw/web/src/actions/library/helpers.ts',
    'sw/web/src/actions/library/today-figure.ts',
    'sw/web/src/actions/spectrum/getSimilarByCelebId.ts',
    'sw/web/src/components/lab/SeaWavesBackground.tsx',
    'sw/web/src/lib/game/voice/voiceUrl.ts',
  ])

  assert.deepEqual(plan.scopes, ['none'])
})

test('root Open Graph route and SEO image origin changes evict only SEO outputs', () => {
  const plan = classifyCloudflarePurgeImpact([
    'sw/web/src/app/opengraph-image/route.tsx',
    'sw/web/src/lib/seoImageOrigin.ts',
  ])

  assert.deepEqual(plan.scopes, ['seo'])
  assert.equal(plan.files.includes('https://feelandnote.com/opengraph-image'), true)
})

test('shared celeb-tier changes evict cached HTML and the dependent SEO outputs', () => {
  const plan = classifyCloudflarePurgeImpact([
    'packages/shared/src/constants/celeb-tiers.ts',
  ])

  assert.deepEqual(plan.scopes, ['seo', 'cached-html'])
  assert.equal(plan.prefixes.includes('feelandnote.com/seo-image/'), true)
  assert.equal(plan.prefixes.includes('feelandnote.com/celeb/'), true)
  assert.equal(plan.files.includes('https://feelandnote.com/sitemap.xml'), true)
})

test('cached-html subsumes detail scopes while changed SEO remains independent', () => {
  const plan = createCloudflarePurgePlan(['celeb', 'content', 'cached-html', 'seo'])

  assert.deepEqual(plan.scopes, ['seo', 'cached-html'])
  assert.equal(plan.prefixes.includes('feelandnote.com/seo-image/'), true)
  assert.equal(plan.prefixes.includes('feelandnote.com/celeb/'), true)
})

test('unclassified public runtime paths widen to cached HTML without escalating to a zone purge', () => {
  for (const file of ['sw/web/src/new-runtime-root.ts', 'sw/web/instrumentation.ts']) {
    const plan = classifyCloudflarePurgeImpact([file])
    assert.deepEqual(plan.scopes, ['cached-html'])
    assert.deepEqual(plan.unclassifiedPaths, [file])
    assert.equal(plan.emergencyZone, false)
    assert.equal(JSON.stringify(plan).includes('emergency-zone'), false)
  }

  // 자동 분류는 존 전체 비우기로 올라갈 수 없다.
  assert.throws(
    () => createCloudflarePurgePlan(['emergency-zone']),
    /manual-only/,
  )
})

test('emergency zone purge is manual-only and requires an exact typed confirmation', () => {
  assert.throws(
    () => createManualCloudflarePurgePlan('emergency-zone', 'yes'),
    /requires the exact confirmation/,
  )

  assert.deepEqual(
    createManualCloudflarePurgePlan(
      'emergency-zone',
      CLOUDFLARE_EMERGENCY_CONFIRMATION,
    ),
    {
      scopes: ['emergency-zone'],
      prefixes: [],
      files: [],
      emergencyZone: true,
    },
  )
})

test('workflow is manual-only and keeps purge targets constrained', () => {
  const workflow = readFileSync(
    path.join(repositoryRoot, '.github/workflows/cloudflare-purge.yml'),
    'utf8',
  )

  assert.match(workflow, /^  workflow_dispatch:/mu)
  assert.doesNotMatch(workflow, /deployment_status/u)
  assert.match(workflow, /MANUAL_SCOPE: \$\{\{ inputs\.scope \}\}/u)
  assert.match(workflow, /--scope "\$MANUAL_SCOPE"/u)
  assert.match(workflow, /fetch-depth: 0/u)
  assert.match(workflow, /sparse-checkout: scripts\/lib\/cloudflare-purge-impact\.mjs/u)
  assert.match(workflow, /sparse-checkout-cone-mode: false/u)
  assert.doesNotMatch(workflow, /^concurrency:/mu)
  assert.match(
    workflow,
    /jobs:\n  purge:[\s\S]*?\n    concurrency:\n      group: \$\{\{ format\('cloudflare-purge-manual-\{0\}', github\.run_id\) \}\}\n      cancel-in-progress: false/u,
  )
  assert.match(workflow, /cancel-in-progress: false/)
  assert.match(workflow, /--connect-timeout 10 --max-time 30/)
  assert.match(workflow, /def allowed_scope:/u)
  assert.match(workflow, /def allowed_prefix:/u)
  assert.match(workflow, /def allowed_file:/u)
  assert.match(workflow, /if \.scopes == \["none"\] then/u)
  assert.match(workflow, /elif \.scopes == \["emergency-zone"\] then/u)
  assert.match(workflow, /jq -e '\.success == true'/)
  assert.equal(workflow.match(/purge_everything/gu)?.length, 1)
  assert.match(
    workflow,
    /if jq -e '\.emergencyZone == true'[\s\S]*\{"purge_everything":true\}/u,
  )
})
