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

test('profile image components evict cached HTML without purging generated SEO images', () => {
  for (const file of [
    'sw/web/src/components/ui/CelebAvatarImage.tsx',
    'sw/web/src/components/ui/ResponsivePortraitImage.tsx',
  ]) {
    const plan = classifyCloudflarePurgeImpact([file])
    assert.deepEqual(plan.scopes, ['cached-html'])
    assert.equal(plan.emergencyZone, false)
    assert.equal(JSON.stringify(plan).includes('seo-image'), false)
  }
})

test('exploration menu objects and profession diagrams purge their asset paths only', () => {
  const plan = classifyCloudflarePurgeImpact([
    'sw/web/public/images/explore/quicknav/classics-sculpture-v1-square.webp',
    'sw/web/public/images/library/professions/athlete-stopwatch.svg',
  ])
  assert.deepEqual(plan.scopes, ['explore-art'])
  assert.deepEqual(plan.prefixes, [
    'feelandnote.com/images/explore/quicknav/',
    'feelandnote.com/images/library/professions/',
  ])
  assert.deepEqual(plan.files, [])
  assert.throws(() => classifyCloudflarePurgeImpact(['sw/web/public/images/unreviewed.webp']), /Unclassified public asset/)
})

test('profession helpers follow shelf consumers while standalone hubs and local history bypass HTML caches', () => {
  assert.deepEqual(classifyCloudflarePurgeImpact(['sw/web/src/lib/books/professionShelf.ts']).scopes, ['celeb'])
  assert.deepEqual(classifyCloudflarePurgeImpact([
    'sw/web/src/lib/books/professionBookGuides.ts',
    'sw/web/src/actions/home/getFeaturedFactions.ts',
  ]).scopes, ['celeb'])
  assert.deepEqual(classifyCloudflarePurgeImpact([
    'sw/web/src/components/features/celeb/modals/CelebDetailModal/CelebDetailModal.module.css',
    'sw/web/src/components/features/celeb/modals/CelebFactionsModal.tsx',
  ]).scopes, ['cached-html'])
  assert.deepEqual(classifyCloudflarePurgeImpact([
    'sw/web/src/actions/books/getProfessionBookCatalog.ts',
    'sw/web/src/app/[locale]/(main)/explore/works/professions/page.tsx',
    'sw/web/src/components/features/commerce/CommerceProductCard.tsx',
    'sw/web/src/lib/commerce-products.ts',
    'sw/web/src/lib/faction-theme.ts',
    'sw/web/src/lib/faction-scene-completion.ts',
    'sw/web/src/components/features/faction/entry/ThemeBookShelf.tsx',
    'sw/web/src/components/features/profile/RecentProfileTracker.tsx',
    'sw/web/src/lib/recent-history.ts',
    'sw/web/src/app/[locale]/(main)/agora/board/feedback/[id]/page.tsx',
  ]).scopes, ['none'])
})

test('progressive loading and shared detail modals follow their actual cached consumers', () => {
  assert.deepEqual(classifyCloudflarePurgeImpact([
    'sw/web/src/actions/celebs/getCelebReferenceBooks.ts',
    'sw/web/src/actions/home/factionBookHydrate.ts',
  ]).scopes, ['celeb'])
  assert.deepEqual(classifyCloudflarePurgeImpact([
    'sw/web/src/actions/figure-books/figureBookEditions.ts',
    'sw/web/src/components/ui/ContentTextModal.tsx',
    'sw/web/src/components/ui/SourceLinksModal.tsx',
  ]).scopes, ['celeb', 'content'])
  assert.deepEqual(classifyCloudflarePurgeImpact([
    'sw/web/src/components/features/celeb/modals/CelebDetailModal/CelebDetailModal.tsx',
    'sw/web/src/components/ui/pending/PendingBlock.tsx',
  ]).scopes, ['cached-html'])
  assert.deepEqual(classifyCloudflarePurgeImpact([
    'sw/web/src/app/[locale]/(reader)/celeb/[slug]/records/RecordsList.tsx',
    'sw/web/src/components/features/faction/entry/FactionPersonReviews.tsx',
    'sw/web/src/components/features/commerce/prototype/CollectionJourneyLab.tsx',
  ]).scopes, ['none'])
})

test('related-book controls evict celeb HTML while the app manifest needs no HTML purge', () => {
  for (const file of [
    'sw/web/src/components/features/celeb/CelebBookShelf.tsx',
    'sw/web/src/components/features/celeb/BookShelfAffiliationAddon.tsx',
  ]) {
    assert.deepEqual(classifyCloudflarePurgeImpact([file]).scopes, ['celeb'])
  }
  assert.deepEqual(classifyCloudflarePurgeImpact(['sw/web/src/app/manifest.ts']).scopes, ['none'])
})

