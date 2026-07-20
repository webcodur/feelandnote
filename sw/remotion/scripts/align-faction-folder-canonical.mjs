/**
 * Align reference faction series file names + faction-data paths to folder-rules §8/§12.
 * Safe: only rename/move when source exists; update JSON paths; update common md strings.
 *
 * node sw/remotion/scripts/align-faction-folder-canonical.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const FAC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/factions')

function exists(p) {
  return fs.existsSync(p)
}
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}
function renameIfExists(from, to) {
  if (!exists(from)) return false
  if (exists(to)) {
    // already canonical
    if (path.resolve(from) !== path.resolve(to)) {
      // keep both only if different files — prefer remove source if same size? skip overwrite
      console.log('  skip exists', path.relative(FAC, to))
      return false
    }
    return false
  }
  ensureDir(path.dirname(to))
  fs.renameSync(from, to)
  console.log('  ren', path.relative(FAC, from), '→', path.relative(FAC, to))
  return true
}
function moveIfExists(from, to) {
  return renameIfExists(from, to)
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}
function saveJson(p, j) {
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n', 'utf8')
}

function replaceInData(data, replacer) {
  let n = 0
  const walk = (obj) => {
    if (typeof obj === 'string') return
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (typeof obj[i] === 'string') {
          const next = replacer(obj[i])
          if (next !== obj[i]) {
            obj[i] = next
            n++
          }
        } else walk(obj[i])
      }
      return
    }
    if (obj && typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        if (typeof obj[k] === 'string') {
          const next = replacer(obj[k])
          if (next !== obj[k]) {
            obj[k] = next
            n++
          }
        } else walk(obj[k])
      }
    }
  }
  walk(data)
  return n
}

function replaceInMdFiles(root, pairs) {
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === 'voice' || ent.name === 'node_modules' || ent.name === '_archive') continue
      const p = path.join(dir, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (/\.(md|txt|json)$/i.test(ent.name) && ent.name !== 'faction-data.json') {
        let t = fs.readFileSync(p, 'utf8')
        let orig = t
        for (const [a, b] of pairs) t = t.split(a).join(b)
        if (t !== orig) {
          fs.writeFileSync(p, t, 'utf8')
          console.log('  md', path.relative(FAC, p))
        }
      }
    }
  }
  walk(root)
}

// ─── Homer: group_shot.png → _group.png ─────────────────
function alignHomer(series) {
  console.log('\n##', series)
  const root = path.join(FAC, series)
  const dataPath = path.join(root, 'faction-data.json')
  if (!exists(dataPath)) return

  // find all group_shot.png
  const find = (dir, acc = []) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name)
      if (ent.isDirectory()) find(p, acc)
      else if (ent.name === 'group_shot.png' || ent.name === 'group_shot.jpg') acc.push(p)
      else if (/^group_shot-step\d+\.png$/i.test(ent.name)) acc.push(p)
    }
    return acc
  }
  for (const f of find(root)) {
    const base = path.basename(f)
    const dir = path.dirname(f)
    if (base.startsWith('group_shot-step')) {
      const m = base.match(/group_shot-(step\d+\.png)/i)
      renameIfExists(f, path.join(dir, `_group-${m[1]}`))
    } else {
      renameIfExists(f, path.join(dir, base.endsWith('.jpg') ? '_group.jpg' : '_group.png'))
    }
  }

  const data = loadJson(dataPath)
  const n = replaceInData(data, (s) =>
    s
      .replace(/group_shot-step(\d+)\.png/g, '_group-step$1.png')
      .replace(/group_shot\.png/g, '_group.png')
      .replace(/group_shot\.jpg/g, '_group.jpg'),
  )
  saveJson(dataPath, data)
  console.log('  data path updates', n)
  replaceInMdFiles(root, [
    ['group_shot-step', '_group-step'],
    ['group_shot.png', '_group.png'],
    ['group_shot.jpg', '_group.jpg'],
    ['group_shot', '_group'],
  ])
}

// ─── PayPal: inject cluster folder 1/ ────────────────────
function alignPayPal() {
  console.log('\n## PayPal-Mafia')
  const root = path.join(FAC, 'PayPal-Mafia')
  const dataPath = path.join(root, 'faction-data.json')
  const data = loadJson(dataPath)

  const groupDirs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{2}-/.test(d.name))
    .map((d) => d.name)

  for (const g of groupDirs) {
    const gdir = path.join(root, g)
    const c1 = path.join(gdir, '1')
    if (exists(c1) && fs.readdirSync(c1).length > 0) {
      console.log('  already has 1/', g)
      continue
    }
    ensureDir(c1)
    for (const ent of fs.readdirSync(gdir, { withFileTypes: true })) {
      if (ent.name === '1') continue
      // keep logo + prompt + archive at group root
      if (ent.name === '_logo.png' || ent.name === '_logo.mp4' || ent.name === '_prompt.md') continue
      if (ent.name === '_archive' || ent.name === '_refs') continue
      if (ent.isDirectory()) {
        // move non-special dirs? keep
        continue
      }
      // move images and group shot into 1/
      if (
        ent.name === '_group.png' ||
        ent.name === '_group.jpg' ||
        /\.(png|jpg|jpeg|webp)$/i.test(ent.name)
      ) {
        moveIfExists(path.join(gdir, ent.name), path.join(c1, ent.name))
      }
    }
  }

  // update paths: 01-the-dons/foo → 01-the-dons/1/foo except _logo
  const n = replaceInData(data, (s) => {
    if (!s || s.startsWith('http')) return s
    // already has /1/
    if (/^\d{2}-[^/]+\/1\//.test(s)) return s
    // logo stays at group root
    if (/^\d{2}-[^/]+\/_logo\./.test(s)) return s
    // 01-xxx/file → 01-xxx/1/file
    const m = s.match(/^(\d{2}-[^/]+)\/(.+)$/)
    if (m && !m[2].startsWith('_logo')) {
      return `${m[1]}/1/${m[2]}`
    }
    return s
  })
  saveJson(dataPath, data)
  console.log('  data path updates', n)
}

// ─── Digital-Resistance: group.png → _group, logos → _logo ─
function alignDR() {
  console.log('\n## Digital-Resistance')
  const root = path.join(FAC, 'Digital-Resistance')
  const dataPath = path.join(root, 'faction-data.json')
  const data = loadJson(dataPath)

  // 02-free-software/group.png → _group.png
  renameIfExists(path.join(root, '02-free-software/group.png'), path.join(root, '02-free-software/_group.png'))

  // map known logo/group arbitrary names via data first
  const renames = [] // [fromRel, toRel]
  for (const g of data.groups) {
    const gSlug = (g.logoImg || g.clusters?.[0]?.image || '').split('/')[0]
    // group image
    for (const c of g.clusters || []) {
      if (!c.image) continue
      const base = path.basename(c.image)
      if (base === '_group.png' || base === '_group.jpg') continue
      if (/group/i.test(base) || base === 'group.png') {
        const from = path.join(root, c.image)
        const dir = path.dirname(from)
        const to = path.join(dir, '_group.png')
        if (renameIfExists(from, to)) renames.push([c.image, path.relative(root, to).replace(/\\/g, '/')])
        else if (exists(from) && !exists(to)) {
          // copy then? rename failed
        } else if (!exists(from) && exists(path.join(dir, '_group.png'))) {
          renames.push([c.image, path.relative(root, path.join(dir, '_group.png')).replace(/\\/g, '/')])
        }
      }
    }
    if (g.logoImg) {
      const base = path.basename(g.logoImg)
      if (base === '_logo.png' || base === '_logo.mp4') continue
      if (/logo/i.test(base) || base.endsWith('.png')) {
        const from = path.join(root, g.logoImg)
        const dir = path.dirname(from)
        const to = path.join(dir, '_logo.png')
        if (renameIfExists(from, to)) renames.push([g.logoImg, path.relative(root, to).replace(/\\/g, '/')])
        else if (exists(path.join(dir, '_logo.png'))) {
          renames.push([g.logoImg, path.relative(root, path.join(dir, '_logo.png')).replace(/\\/g, '/')])
        }
      }
    }
  }

  // explicit known messy paths
  const extra = [
    ['02-free-software/group.png', '02-free-software/_group.png'],
    ['05-durov/durov_logo_1783357576828.png', '05-durov/_logo.png'],
    ['05-durov/group_still_no_red_1783420447653.png', '05-durov/_group.png'],
    ['04-privacy-frontline/_logo-ghost.png', '04-privacy-frontline/_logo.png'],
    ['01a-declarers/upscaled_lock_1783384469138.png', '01a-declarers/_logo.png'],
  ]
  for (const [a, b] of extra) {
    const from = path.join(root, a)
    const to = path.join(root, b)
    if (renameIfExists(from, to)) renames.push([a, b])
    else if (exists(to)) renames.push([a, b])
  }

  const map = Object.fromEntries(renames)
  const n = replaceInData(data, (s) => {
    if (map[s]) return map[s]
    return s
      .replace(/\/group\.png$/g, '/_group.png')
      .replace(/group_shot\.png/g, '_group.png')
  })
  // second pass for known
  for (const [a, b] of extra) {
    replaceInData(data, (s) => (s === a ? b : s))
  }
  // force logo/group fields after renames
  for (const g of data.groups) {
    if (g.logoImg && !g.logoImg.endsWith('_logo.png') && !g.logoImg.endsWith('_logo.mp4')) {
      const dir = path.dirname(g.logoImg)
      const cand = `${dir}/_logo.png`.replace(/^\.\//, '')
      if (exists(path.join(root, cand))) g.logoImg = cand
    }
    for (const c of g.clusters || []) {
      if (c.image && !/\/_group\.(png|jpg)$/.test(c.image)) {
        const dir = path.dirname(c.image)
        const cand = `${dir}/_group.png`
        if (exists(path.join(root, cand))) c.image = cand
      }
    }
  }
  saveJson(dataPath, data)
  console.log('  data path updates', n, 'renames', renames.length)
}

// ─── AI-Supremacy: group.png → _group, logo.png → _logo ─
function alignAI() {
  console.log('\n## AI-Supremacy')
  const root = path.join(FAC, 'AI-Supremacy')
  const dataPath = path.join(root, 'faction-data.json')
  const data = loadJson(dataPath)

  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === 'voice' || ent.name === '_archive' || ent.name === '_staging' || ent.name === 'node_modules')
        continue
      const p = path.join(dir, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (ent.name === 'group.png') renameIfExists(p, path.join(dir, '_group.png'))
      else if (ent.name === 'logo.png') renameIfExists(p, path.join(dir, '_logo.png'))
      else if (ent.name === 'logo.mp4') renameIfExists(p, path.join(dir, '_logo.mp4'))
    }
  }
  walk(root)

  const n = replaceInData(data, (s) =>
    s
      .replace(/\/group\.png/g, '/_group.png')
      .replace(/\/logo\.png/g, '/_logo.png')
      .replace(/\/logo\.mp4/g, '/_logo.mp4'),
  )
  saveJson(dataPath, data)
  console.log('  data path updates', n)
  replaceInMdFiles(root, [
    ['/group.png', '/_group.png'],
    ['/logo.png', '/_logo.png'],
    ['/logo.mp4', '/_logo.mp4'],
    ['group.png', '_group.png'],
    ['logo.png', '_logo.png'],
  ])
}

// run
alignHomer('Homer-Iliad')
alignHomer('Homer-Odyssey')
alignPayPal()
alignDR()
alignAI()

// verify missing paths
console.log('\n## verify')
for (const name of ['PayPal-Mafia', 'Homer-Iliad', 'Homer-Odyssey', 'Digital-Resistance', 'AI-Supremacy']) {
  const root = path.join(FAC, name)
  const data = loadJson(path.join(root, 'faction-data.json'))
  let miss = 0
  const bad = []
  const check = (s) => {
    if (!s || s.startsWith('http')) return
    if (!exists(path.join(root, s))) {
      miss++
      if (bad.length < 8) bad.push(s)
    }
  }
  for (const g of data.groups) {
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
  console.log(name, 'missing refs', miss, bad.join(' | '))
}
console.log('done')
