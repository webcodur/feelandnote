import assert from 'node:assert/strict'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  assertCommitHash,
  assertReleaseId,
  assertUnixAccountName,
  chooseInactiveSlot,
  deploymentTargetForPath,
  legacyReleasesRootRemoveArgs,
  inspectVersionedDeploymentHtml,
  inspectExploreWarmupHtml,
  mergeRetainedStaticAssets,
  normalizeManifestPath,
  parseJpegDimensions,
  resolveDeploymentTarget,
  restoreStandaloneLinks,
  slotNameForPath,
  slotsRootInstallArgs,
  STATIC_ASSET_RETENTION_MS,
} from './oracle-web-remote.mjs'

test('release id accepts deploy names and rejects path traversal', () => {
  assert.equal(assertReleaseId('bdd7d8ed-web-20260825t091917z'), 'bdd7d8ed-web-20260825t091917z')
  assert.throws(() => assertReleaseId('../current'), /Unsafe release id/u)
  assert.throws(() => assertReleaseId('WEB release'), /Unsafe release id/u)
})

test('commit metadata accepts only a full lowercase Git hash', () => {
  const commit = '0e2e154e47bb6c7535dd14d22a4676b508f3f39f'
  assert.equal(assertCommitHash(commit), commit)
  assert.throws(() => assertCommitHash('0e2e154e'), /Unsafe commit hash/u)
  assert.throws(() => assertCommitHash('../HEAD'), /Unsafe commit hash/u)
})

test('slot bootstrap grants only the fixed directory to a validated deployment account', () => {
  assert.equal(assertUnixAccountName('ubuntu'), 'ubuntu')
  assert.deepEqual(
    slotsRootInstallArgs('ubuntu', 'ubuntu'),
    [
      'install',
      '-d',
      '-o',
      'ubuntu',
      '-g',
      'ubuntu',
      '-m',
      '0750',
      '--',
      '/opt/feelandnote/web/slots',
    ],
  )
  assert.throws(() => slotsRootInstallArgs('ubuntu;id', 'ubuntu'), /Unsafe Unix user/u)
  assert.throws(() => slotsRootInstallArgs('ubuntu', '../root'), /Unsafe Unix group/u)
})

test('legacy cleanup removes only the empty fixed releases root with rmdir', () => {
  assert.deepEqual(
    legacyReleasesRootRemoveArgs(),
    ['rmdir', '--', '/opt/feelandnote/web/releases'],
  )
})

test('Blue/Green deployment always selects the inactive fixed slot', () => {
  const root = path.join(tmpdir(), 'feelandnote-slots')
  const legacyRoot = path.join(tmpdir(), 'feelandnote-releases')
  const blue = path.join(root, 'blue')
  const green = path.join(root, 'green')
  const legacy = path.join(legacyRoot, '0e2e154e-web-20260826t171456z')

  assert.equal(slotNameForPath(blue, root), 'blue')
  assert.equal(slotNameForPath(green, root), 'green')
  assert.equal(slotNameForPath(legacy, root), null)
  assert.equal(chooseInactiveSlot(blue, root), 'green')
  assert.equal(chooseInactiveSlot(green, root), 'blue')
  assert.equal(chooseInactiveSlot(legacy, root), 'blue')
  assert.equal(deploymentTargetForPath(blue, root, legacyRoot), 'blue')
  assert.equal(
    deploymentTargetForPath(legacy, root, legacyRoot),
    '0e2e154e-web-20260826t171456z',
  )
  assert.equal(resolveDeploymentTarget('green', root, legacyRoot), green)
  assert.equal(resolveDeploymentTarget('0e2e154e-web-20260826t171456z', root, legacyRoot), legacy)
  assert.throws(
    () => deploymentTargetForPath(path.join(tmpdir(), 'outside'), root, legacyRoot),
    /outside slots and legacy releases/u,
  )
})

test('standalone link paths stay relative to the extracted release', () => {
  assert.equal(
    normalizeManifestPath('sw\\web\\node_modules\\sharp'),
    'sw/web/node_modules/sharp',
  )
  assert.throws(() => normalizeManifestPath('../../etc/passwd'), /Unsafe manifest path/u)
  assert.throws(() => normalizeManifestPath('/opt/feelandnote/web/current'), /Unsafe manifest path/u)
  assert.throws(() => normalizeManifestPath('C:\\project\\node_modules'), /Unsafe manifest path/u)
})

test('standalone link manifest replaces the dereferenced copy with a relative link', {
  skip: process.platform === 'win32' ? 'Oracle release links are created on Linux' : false,
}, () => {
  const releaseRoot = mkdtempSync(path.join(tmpdir(), 'oracle-web-links-'))
  const targetPath = path.join(releaseRoot, 'node_modules', '.pnpm', 'pkg', 'node_modules', 'pkg')
  const linkPath = path.join(releaseRoot, 'sw', 'web', 'node_modules', 'pkg')

  try {
    mkdirSync(targetPath, { recursive: true })
    mkdirSync(linkPath, { recursive: true })
    writeFileSync(path.join(targetPath, 'marker.txt'), 'traced package')
    writeFileSync(path.join(linkPath, 'marker.txt'), 'dereferenced copy')

    const restored = restoreStandaloneLinks(releaseRoot, {
      version: 1,
      links: [{
        link: 'sw/web/node_modules/pkg',
        target: 'node_modules/.pnpm/pkg/node_modules/pkg',
      }],
    })

    assert.equal(restored, 1)
    assert.equal(lstatSync(linkPath).isSymbolicLink(), true)
    assert.equal(realpathSync(linkPath), realpathSync(targetPath))
    assert.equal(readFileSync(path.join(linkPath, 'marker.txt'), 'utf8'), 'traced package')
  } finally {
    rmSync(releaseRoot, { recursive: true, force: true })
  }
})

