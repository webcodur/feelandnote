/**
 * Align ALL active factions (outside not-using) to folder-rules canonical names.
 * - group_shot.png / group.png → _group.png
 * - logo.png / logo.mp4 → _logo.png / _logo.mp4
 * - inject cluster 1/ when person/group assets sit flat at group root (PayPal-style)
 * - move root leftover docs into _docs/
 * - ensure _status.json
 * - update faction-data.json paths
 *
 * node sw/remotion/scripts/align-all-active-factions.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const FAC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/factions')
const SKIP = new Set(['not-using', '_docs', '_voice-casting'])

function exists(p) {
  return fs.existsSync(p)
}
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}
function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}
function saveJson(p, j) {
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n', 'utf8')
}

function renameIfExists(from, to) {
  if (!exists(from)) return false
  if (exists(to)) {
    if (path.resolve(from) === path.resolve(to)) return false
    // destination exists — leave source if different
    return false
  }
  ensureDir(path.dirname(to))
  fs.renameSync(from, to)
  return true
}

function walkFiles(dir, acc = [], rel = '') {
  if (!exists(dir)) return acc
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['voice', 'node_modules', '.git'].includes(ent.name)) continue
    const r = rel ? `${rel}/${ent.name}` : ent.name
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walkFiles(p, acc, r)
    else acc.push({ abs: p, rel: r, name: ent.name, dir: path.dirname(p) })
  }
  return acc
}

function replaceInObject(obj, fn) {
  let n = 0
  const walk = (o) => {
    if (o == null) return
    if (typeof o === 'string') return
    if (Array.isArray(o)) {
      for (let i = 0; i < o.length; i++) {
        if (typeof o[i] === 'string') {
          const next = fn(o[i])
          if (next !== o[i]) {
            o[i] = next
            n++
          }
        } else walk(o[i])
      }
      return
    }
    if (typeof o === 'object') {
      for (const k of Object.keys(o)) {
        if (typeof o[k] === 'string') {
          const next = fn(o[k])
          if (next !== o[k]) {
            o[k] = next
            n++
          }
        } else walk(o[k])
      }
    }
  }
  walk(obj)
  return n
}

function replaceInTextFiles(root, pairs) {
  for (const f of walkFiles(root)) {
    if (!/\.(md|txt)$/i.test(f.name)) continue
    if (f.rel.includes('/voice/')) continue
    let t = fs.readFileSync(f.abs, 'utf8')
    const orig = t
    for (const [a, b] of pairs) t = t.split(a).join(b)
    if (t !== orig) fs.writeFileSync(f.abs, t, 'utf8')
  }
}

/** group_shot / group.png / logo → canonical */
function renameAssetFiles(root) {
  let n = 0
  for (const f of walkFiles(root)) {
    if (f.rel.startsWith('_archive/') || f.rel.includes('/_archive/')) continue
    if (f.rel.startsWith('_staging/') || f.rel.includes('/_staging/')) continue
    if (f.name === 'group_shot.png') {
      if (renameIfExists(f.abs, path.join(f.dir, '_group.png'))) n++
    } else if (f.name === 'group_shot.jpg') {
      if (renameIfExists(f.abs, path.join(f.dir, '_group.jpg'))) n++
    } else if (/^group_shot-step(\d+)\.png$/i.test(f.name)) {
      const m = f.name.match(/^group_shot-(step\d+\.png)$/i)
      if (renameIfExists(f.abs, path.join(f.dir, `_group-${m[1]}`))) n++
    } else if (f.name === 'group.png') {
      if (renameIfExists(f.abs, path.join(f.dir, '_group.png'))) n++
    } else if (f.name === 'logo.png') {
      if (renameIfExists(f.abs, path.join(f.dir, '_logo.png'))) n++
    } else if (f.name === 'logo.mp4') {
      if (renameIfExists(f.abs, path.join(f.dir, '_logo.mp4'))) n++
    }
  }
  return n
}

function fixDataPaths(data) {
  return replaceInObject(data, (s) =>
    s
      .replaceAll('group_shot-step', '_group-step')
      .replaceAll('group_shot.png', '_group.png')
      .replaceAll('group_shot.jpg', '_group.jpg')
      .replaceAll('/group.png', '/_group.png')
      .replaceAll('/logo.png', '/_logo.png')
      .replaceAll('/logo.mp4', '/_logo.mp4'),
  )
}

/**
 * If group dir has flat images + _group but no 1/ with assets, move into 1/
 * Keep _logo*, _prompt.md, _archive at group root.
 */
function injectClusterOne(root) {
  let moved = 0
  const groupDirs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{2}/.test(d.name))
    .map((d) => d.name)

  for (const g of groupDirs) {
    const gdir = path.join(root, g)
    const c1 = path.join(gdir, '1')
    // if 1/ already has _group or person images, skip structural move
    const hasDeep =
      exists(c1) &&
      fs.readdirSync(c1).some((n) => n === '_group.png' || n === 'group.png' || n === 'group_shot.png' || /\.(png|jpg|webp)$/i.test(n))
    if (hasDeep) continue

    const flatAssets = fs.readdirSync(gdir, { withFileTypes: true }).filter((ent) => {
      if (ent.isDirectory()) return false
      if (ent.name === '_logo.png' || ent.name === '_logo.mp4' || ent.name === '_prompt.md') return false
      if (ent.name.startsWith('00-')) return false
      return ent.name === '_group.png' || ent.name === '_group.jpg' || /\.(png|jpg|jpeg|webp)$/i.test(ent.name)
    })
    if (!flatAssets.length) continue

    ensureDir(c1)
    for (const ent of flatAssets) {
      if (renameIfExists(path.join(gdir, ent.name), path.join(c1, ent.name))) moved++
    }
  }
  return moved
}

