/**
 * 스크립트가 쓰는 기준 경로. 파일이 놓인 깊이와 무관하게 같은 값을 돌려준다.
 *
 * 스크립트 폴더를 도메인별로 나누면서 `resolve(__dirname, '..', ...)` 같은
 * 깊이 결합을 걷어냈다. 새 스크립트도 상대 홉 대신 여기를 쓴다.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function ascendTo(marker: string, from: string): string {
  let current = from
  for (;;) {
    if (existsSync(path.join(current, marker))) return current
    const parent = path.dirname(current)
    if (parent === current) throw new Error(`${marker}를 찾지 못했다: ${from}`)
    current = parent
  }
}

const here = path.dirname(fileURLToPath(import.meta.url))

/** `sw/web-bo` — 이 앱의 루트. `.env`와 `node_modules`가 여기 있다. */
export const BO_ROOT = ascendTo('package.json', here)

/** 저장소 루트. `data/`, `sw/`, `docs/`가 여기 있다. */
export const REPO_ROOT = ascendTo('pnpm-workspace.yaml', BO_ROOT)

/** 스크립트 폴더. 커서 파일·로그처럼 스크립트에 딸린 자료를 둔다. */
export const SCRIPTS_ROOT = path.join(BO_ROOT, 'scripts')

export const boPath = (...segments: string[]): string => path.resolve(BO_ROOT, ...segments)
export const repoPath = (...segments: string[]): string => path.resolve(REPO_ROOT, ...segments)
export const scriptsPath = (...segments: string[]): string => path.resolve(SCRIPTS_ROOT, ...segments)
