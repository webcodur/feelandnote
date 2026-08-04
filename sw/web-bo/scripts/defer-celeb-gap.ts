/**
 * 근거 부재로 채울 수 없는 항목을 보류 장부에 기록한다. 기록된 항목은 선점 대상에서 빠져
 * 큐 앞단을 막지 않는다. **DB는 건드리지 않는다.**
 *
 *   pnpm exec tsx scripts/defer-celeb-gap.ts --slug park-soo-man --gaps basic:birth_date --reason "생년 비공개"
 *   pnpm exec tsx scripts/defer-celeb-gap.ts --list
 *
 * 장부: `.tmp-celeb-fill/deferred.json`
 * 보류는 영구 판정이 아니다. 새 근거가 나오면 해당 항목을 장부에서 지우면 다시 대상이 된다.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const FILE = path.join('.tmp-celeb-fill', 'deferred.json')

type Entry = { slug: string; gaps: string[]; reason: string; at: string }

function argOf(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function load(): Promise<Entry[]> {
  try {
    return JSON.parse(await readFile(FILE, 'utf8')) as Entry[]
  } catch {
    return []
  }
}

async function main() {
  const entries = await load()

  if (process.argv.includes('--list')) {
    console.log(`보류 ${entries.length}건`)
    for (const e of entries) console.log(`  ${e.slug} [${e.gaps.join(',')}] — ${e.reason}`)
    return
  }

  const slug = argOf('slug')
  const gaps = (argOf('gaps') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const reason = argOf('reason')
  if (!slug || gaps.length === 0 || !reason) {
    throw new Error('--slug, --gaps, --reason 이 모두 필요하다')
  }

  const found = entries.find((e) => e.slug === slug)
  if (found) {
    for (const g of gaps) if (!found.gaps.includes(g)) found.gaps.push(g)
    found.reason = reason
    found.at = new Date().toISOString()
  } else {
    entries.push({ slug, gaps, reason, at: new Date().toISOString() })
  }

  await mkdir('.tmp-celeb-fill', { recursive: true })
  await writeFile(FILE, JSON.stringify(entries, null, 2))
  console.log(`보류 기록: ${slug} [${gaps.join(',')}] — ${reason}`)
  console.log(`장부 총 ${entries.length}건`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
