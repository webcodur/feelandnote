import { NextResponse } from 'next/server'
import { mkdir, copyFile, readFile, rm } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { isSeriesModel } from '@/lib/series-registry'
import { factionVoiceDir, factionVoiceFilePath, safeFilename, wavDurationSec } from '@/lib/faction-utils'
import { applyAgeToFile } from '@/lib/voice-age'

// ── 세력도 인물 음성 연령 변형 라우트
//
// 원본을 두고 늙거나 젊게 변형한 예상안을 만들어 들어보고(preview), 마음에 들면 덮어쓴다(commit).
// 진짜 원본은 voice/ori/ 에 영구 보관해 예상안은 항상 원본 기준으로 생성한다(누적 왜곡 없음).
//
// 요청: { file, age, action }
//   - action 'preview' : 원본 기준 변형본을 만들어 base64 로 돌려준다(디스크 미변경).
//   - action 'commit'  : 원본을 ori/ 에 보관(최초 1회) + 변형본을 기존 이름에 기록.
//   - action 'restore' : ori/ 원본을 기존 이름으로 되돌린다.
//   - action 'status'  : 원본 보관(ori) 여부만 반환.
//   age ∈ [-1, 1] (양수=젊게, 음수=늙게). 변형은 전체 길이를 유지한다.

/** 진짜 원본 백업 경로 — voice/ori/<파일명> */
function oriPath(ep: string, file: string): string {
  return path.join(factionVoiceDir(ep), 'ori', safeFilename(file))
}

export async function POST(req: Request, { params }: { params: Promise<{ series: string; episode: string }> }) {
  const { series, episode } = await params
  if (!isSeriesModel(series, 'faction')) {
    return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  }

  const { file, age, action } = await req.json().catch(() => ({}))
  if (!file || typeof file !== 'string' || !/\.wav$/i.test(file)) {
    return NextResponse.json({ success: false, error: 'file(.wav) required' }, { status: 400 })
  }

  const ep = decodeURIComponent(episode)
  const target = factionVoiceFilePath(ep, file)
  const backup = oriPath(ep, file)
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
