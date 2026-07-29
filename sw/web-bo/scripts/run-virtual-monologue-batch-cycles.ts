/**
 * 조사 완료 한국어 독백 배치의 후보 생성 → 독립 검토 2종 → 수정·재검토를
 * 한 프로세스에서 순서대로 실행한다.
 *
 * 같은 배치 파일을 쓰는 단계는 절대 겹치지 않는다. 각 하위 명령이 정상 종료한
 * 뒤에만 다음 단계로 넘어가며, 승인·DB 게시·hold 판정은 자동화하지 않는다.
 *
 * 실행:
 *   pnpm exec tsx scripts/run-virtual-monologue-batch-cycles.ts \
 *     --file ../../docs/celeb-data/virtual-monologue/2026-07-29-VM-KO-02.json \
 *     --concurrency 3 --cycles 2
 */

import { spawnSync } from 'child_process'
import { resolve } from 'path'
import {
  argValue,
  readBatch,
  requiredArg,
} from './lib/virtual-monologue-workbench'
import { parseConcurrency } from './lib/virtual-monologue-batch-concurrency'

const FILE_ARG = requiredArg('--file')
const FILE = resolve(process.cwd(), FILE_ARG)
const CONCURRENCY = parseConcurrency()
const SLUGS = argValue('--slugs')

function cycleCount(): number {
  const raw = argValue('--cycles') ?? '2'
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0 || value > 2) {
    throw new Error(`--cycles는 0~2 정수여야 한다: ${raw}`)
  }
  return value
}

function runScript(
  script: string,
  extraArgs: string[] = [],
): void {
  const args = [
    'exec',
    'tsx',
    `scripts/${script}`,
    '--file',
    FILE_ARG,
    '--concurrency',
    String(CONCURRENCY),
    ...extraArgs,
  ]
  if (SLUGS) args.push('--slugs', SLUGS)

  console.log(`\n=== ${script} ===`)
  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${script} 실패(exit ${result.status ?? 'unknown'})`)
  }
}

function printSummary(): void {
  const batch = readBatch(FILE)
  const targets = SLUGS
    ? batch.people.filter(person => SLUGS.split(',').includes(person.slug))
    : batch.people
  let pass = 0
  let actionable = 0
  let incomplete = 0

  for (const person of targets) {
    const evidence = person.reviews?.find(review => review.lens === 'evidence')
    const editorial = person.reviews?.find(review => review.lens === 'editorial')
    if (!evidence || !editorial) {
      incomplete += 1
      continue
    }
    if (
      evidence.verdict === 'pass'
      && editorial.verdict === 'pass'
      && evidence.blocking.length === 0
      && evidence.major.length === 0
      && editorial.blocking.length === 0
      && editorial.major.length === 0
    ) {
      pass += 1
    } else {
      actionable += 1
    }
  }

  console.log('\n=== 배치 순환 결과 ===')
  console.log(`pass ${pass} · 잔여 blocking/major ${actionable} · 검토 미완료 ${incomplete}`)
  console.log('다음 단계: pass 후보 직접 통독·승인, 잔여 후보는 hold 재진입 조건 판정')
  console.log('자동 승인 0건 · DB 쓰기 0건')
}

function main(): void {
  const cycles = cycleCount()
  readBatch(FILE)

  runScript('generate-virtual-monologue-batch.ts')
  runScript('review-virtual-monologue-batch.ts', ['--lens', 'evidence'])
  runScript('review-virtual-monologue-batch.ts', ['--lens', 'editorial'])

  for (let cycle = 1; cycle <= cycles; cycle += 1) {
    console.log(`\n######## 수정 순환 ${cycle}/${cycles} ########`)
    runScript('revise-virtual-monologue-batch.ts')
    runScript('review-virtual-monologue-batch.ts', ['--lens', 'evidence'])
    runScript('review-virtual-monologue-batch.ts', ['--lens', 'editorial'])
  }

  printSummary()
}

try {
  main()
} catch (error) {
  console.error(error)
  process.exit(1)
}
