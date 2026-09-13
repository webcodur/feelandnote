/** Generate an article from current movie records, including short and single-film records. */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { ASSETS } from '../blog-assets.mjs'
import { loadSelectionData, selectCandidates } from './lib/selection.mts'
import { backupArticle, buildPersonMaterial, MovieCache, personContext, savedPeople } from './lib/person-material.mts'

export { buildPersonMaterial, MovieCache, personContext }

async function main() {
  const args = process.argv.slice(2)
  const argOf = (key: string) => args.includes(key) ? args[args.indexOf(key) + 1] : undefined
  const slug = argOf('--slug')
  if (!slug) throw new Error('--slug is required')
  const directory = path.join(ASSETS, 'tistory-cinema')
  const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)
  const data = await loadSelectionData(db)
  const job = selectCandidates(data).jobs.find((r) => r.kind === 'person' && r.arg[1] === slug)
  if (!job?.id) throw new Error(`No person movie records with existing slug: ${slug}`)
  fs.mkdirSync(directory, { recursive: true })
  const name = savedPeople(directory, data).get(job.id) ?? job.name
  const file = path.join(directory, `${name}.json`)
  if (fs.existsSync(file)) {
    const old = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (!old.celeb || old.celeb.slug !== slug || (old.celeb.id && old.celeb.id !== job.id)) throw new Error(`Filename belongs to another person: ${name}`)
    if (!args.includes('--force')) throw new Error(`Existing material preserved: ${name}; use --force to rebuild`)
  }
  const material = await buildPersonMaterial(personContext(data, new MovieCache(directory)), job.id, Number(argOf('--pick') ?? 6))
  backupArticle(directory, name)
  fs.writeFileSync(file, JSON.stringify(material, null, 2))
  console.log(`${material.celeb.name}: 영화 ${material.total}편 중 ${material.picked.length}편`)
  console.log('고른 작품:', material.picked.map((r) => r.title).join(' · '))
  console.log('저장:', file)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main()