test('works and rest landing pages need no purge while shared layout still evicts cached HTML', () => {
  const pages = [
    'sw/web/src/app/[locale]/(main)/explore/works/page.tsx',
    'sw/web/src/app/[locale]/(main)/rest/page.tsx',
  ]
  for (const file of pages) {
    assert.deepEqual(classifyCloudflarePurgeImpact([file]).scopes, ['none'])
  }
  const plan = classifyCloudflarePurgeImpact([...pages, 'sw/web/src/app/globals.css'])
  assert.deepEqual(plan.scopes, ['cached-html'])
  assert.equal(plan.emergencyZone, false)
  assert.equal(JSON.stringify(plan).includes('seo-image'), false)
  assert.equal(JSON.stringify(plan).includes('_next/static'), false)
})

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
    'docs/project/platform/platform-05-external-services.md',
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

test('web package remains global while unknown feature and action paths require investigation', () => {
  assert.deepEqual(
    classifyCloudflarePurgeImpact(['sw/web/package.json']).scopes,
    ['cached-html'],
  )

  for (const file of [
    'sw/web/src/actions/home/getCelebInfluence.ts',
    'sw/web/src/components/features/home/HomeHero.tsx',
  ]) assert.throws(() => classifyCloudflarePurgeImpact([file]), /Unclassified web runtime path/)
})

test('known celeb-detail dependencies stay narrowly scoped and never widen on their own', () => {
  const plan = classifyCloudflarePurgeImpact([
    'sw/web/src/actions/user/getCelebBySlug.ts',
  ])

  assert.deepEqual(plan.scopes, ['celeb'])
  // 규칙에 있는 경로만 왔으므로 미분류 목록 자체가 생기지 않는다.
  assert.equal('unclassifiedPaths' in plan, false)
})

