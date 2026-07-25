import { NextResponse } from 'next/server'
import { mkdir, copyFile, readFile, rm } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { voiceDir } from '@/lib/server-utils'
import { isValidSeries } from '@/lib/series-registry'
import { applyAgeToFile } from '@feelandnote/shared/bo/voice-age'

// ── 북리커맨드 구간 음성 연령 변형 라우트
//
// 원본을 두고 늙거나 젊게 변형한 예상안을 만들어 들어보고(preview), 마음에 들면 덮어쓴다(commit).
// 진짜 원본은 voice/{locale}/ori/ 에 영구 보관해 예상안은 항상 원본 기준으로 생성한다(누적 왜곡 없음).
//
// 요청: { episode, fileName (예 'gemini/S01-host-intro.wav'), age, action }
//   action 'preview' | 'commit' | 'restore' | 'status'
//   age ∈ [-1, 1] (양수=젊게, 음수=늙게). 변형은 전체 길이를 유지한다.

/** WAV 헤더(byteRate)로 길이(초) 계산. 실패 시 0 */
function wavDurationSec(buf: Buffer): number {
  if (buf.length < 44 || buf.slice(0, 4).toString('ascii') !== 'RIFF') return 0
  const byteRate = buf.readUInt32LE(28)
  if (byteRate <= 0) return 0
  return +((buf.length - 44) / byteRate).toFixed(2)
}

export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  const { episode, fileName, age, action } = await req.json().catch(() => ({}))
  if (!episode || !fileName || typeof fileName !== 'string' || !/\.wav$/i.test(fileName)) {
    return NextResponse.json({ success: false, error: 'episode, fileName(.wav) required' }, { status: 400 })
  }
  if (fileName.includes('..')) {
    return NextResponse.json({ success: false, error: 'invalid fileName' }, { status: 400 })
  }

  const vDir = voiceDir(episode)
  const target = path.join(vDir, fileName)
  const backup = path.join(vDir, 'ori', fileName)
  const hasOri = existsSync(backup)

  try {
    if (action === 'status') {
      return NextResponse.json({ success: true, hasOri })
    }

    // 변형 기준은 항상 진짜 원본 — ori 있으면 그것, 없으면 현재 파일.
    const realSource = hasOri ? backup : target
    if (!existsSync(realSource)) {
      return NextResponse.json({ success: false, error: '음원 없음' }, { status: 404 })
    }

    if (action === 'restore') {
      if (!hasOri) return NextResponse.json({ success: false, error: '보관된 원본이 없다' }, { status: 400 })
      await copyFile(backup, target)
      return NextResponse.json({ success: true, duration: wavDurationSec(await readFile(target)), hasOri: true, restored: true })
    }

    const ageNum = Math.max(-1, Math.min(1, Number(age) || 0))

    if (action === 'preview') {
      const tmp = target.replace(/\.wav$/i, '.agepreview.wav')
      await applyAgeToFile(realSource, tmp, ageNum)
      const buf = await readFile(tmp)
      await rm(tmp, { force: true })
      return NextResponse.json({ success: true, base64: buf.toString('base64'), duration: wavDurationSec(buf) })
    }

    if (action === 'commit') {
      // 원본을 ori/ 에 보관 — 최초 1회만(진짜 원본 보존).
      if (!hasOri) {
        await mkdir(path.dirname(backup), { recursive: true })
        await copyFile(target, backup)
      }
      const tmp = target.replace(/\.wav$/i, '.agetmp.wav')
      await applyAgeToFile(backup, tmp, ageNum)
      await copyFile(tmp, target)
      await rm(tmp, { force: true })
      return NextResponse.json({ success: true, duration: wavDurationSec(await readFile(target)), hasOri: true })
    }

    return NextResponse.json({ success: false, error: 'unknown action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) })
  }
}
