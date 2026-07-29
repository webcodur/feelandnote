import { exec } from 'child_process'
import { REMOTION_ROOT } from '@feelandnote/shared/bo/remotion-root'
import { isValidSeries } from '@/features/book-recommend/lib/series-registry'

const SHELL = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh'

/**
 * 음성 정렬 — 받아쓰기(3-transcribe.py) → 발화시각 산출(4-align.ts) 두 단계만 순차 실행.
 * 의미 분할(5-chunk.ts)은 호출하지 않으므로 기존 sub 분할은 그대로 보존된다
 * (align 은 텍스트가 동일한 세그먼트의 sub 를 유지한다).
 *
 * 스코프 규약: transcribe/align 은 --episode 에 locale 접미사(-ko/-en) 필수이고
 * --long 또는 --shorts <N> 중 정확히 하나가 필수다. only 키로 자동 판별한다.
 *   - 쇼츠 키: `shorts-{N}/S{idx}-{id}` → --shorts N
 *   - 롱폼 키: `D05b-summary` 등 → --long
 */
export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return Response.json({ error: 'invalid series' }, { status: 404 })
  const { episode, only } = await req.json()
  if (!episode) return Response.json({ error: 'episode required' }, { status: 400 })
  if (!only) return Response.json({ error: 'only(대상 음원) required' }, { status: 400 })

  // 스코프 판별: shorts-N/ 접두사 유무로 쇼츠/롱폼 구분
  const m = String(only).match(/shorts-(\d+)[/\\]/)
  const scope = m ? ['--shorts', m[1]] : ['--long']
  // transcribe/align 의 --only 는 키 contains 매칭 → 접두사·확장자 제거
  const onlyKey = String(only).replace(/^shorts-\d+[/\\]/, '').replace(/\.wav$/i, '')

  // transcribe/align 은 --episode 에 locale 꼬리표(-ko/-en) 필수. 앱 규약상 en 은 이름에 -en 을
  // 달고 ko 는 꼬리표가 없으므로, 꼬리표가 없으면 ko 로 본다(episode-context.isEn 과 동일 규칙).
  const ep = /-(ko|en)$/.test(String(episode)) ? String(episode) : `${episode}-ko`
  const transcribe = ['pnpm', 'voice:transcribe', '--', '--episode', ep, ...scope, '--only', onlyKey].join(' ')
  const align = ['pnpm', 'voice:align', '--', '--episode', ep, ...scope, '--only', onlyKey, '--update-json'].join(' ')
  const cmd = `${transcribe} && ${align}`

  return new Promise<Response>((resolve) => {
    exec(
      cmd,
      { cwd: REMOTION_ROOT, timeout: 180000, shell: SHELL },
      (err: Error | null, stdout: string, stderr: string) => {
        if (err) {
          console.error('[voice/analyze] 실패:', err.message, stderr)
          resolve(Response.json({ error: err.message, stdout, stderr }, { status: 500 }))
        } else {
          resolve(Response.json({ ok: true, stdout }))
        }
      },
    )
  })
}
