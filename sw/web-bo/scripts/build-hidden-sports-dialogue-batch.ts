/** sports-faction-copy.ts에서 공식 조건부 대사 배치 JSON을 만든다. */

import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import { SPORTS_FACTION_COPY } from './sports-faction-copy'

const output = path.resolve(
  process.cwd(),
  '..',
  'remotion',
  'public',
  'factions',
  '_staging',
  'sports-faction-dialogue-batch.json',
)

const targets = SPORTS_FACTION_COPY.flatMap(episode =>
  episode.groups.flatMap(group =>
    group.people.map(person => ({
      folder: episode.folder,
      identity: { name: person.name, slug: person.slug, groupName: group.name },
      expected: {
        quote: null,
        quoteEn: null,
        quoteChunks: null,
        quoteEnChunks: null,
        quoteOrigin: null,
        minedQuotes: null,
      },
      next: {
        quote: person.quote,
        quoteEn: null,
        quoteChunks: person.quoteChunks,
        quoteEnChunks: null,
        quoteOrigin: person.quoteOrigin,
        minedQuotes: null,
      },
    })),
  ),
)

async function main(): Promise<void> {
  await writeFile(output, `${JSON.stringify({
    batch: '2026-08-03-hidden-sports-faction-dialogue',
    targets,
  }, null, 2)}\n`, 'utf8')

  console.log(`${output} · ${targets.length}명`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
