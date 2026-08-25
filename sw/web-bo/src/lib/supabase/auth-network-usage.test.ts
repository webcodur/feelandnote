import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const hotAuthFiles = [
  'src/proxy.ts',
  'src/app/(admin)/layout.tsx',
  'src/lib/admin-auth.ts',
  'src/lib/admin-route.ts',
  'src/lib/ranking-route.ts',
  'src/lib/faction-route.ts',
  'src/lib/discourse-route.ts',
  'src/lib/book-person-route.ts',
  'src/lib/faction-db.ts',
  'src/lib/discourse-db.ts',
  'src/actions/admin/ai-collect.ts',
  'src/actions/admin/content-research.ts',
  'src/actions/admin/celebs.ts',
]

test('관리 요청의 신원 검증은 Auth 서버를 매번 호출하지 않는다', () => {
  for (const relativePath of hotAuthFiles) {
    const source = readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')

    assert.doesNotMatch(source, /\.auth\.getUser\s*\(/, relativePath)
    assert.match(source, /\.auth\.getClaims\s*\(/, relativePath)
  }
})