/** After inject 1/, update data paths that still point to group-root assets */
function injectClusterOneInData(data) {
  return replaceInObject(data, (s) => {
    if (!s || s.startsWith('http')) return s
    if (/^\d{2}[^/]*\/1\//.test(s)) return s
    if (/^\d{2}[^/]*\/_logo\./.test(s)) return s
    // 01-foo/bar.png → 01-foo/1/bar.png when looking like asset
    const m = s.match(/^(\d{2}[a-z]?-[^/]+)\/([^/]+)$/i)
    if (!m) return s
    if (m[2].startsWith('_logo')) return s
    if (!/\.(png|jpg|jpeg|webp|mp4)$/i.test(m[2]) && m[2] !== '_group.png') return s
    // only if not already conceptual path
    return `${m[1]}/1/${m[2]}`
  })
}

const ROOT_DOC_KEEP = new Set([
  'README.md',
  'faction-data.json',
  'faction-cards.json',
  '_status.json',
])

function moveRootDocs(root) {
  let n = 0
  ensureDir(path.join(root, '_docs'))
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    if (!ent.isFile()) continue
    const name = ent.name
    if (ROOT_DOC_KEEP.has(name)) continue
    if (/^00-/.test(name)) continue // 발주서 keep at root or move? keep at root per rules
    if (/^comment\.p\d+\.txt$/.test(name)) continue
    if (/^data\.timing\./.test(name)) continue
    if (/^faction-data/.test(name)) continue
    // quote stubs + plans + junk
    if (/\.(md|txt)$/i.test(name)) {
      const dest = path.join(root, '_docs', name.startsWith('_') ? name.slice(1) : name)
      if (!exists(dest)) {
        fs.renameSync(path.join(root, name), dest)
        n++
      }
    }
  }
  return n
}

function ensureStatus(root) {
  const p = path.join(root, '_status.json')
  if (exists(p)) return false
  // heuristic
  let status = 'wip'
  if (exists(path.join(root, 'voice'))) status = 'ready'
  fs.writeFileSync(p, JSON.stringify({ status }, null, 2) + '\n', 'utf8')
  return true
}

function alignSeries(name) {
  const root = path.join(FAC, name)
  const dataPath = path.join(root, 'faction-data.json')
  if (!exists(dataPath)) {
    console.log(name, 'SKIP no data')
    return
  }
  console.log('\n##', name)
  const ren = renameAssetFiles(root)
  const moved = injectClusterOne(root)
  const data = loadJson(dataPath)
  let n = fixDataPaths(data)
  // if we moved flat→1/, update paths (PayPal already done; others may need)
  // Only apply injectClusterOneInData if we actually moved files this run OR paths look flat
  const needs1 = (() => {
    for (const g of data.groups || []) {
      for (const c of g.clusters || []) {
        if (c.image && /^\d{2}[^/]*\/_group\.png$/.test(c.image)) return true
        for (const p of c.people || []) {
          if (p.image && /^\d{2}[^/]*\/[^/]+\.(png|jpg|webp)$/i.test(p.image) && !p.image.includes('/1/'))
            return true
        }
      }
    }
    return false
  })()
  if (moved > 0 || needs1) {
    // verify 1/ exists for first group before rewriting
    const sample = data.groups?.[0]
    const folder = (sample?.logoImg || sample?.clusters?.[0]?.image || '').split('/')[0]
    if (folder && exists(path.join(root, folder, '1'))) {
      n += injectClusterOneInData(data)
    }
  }
  saveJson(dataPath, data)
  replaceInTextFiles(root, [
    ['group_shot-step', '_group-step'],
    ['group_shot.png', '_group.png'],
    ['group_shot.jpg', '_group.jpg'],
    ['/group.png', '/_group.png'],
    ['/logo.png', '/_logo.png'],
    ['/logo.mp4', '/_logo.mp4'],
  ])
  const docs = moveRootDocs(root)
  const st = ensureStatus(root)
  console.log(`  renames~${ren} moved1/${moved} dataFixes ${n} docs→_docs ${docs} status+${st ? 1 : 0}`)

  // verify
  let miss = 0
  const bad = []
  const check = (s) => {
    if (!s || s.startsWith('http')) return
    if (!exists(path.join(root, s))) {
      miss++
      if (bad.length < 5) bad.push(s)
    }
  }
  for (const g of data.groups || []) {
    check(g.logoImg)
    check(g.logoVid)
    for (const c of g.clusters || []) {
      check(c.image)
      for (const p of c.people || []) {
        check(p.image)
        check(p.quoteImage)
      }
    }
  }
  console.log('  verify missing', miss, bad.join(' | '))
}

const series = fs
  .readdirSync(FAC, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !SKIP.has(d.name) && !d.name.startsWith('.'))
  .map((d) => d.name)
  .sort()

for (const s of series) alignSeries(s)
console.log('\ndone')