test('JPEG probe reads the dimensions from a start-of-frame segment', () => {
  const jpeg = Buffer.from([
    0xff, 0xd8,
    0xff, 0xc0,
    0x00, 0x11,
    0x08,
    0x03, 0x20,
    0x03, 0x20,
    0x03,
    0x01, 0x11, 0x00,
    0x02, 0x11, 0x00,
    0x03, 0x11, 0x00,
    0xff, 0xd9,
  ])
  assert.deepEqual(parseJpegDimensions(jpeg), { width: 800, height: 800 })
  assert.throws(() => parseJpegDimensions(Buffer.from('not-jpeg')), /not a JPEG/u)
})

test('a prepared release retains still-live static assets from the active release', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'oracle-web-static-retention-'))
  const previousStatic = path.join(root, 'previous')
  const candidateStatic = path.join(root, 'candidate')
  const nowMs = Date.UTC(2026, 7, 27, 12)
  const retentionMs = STATIC_ASSET_RETENTION_MS

  try {
    mkdirSync(path.join(previousStatic, 'chunks'), { recursive: true })
    mkdirSync(path.join(candidateStatic, 'chunks'), { recursive: true })
    writeFileSync(path.join(previousStatic, 'chunks', 'previous-only.js'), 'previous')
    writeFileSync(path.join(previousStatic, 'chunks', 'shared.js'), 'stale shared')
    writeFileSync(path.join(previousStatic, 'chunks', 'expired.js'), 'expired')
    writeFileSync(path.join(candidateStatic, 'chunks', 'shared.js'), 'candidate shared')
    writeFileSync(path.join(candidateStatic, 'chunks', 'candidate-only.js'), 'candidate')

    const retainedAt = new Date(nowMs - 2 * 24 * 60 * 60 * 1_000)
    const expiredAt = new Date(nowMs - retentionMs - 1_000)
    utimesSync(path.join(previousStatic, 'chunks', 'previous-only.js'), retainedAt, retainedAt)
    utimesSync(path.join(previousStatic, 'chunks', 'shared.js'), retainedAt, retainedAt)
    utimesSync(path.join(previousStatic, 'chunks', 'expired.js'), expiredAt, expiredAt)

    const result = mergeRetainedStaticAssets(previousStatic, candidateStatic, {
      nowMs,
      retentionMs,
    })

    assert.equal(readFileSync(path.join(candidateStatic, 'chunks', 'previous-only.js'), 'utf8'), 'previous')
    assert.equal(readFileSync(path.join(candidateStatic, 'chunks', 'shared.js'), 'utf8'), 'candidate shared')
    assert.equal(readFileSync(path.join(candidateStatic, 'chunks', 'candidate-only.js'), 'utf8'), 'candidate')
    assert.equal(existsSync(path.join(candidateStatic, 'chunks', 'expired.js')), false)
    assert.deepEqual(result, { copied: 1, alreadyPresent: 1, expired: 1 })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('deployment HTML static assets must all identify the expected build', () => {
  const deploymentId = 'a351550f-web-20260827t111605z'
  const html = `<!doctype html>
    <html data-dpl-id="${deploymentId}">
      <head>
        <link rel="stylesheet" href="/_next/static/css/app.css?dpl=${deploymentId}">
        <script src="/_next/static/chunks/app.js?dpl=${deploymentId}"></script>
      </head>
    </html>`

  assert.deepEqual(
    inspectVersionedDeploymentHtml(html, 'http://127.0.0.1:3100/celeb/bill-gates', deploymentId),
    {
      deploymentId,
      staticAssetUrls: [
        `http://127.0.0.1:3100/_next/static/css/app.css?dpl=${deploymentId}`,
        `http://127.0.0.1:3100/_next/static/chunks/app.js?dpl=${deploymentId}`,
      ],
    },
  )

  assert.throws(
    () => inspectVersionedDeploymentHtml(
      '<html><script src="/_next/static/chunks/app.js"></script></html>',
      'http://127.0.0.1:3100/celeb/bill-gates',
      deploymentId,
    ),
    /deployment id/u,
  )

  assert.equal(
    inspectVersionedDeploymentHtml(
      `<html><script src="/_next/static/chunks/app.js?dpl=${deploymentId}"></script></html>`,
      'http://127.0.0.1:3100/celeb/bill-gates',
      deploymentId,
    ).deploymentId,
    deploymentId,
  )
})

test('explore warmup requires the deployed build and rendered profile cards', () => {
  const deploymentId = 'a351550f-web-20260827t111605z'
  const pageUrl = 'http://127.0.0.1:3100/explore'
  const html = `<!doctype html>
    <html data-dpl-id="${deploymentId}">
      <script src="/_next/static/chunks/app.js?dpl=${deploymentId}"></script>
      <a href="/explore/ranking">프로필</a>
      <button aria-label="누적 조회 534회">빌 게이츠</button>
    </html>`

  assert.deepEqual(
    inspectExploreWarmupHtml(html, pageUrl, deploymentId),
    { deploymentId },
  )
  assert.throws(
    () => inspectExploreWarmupHtml(
      html.replace('누적 조회 534회', '프로필 준비 중'),
      pageUrl,
      deploymentId,
    ),
    /rendered profile cards/u,
  )
})