test('generic celeb internals require an explicit consumer-based rule', () => {
  for (const file of [
    'sw/web/src/actions/celebs/getCelebDirectory.ts',
    'sw/web/src/components/features/celeb/modals/LightCelebModal.tsx',
    'sw/web/src/lib/celeb/world.ts',
  ]) {
    assert.throws(() => classifyCloudflarePurgeImpact([file]), /Unclassified web runtime path/)
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
    'sw/web/src/app/[locale]/(main)/explore/works/curated/page.tsx',
    'sw/web/src/app/[locale]/(main)/explore/works/popular/page.tsx',
    'sw/web/src/app/[locale]/(main)/explore/works/sections.tsx',
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

test('unclassified public runtime paths cannot silently purge cached HTML', () => {
  for (const file of ['sw/web/src/new-runtime-root.ts', 'sw/web/instrumentation.ts']) {
    assert.throws(() => classifyCloudflarePurgeImpact([file]), /Unclassified web runtime path/)
  }

  // 자동 분류는 존 전체 비우기로 올라갈 수 없다.
  assert.throws(
    () => createCloudflarePurgePlan(['emergency-zone']),
    /manual-only/,
  )
})

test('home-only changes preserve cached detail HTML and shared data cache implementation does not change HTML', () => {
  const plan = classifyCloudflarePurgeImpact([
    'sw/web/src/components/features/home/HomeFeaturedReview.tsx',
    'sw/web/src/components/features/home/HomeFeaturedReviewSample.tsx',
    'sw/web/src/components/features/home/HomeFreeBoardSection.tsx',
    'sw/web/src/components/ui/cards/ContentCard/sections/StackedReviewLayout.tsx',
    'sw/web/scripts/shared-data-cache.cjs',
  ])
  assert.deepEqual(plan.scopes, ['none'])
  assert.deepEqual(plan.prefixes, [])
  assert.deepEqual(plan.files, [])
  assert.deepEqual(classifyCloudflarePurgeImpact([
    'sw/web/src/components/ui/media-objects/InteractiveMediaCover.tsx',
    'sw/web/src/components/ui/media-objects/mediaGeometry.ts',
  ]).scopes, ['celeb'])
  assert.deepEqual(classifyCloudflarePurgeImpact([
    'sw/web/src/components/features/commerce/PurchaseOpener.tsx',
    'sw/web/src/components/ui/formatted-text/InlineFormattedText.tsx',
    'sw/web/src/components/ui/formatted-text/emphasis.ts',
  ]).scopes, ['celeb', 'content'])
})

test('media hover and film rendering preserve unrelated cached HTML and assets', () => {
  for (const file of [
    'InteractiveMediaCover.tsx',
    'mediaGeometry.ts',
    'FilmStrip.tsx',
    'filmGeometry.ts',
    'mediaMotion.ts',
    'MediaCover.css',
    'media-objects.css',
  ]) {
    const plan = classifyCloudflarePurgeImpact([
      'sw/web/src/components/ui/media-objects/' + file,
      'sw/web/src/components/features/home/HomeFeaturedReview.tsx',
    ])
    assert.deepEqual(plan.scopes, ['celeb'])
    assert.deepEqual(plan.prefixes, ['feelandnote.com/celeb/', 'feelandnote.com/en/celeb/'])
    assert.deepEqual(plan.files, [])
    assert.equal(plan.emergencyZone, false)
  }
})

test('initial content briefs evict the celeb HTML that embeds them', () => {
  assert.deepEqual(classifyCloudflarePurgeImpact([
    'sw/web/src/actions/contents/getContentBrief.ts',
  ]).scopes, ['celeb'])
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
  ).replaceAll('\r\n', '\n')

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


test('content banner replacements purge their own asset prefix without SEO or unrelated assets', () => {
  const plan = classifyCloudflarePurgeImpact(['sw/web/public/images/content/banners/ancient-archive-mb.webp']);
  assert.deepEqual(plan.scopes, ['content-banners']);
  assert.deepEqual(plan.prefixes, ['feelandnote.com/images/content/banners/']);
  assert.deepEqual(plan.files, []);
  const mixed = classifyCloudflarePurgeImpact(['sw/web/src/components/shared/HubSection.tsx', 'sw/web/public/images/content/banners/library-pc.webp']);
  assert.deepEqual(mixed.scopes, ['content-banners', 'cached-html']);
  assert.ok(!mixed.prefixes.some(prefix => prefix.includes('seo-image')));
  assert.throws(() => classifyCloudflarePurgeImpact(['sw/web/public/images/content/banners/unknown.webp']), /Unclassified public asset/);
});

test('daily review logic and home translations need no cached HTML purge', () => {
  assert.deepEqual(classifyCloudflarePurgeImpact(['sw/web/src/lib/reviews/featuredReview.ts', 'sw/web/src/actions/home/getCelebs.ts', 'sw/web/messages/ko/home.json', 'sw/web/messages/en/explore.json']).scopes, ['none']);
  assert.deepEqual(classifyCloudflarePurgeImpact(['sw/web/src/components/features/game/shared/ContentReviewModal.tsx', 'sw/web/src/components/shared/BookIntroductionPanel.tsx']).scopes, ['celeb','content']);
});

test('world banner URLs and material changes evict celeb HTML on deployment', () => {
  for (const file of [
    'sw/web/src/lib/celeb/worldImages.ts',
    'sw/web/src/lib/celeb/worldMaterial.ts',
    'sw/web/src/components/features/celeb/CelebWorldMaterialScope.tsx',
    'sw/web/src/components/features/celeb/CelebWorldMaterialScope.module.css',
  ]) {
    const plan = classifyCloudflarePurgeImpact([file]);
    assert.deepEqual(plan.scopes, ['celeb'], file);
    assert.deepEqual(plan.prefixes, ['feelandnote.com/celeb/', 'feelandnote.com/en/celeb/'], file);
    assert.deepEqual(plan.files, [], file);
  }
});

test('R2 genre banners and shared detail UI evict only their consuming detail HTML', () => {
  const localSource = 'sw/web/public/images/content/banners/acoustic-mb.webp';
  assert.deepEqual(classifyCloudflarePurgeImpact([localSource]).scopes, ['none']);
  assert.deepEqual(classifyCloudflarePurgeImpact([
    'sw/web/src/lib/contentBanner.ts',
    'sw/web/src/lib/contentBannerAssets.ts',
  ]).scopes, ['content']);
  assert.deepEqual(classifyCloudflarePurgeImpact([
    'sw/web/src/components/shared/BookShelf/BookShelfReviewDetail.tsx',
  ]).scopes, ['celeb']);
  assert.deepEqual(classifyCloudflarePurgeImpact([
    localSource,
    'sw/web/src/lib/contentBannerAssets.ts',
    'sw/web/src/components/shared/DetailBanner.tsx',
    'sw/web/src/components/shared/DetailBanner.module.css',
    'sw/web/src/lib/reviews/featuredReviewAvailability.ts',
  ]).scopes, ['celeb', 'content']);
  assert.throws(() => classifyCloudflarePurgeImpact([
    'sw/web/public/images/content/banners/unverified-mb.webp',
  ]), /Unclassified public asset/);
});
