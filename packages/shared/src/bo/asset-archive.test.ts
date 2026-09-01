import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  archiveAssetUnit, archiveDirOf, ensureEpisodeStaged, scanAssetUnits, stageAssetUnit, unstageAssetUnit,
} from './asset-archive'

/**
 * 보관소(D:)와 작업 폴더(public) 사이의 규칙 — 백오피스 「자산 보관소」와 `pnpm assets` 가 같은 함수를 쓴다.
 * 실체는 절대 지우지 않고, 정션만 걸었다 푼다. 옮길 때는 대조 뒤에만 원본을 지운다.
 */

const isWin = process.platform === 'win32'
const win = { skip: !isWin && 'Windows 정션' }

function sandbox() {
  const root = mkdtempSync(path.join(tmpdir(), 'asset-archive-'))
  const seriesDir = path.join(root, 'public', 'factions')
  const archiveRoot = path.join(root, 'archive')
  mkdirSync(seriesDir, { recursive: true })
  mkdirSync(path.join(archiveRoot, 'factions'), { recursive: true })
  const put = (dir: string, files: Record<string, string>) => {
    mkdirSync(dir, { recursive: true })
    for (const [f, body] of Object.entries(files)) writeFileSync(path.join(dir, f), body)
  }
  return { root, seriesDir, archiveRoot, put, cleanup: () => rmSync(root, { recursive: true, force: true }) }
}

test('보관소 자리는 public 시리즈 폴더명을 그대로 따르고 경로 이탈은 버린다', () => {
  assert.equal(
    archiveDirOf('C:\\repo\\sw\\remotion\\public\\factions', 'Homer-Odyssey', 'D:\\remotion-assets'),
    path.join('D:\\remotion-assets', 'factions', 'Homer-Odyssey'),
  )
  assert.equal(archiveDirOf('C:\\x\\public\\episodes', '../../etc', 'D:\\a'), path.join('D:\\a', 'episodes', 'etc'))
})

test('상태표 — 실체 위치와 정션 유무로 다섯 상태를 가른다', win, () => {
  const s = sandbox()
  try {
    s.put(path.join(s.seriesDir, 'fresh'), { 'a.json': '{}' })                 // public-only
    s.put(path.join(s.archiveRoot, 'factions', 'stored'), { 'b.json': '{}' })   // archived
    s.put(path.join(s.archiveRoot, 'factions', 'both'), { 'c.json': '{}' })
    s.put(path.join(s.seriesDir, 'both'), { 'c.json': '{}' })                   // conflict
    s.put(path.join(s.seriesDir, '_docs'), { 'x.md': '' })                      // 단위 아님
    stageAssetUnit(s.seriesDir, 'stored', { archiveRoot: s.archiveRoot })       // staged

    const byName = Object.fromEntries(scanAssetUnits(s.seriesDir, { archiveRoot: s.archiveRoot }).map(u => [u.name, u]))
    assert.deepEqual(Object.keys(byName).sort(), ['both', 'fresh', 'stored'])
    assert.equal(byName.fresh.state, 'public-only')
    assert.equal(byName.stored.state, 'staged')
    assert.equal(byName.both.state, 'conflict')
    assert.equal(byName.stored.files, 1)
  } finally {
    s.cleanup()
  }
})

test('걸기·풀기 — 정션만 오가고 실체는 그대로다', win, () => {
  const s = sandbox()
  try {
    const real = path.join(s.archiveRoot, 'factions', 'argonauts')
    s.put(real, { 'faction-data.json': '{}' })
    const link = path.join(s.seriesDir, 'argonauts')

    stageAssetUnit(s.seriesDir, 'argonauts', { archiveRoot: s.archiveRoot })
    assert.ok(lstatSync(link).isSymbolicLink())
    assert.deepEqual(readdirSync(link), ['faction-data.json'])
    // 두 번 걸어도 조용하다.
    stageAssetUnit(s.seriesDir, 'argonauts', { archiveRoot: s.archiveRoot })

    unstageAssetUnit(s.seriesDir, 'argonauts')
    assert.ok(!existsSync(link))
    assert.ok(existsSync(path.join(real, 'faction-data.json')), '실체는 남는다')
    // 실체 폴더에는 손대지 않는다.
    s.put(path.join(s.seriesDir, 'solid'), { 'x': '' })
    assert.throws(() => unstageAssetUnit(s.seriesDir, 'solid'), /실체/)
  } finally {
    s.cleanup()
  }
})

test('옮기기 — public 실체가 보관소로 가고 정션으로 되걸린다', win, () => {
  const s = sandbox()
  try {
    s.put(path.join(s.seriesDir, 'new-ep'), { 'a.json': '{"a":1}', 'b.png': 'xx' })
    mkdirSync(path.join(s.seriesDir, 'new-ep', 'sub'))
    writeFileSync(path.join(s.seriesDir, 'new-ep', 'sub', 'c.wav'), 'yyy')

    const r = archiveAssetUnit(s.seriesDir, 'new-ep', { archiveRoot: s.archiveRoot })
    assert.deepEqual(r, { files: 3, bytes: 12 })
    const link = path.join(s.seriesDir, 'new-ep')
    assert.ok(lstatSync(link).isSymbolicLink())
    assert.ok(existsSync(path.join(s.archiveRoot, 'factions', 'new-ep', 'sub', 'c.wav')))
    assert.equal(scanAssetUnits(s.seriesDir, { archiveRoot: s.archiveRoot })[0].state, 'staged')
    // 보관소에 같은 이름이 있으면 옮기지 않는다.
    s.put(path.join(s.seriesDir, 'dup'), { 'x': '' })
    s.put(path.join(s.archiveRoot, 'factions', 'dup'), { 'y': '' })
    assert.throws(() => archiveAssetUnit(s.seriesDir, 'dup', { archiveRoot: s.archiveRoot }), /같은 이름/)
  } finally {
    s.cleanup()
  }
})

test('편집기가 열 때 — 보관소에만 있으면 걸고, 있으면 두고, 어디에도 없으면 만들지 않는다', win, () => {
  const s = sandbox()
  try {
    s.put(path.join(s.archiveRoot, 'factions', 'stored'), { 'faction-data.json': '{}' })
    assert.equal(ensureEpisodeStaged(s.seriesDir, 'stored', s.archiveRoot), 'staged')
    assert.equal(ensureEpisodeStaged(s.seriesDir, 'stored', s.archiveRoot), 'present')

    s.put(path.join(s.seriesDir, 'fresh'), { 'x': '' })
    assert.equal(ensureEpisodeStaged(s.seriesDir, 'fresh', s.archiveRoot), 'present')
    assert.ok(!lstatSync(path.join(s.seriesDir, 'fresh')).isSymbolicLink())

    assert.equal(ensureEpisodeStaged(s.seriesDir, 'nowhere', s.archiveRoot), 'absent')
    assert.ok(!existsSync(path.join(s.seriesDir, 'nowhere')))
  } finally {
    s.cleanup()
  }
})
