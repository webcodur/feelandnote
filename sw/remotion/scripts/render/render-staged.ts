/**
 * render-staged.ts — 렌더 창고를 짓고 그 위에서 렌더한다
 *
 * 사용:
 *   pnpm render:staged -- --episode PayPal-Mafia Faction-PayPal-Mafia-KO-S1 out/Faction/x.mp4 --codec h264
 *   pnpm render:staged -- --episode PayPal-Mafia --still Faction-PayPal-Mafia-KO-LV-TH out/x.png
 *   pnpm render:staged -- --episode PayPal-Mafia --full-public <컴포지션> <출력>   # 옛 방식(public 통짜)
 *
 * 창고가 기본이다. 조립이 실패하면 **조용히 통짜로 넘어가지 않는다** — 사유를 찍고 멈춘 뒤
 * `--full-public` 을 쓰라고 알린다. 통짜는 7.3GB 를 복사하므로 사람이 알고 골라야 한다.
 *
 * 창고 위치·구성 규칙은 `stage.ts` 소유다. 이 파일은 껍데기다.
 */

import { spawn } from 'child_process'
import { buildRenderStage, cleanRenderStage, mb } from './stage.js'

const USAGE = '사용: pnpm render:staged -- --episode <편> [--series faction|discourse|book-person] [--still] [--full-public] <컴포지션> <출력> [렌더 옵션…]'

interface Args {
  episode: string
  series: string
  still: boolean
  fullPublic: boolean
  rest: string[]
}

function parseArgs(argv: string[]): Args {
  const args = argv.slice(2)
  let episode = ''
  let series = 'faction'
  let still = false
  let fullPublic = false
  const rest: string[] = []

  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--') continue
    else if (a === '--episode') episode = args[++i] ?? ''
    else if (a === '--series') series = args[++i] ?? 'faction'
    else if (a === '--still') still = true
    else if (a === '--full-public') fullPublic = true
    else rest.push(a)
  }

  if (!episode) throw new Error(`--episode 가 필요하다\n${USAGE}`)
  if (rest.length < 2) throw new Error(`컴포지션과 출력 경로가 필요하다\n${USAGE}`)
  return { episode, series, still, fullPublic, rest }
}

function run(cmd: string, cmdArgs: string[]): Promise<number> {
  return new Promise(resolve => {
    const child = spawn(cmd, cmdArgs, { stdio: 'inherit', shell: true })
    child.on('close', code => resolve(code ?? 1))
  })
}

async function main() {
  const args = parseArgs(process.argv)
  const mode = args.still ? 'still' : 'render'

  let publicDir: string | null = null
  if (!args.fullPublic) {
    try {
      const stage = await buildRenderStage(args.series, args.episode)
      publicDir = stage.dir
      console.log(
        `[창고] ${stage.dir}\n`
        + `       파일 ${stage.files}개 · ${mb(stage.bytes)}MB · 하드링크 ${stage.linked} / 복사 ${stage.copied} · ${stage.ms}ms\n`
        + `       곡 ${stage.music.length}개${stage.music.length ? `: ${stage.music.join(', ')}` : ' (이 편은 배경음악 없음)'}`,
      )
      if (stage.musicMissing.length) {
        // 조용히 빼지 않는다 — 통짜로 뽑아도 어차피 안 들리는 결손이다
        console.warn(`⚠ 데이터가 부르는데 music/ 에 없는 곡 ${stage.musicMissing.length}개: ${stage.musicMissing.join(', ')}`)
      }
    } catch (e) {
      // 조용한 폴백 금지 — 왜 실패했는지 알리고 사람이 고르게 한다
      console.error(`✗ 창고 조립 실패: ${e instanceof Error ? e.message : String(e)}`)
      console.error('  통짜 public(7.3GB 복사)으로 뽑으려면 같은 명령에 --full-public 을 붙여라.')
      process.exit(1)
    }
  } else {
    console.log('[창고] 건너뜀 — --full-public 이라 public 전체를 쓴다')
  }

  // 옛 `pnpm render`·`pnpm still` 이 달고 있던 기본 옵션을 그대로 붙인다 — 여기서 빠지면
  // 렌더러가 달라져 결과가 미묘하게 바뀐다(그림 형식·GL 백엔드).
  const defaults = mode === 'render' ? ['--image-format=png', '--gl=angle'] : ['--gl=angle']

  const cliArgs = [
    'remotion', mode, ...args.rest, ...defaults,
    ...(publicDir ? ['--public-dir', publicDir] : []),
  ]
  console.log(`[렌더] npx ${cliArgs.join(' ')}`)
  const code = await run('npx', cliArgs)

  if (publicDir) {
    cleanRenderStage(publicDir)
    console.log('[창고] 정리 완료')
  }
  process.exit(code)
}

main().catch(e => {
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})
