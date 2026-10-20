import 'server-only'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// 공개 프로젝트 ID만 읽는다. 로컬 BO는 사용자 웹의 기존 설정을 재사용한다.
export function getClarityProjectId(): string | null {
  let id = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim()
  if (!id) {
    try {
      id = readFileSync(resolve(process.cwd(), '../web/.env'), 'utf8')
        .match(/^\s*(?:export\s+)?NEXT_PUBLIC_CLARITY_PROJECT_ID\s*=\s*["']?([a-z0-9]+)["']?\s*(?:#.*)?$/m)?.[1]
    } catch { return null }
  }
  return id && /^[a-z0-9]+$/.test(id) ? id : null
}
