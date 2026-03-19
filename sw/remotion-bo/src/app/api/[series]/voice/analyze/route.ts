import { exec } from 'child_process'
import { join } from 'path'

const REMOTION_ROOT = join(process.cwd(), '..', 'remotion')
const SHELL = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh'

export async function POST(req: Request) {
  const { episode, only } = await req.json()
  if (!episode) return Response.json({ error: 'episode required' }, { status: 400 })

  const args = ['npx', 'tsx', 'scripts/analyze-voice.ts', '--', '--episode', episode, '--update-json']
  if (only) args.push('--only', String(only))

  return new Promise<Response>((resolve) => {
    exec(
      args.join(' '),
      { cwd: REMOTION_ROOT, timeout: 120000, shell: SHELL },
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
