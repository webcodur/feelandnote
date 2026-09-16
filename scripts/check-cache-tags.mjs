// 캐시 태그 도메인의 원천과 DB 사본이 같은지 검사한다.
//
// 원천: packages/shared/src/constants/cache-tags.ts 의 CACHE_TAGS
// 사본: web_revalidate_allowed_domains() 를 정의한 가장 최신 마이그레이션
//
// DB 트리거는 사본에 없는 도메인의 태그를 조용히 버린다. 원천만 바꾸고 사본을 잊으면
// 경고 로그 말고는 아무 증상 없이 캐시가 비워지지 않는다(26.09.04~16 figure-books).
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = resolve(repoRoot, 'packages/shared/src/constants/cache-tags.ts')
const migrationsDir = process.env.CACHE_TAGS_MIGRATIONS_DIR
  ?? resolve(repoRoot, 'sw/web/database/migrations')

const source = readFileSync(sourcePath, 'utf8')
const block = source.match(/export const CACHE_TAGS = \{([\s\S]*?)\} as const/)
if (!block) fail('cache-tags.ts 에서 CACHE_TAGS 블록을 찾지 못했다.')
const expected = [...block[1].matchAll(/^\s*[A-Z_]+:\s*'([^']+)'/gm)].map((m) => m[1])
if (expected.length === 0) fail('CACHE_TAGS 에서 도메인을 하나도 읽지 못했다.')

const copyFile = readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort()
  .filter((name) => readFileSync(resolve(migrationsDir, name), 'utf8')
    .includes('function public.web_revalidate_allowed_domains()'))
  .at(-1)
if (!copyFile) fail('web_revalidate_allowed_domains() 를 정의한 마이그레이션이 없다.')

const copySql = readFileSync(resolve(migrationsDir, copyFile), 'utf8')
const copyArray = copySql.match(/select array\[([^\]]*)\]::text\[\]/)
if (!copyArray) fail(`${copyFile} 에서 도메인 배열을 읽지 못했다.`)
const actual = [...copyArray[1].matchAll(/'([^']+)'/g)].map((m) => m[1])

const missing = expected.filter((tag) => !actual.includes(tag))
const extra = actual.filter((tag) => !expected.includes(tag))

if (missing.length === 0 && extra.length === 0) {
  console.log(`캐시 태그 도메인 일치: ${expected.length}개 (사본 ${copyFile})`)
  process.exit(0)
}

const list = expected.map((tag) => `'${tag}'`).join(', ')
console.error([
  '캐시 태그 도메인이 DB 사본과 다르다. DB 트리거가 다른 도메인의 태그를 버린다.',
  `  원천: packages/shared/src/constants/cache-tags.ts`,
  `  사본: sw/web/database/migrations/${copyFile}`,
  missing.length ? `  사본에 없음: ${missing.join(', ')}` : null,
  extra.length ? `  원천에 없음: ${extra.join(', ')}` : null,
  '',
  '새 마이그레이션에 아래를 넣고 운영 DB에 적용한다:',
  '',
  'create or replace function public.web_revalidate_allowed_domains()',
  'returns text[]',
  'language sql',
  'immutable',
  "set search_path = ''",
  'as $$',
  `  select array[${list}]::text[]`,
  '$$;',
].filter((line) => line !== null).join('\n'))
process.exit(1)

function fail(message) {
  console.error(message)
  process.exit(1)
}
