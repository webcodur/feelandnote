/**
 * Repair path regressions from over-eager /1/ injection.
 * - logoVid/logoImg with /1/ that exist at group root → strip /1/
 * - missing path: try strip/add /1/, or sole mp4 at group root for logoVid
 * - rewrite JSON safely
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const FAC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/factions')
const ACTIVE = new Set(JSON.parse(fs.readFileSync(path.join(FAC, '_episodes.json'), 'utf8')))

function exists(root, rel) {
  return rel && fs.existsSync(path.join(root, rel))
}

function fixSeries(name) {
  const root = path.join(FAC, name)
  const dataPath = path.join(root, 'faction-data.json')
  if (!fs.existsSync(dataPath)) return

  let raw = fs.readFileSync(dataPath, 'utf8')
  // repair accidental literal \n suffix
  const lastBrace = raw.lastIndexOf('}')
  if (lastBrace >= 0) raw = raw.slice(0, lastBrace + 1) + '\n'
  const j = JSON.parse(raw)
  let fixes = 0

  const resolve = (s, kind) => {
    if (!s || typeof s !== 'string' || s.startsWith('http')) return s
    if (exists(root, s)) return s

    // strip /1/
    if (s.includes('/1/')) {
      const alt = s.replace('/1/', '/')
      if (exists(root, alt)) {
        fixes++
        return alt
      }
    }

    // add /1/ for two-segment paths
    const parts = s.split('/')
    if (parts.length === 2) {
      const alt = `${parts[0]}/1/${parts[1]}`
      if (exists(root, alt)) {
        fixes++
        return alt
      }
    }

    // logoVid: find mp4 at group root
    if (kind === 'logoVid' || s.endsWith('.mp4')) {
      const g = parts[0]
      const gdir = path.join(root, g)
      if (fs.existsSync(gdir)) {
        const mp4s = fs.readdirSync(gdir).filter((f) => f.endsWith('.mp4'))
        if (mp4s.length === 1) {
          fixes++
          return `${g}/${mp4s[0]}`
        }
        const pref = mp4s.find((f) => /logo|video|title|grok/i.test(f))
        if (pref) {
          fixes++
          return `${g}/${pref}`
        }
      }
      // also under 1/
      const c1 = path.join(gdir, '1')
      if (fs.existsSync(c1)) {
        const mp4s = fs.readdirSync(c1).filter((f) => f.endsWith('.mp4'))
        if (mp4s.length === 1) {
          fixes++
          return `${g}/1/${mp4s[0]}`
        }
      }
    }

    return s
  }

  for (const g of j.groups || []) {
    // logos never live under /1/ by convention — prefer group root
    if (g.logoImg) {
      const before = g.logoImg
      if (g.logoImg.includes('/1/') && g.logoImg.includes('_logo')) {
        const alt = g.logoImg.replace('/1/', '/')
        if (exists(root, alt)) g.logoImg = alt
      }
      g.logoImg = resolve(g.logoImg, 'logoImg')
      if (g.logoImg !== before) fixes++
    }
    if (g.logoVid) {
      const before = g.logoVid
      if (g.logoVid.includes('/1/')) {
        const alt = g.logoVid.replace('/1/', '/')
        if (exists(root, alt)) g.logoVid = alt
      }
      g.logoVid = resolve(g.logoVid, 'logoVid')
      if (g.logoVid !== before) fixes++
    }
    for (const c of g.clusters || []) {
      if (c.image) {
        const before = c.image
        c.image = resolve(c.image, 'image')
        if (c.image !== before) fixes++
      }
      for (const p of c.people || []) {
        if (p.image) {
          const before = p.image
          p.image = resolve(p.image, 'image')
          if (p.image !== before) fixes++
        }
        if (p.quoteImage) {
          const before = p.quoteImage
          p.quoteImage = resolve(p.quoteImage, 'image')
          if (p.quoteImage !== before) fixes++
        }
      }
    }
  }

  // also fix other string fields that look like asset paths (introImage etc)
  const walk = (o) => {
    if (!o || typeof o !== 'object') return
    if (Array.isArray(o)) return o.forEach(walk)
    for (const k of Object.keys(o)) {
      if (typeof o[k] === 'string' && (o[k].includes('/') && /\.(png|jpg|jpeg|webp|mp4)$/i.test(o[k]))) {
        const before = o[k]
        // don't double-count group fields
        if (['logoImg', 'logoVid', 'image', 'quoteImage'].includes(k)) continue
        o[k] = resolve(o[k], k)
        if (o[k] !== before) fixes++
      } else walk(o[k])
    }
  }
  walk(j)

  fs.writeFileSync(dataPath, JSON.stringify(j, null, 2) + '\n', 'utf8')

  let miss = 0
  let total = 0
  const check = (s) => {
    if (!s || s.startsWith('http')) return
    total++
    if (!exists(root, s)) miss++
  }
  for (const g of j.groups || []) {
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
  console.log(name.padEnd(26), 'fixes', fixes, 'missing', `${miss}/${total}`)
}

const series = fs
  .readdirSync(FAC, { withFileTypes: true })
  .filter((d) => d.isDirectory() && ACTIVE.has(d.name))
  .map((d) => d.name)
  .sort()

for (const s of series) fixSeries(s)
console.log('done')
