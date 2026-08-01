import { NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { factionVariants } from '@feelandnote/shared/lib/youtube-faction-meta'
import { REMOTION_ROOT } from '@feelandnote/shared/bo/remotion-root'
import { checkUploadsLive } from '@/lib/youtube-liveness'
import { guardFactionRoute } from '@/lib/faction-route'
// 원천 교체 — 에피소드 데이터를 파일(loadFactionEpisode)이 아니라 DB 에서 조립한다.
// 조회만 하는 창구라 파일 내보내기(ensureFactionExport)는 부르지 않는다.
import { loadFactionScriptFromDb } from '@/lib/faction-episode-data'

// 실행 시점에만 도는 동적 라우트(렌더 산출물 out/ 을 fs로 스캔). 빌드 타임 정적 분석·prerender 대상이 아님.
// 경로 상수를 모듈 최상위에 두면 Turbopack이 out/ 디렉토리를 번들 자산으로 추적하다 깨진다 → 사용처 함수 내부에서 런타임 계산.
// (렌더 저장소 뿌리만 공용 부품 REMOTION_ROOT 로 바꿨다 — youtube-client 와 같은 원천을 쓰고 환경변수 덮어쓰기를 지원한다.)
export const dynamic = 'force-dynamic'

/**
 * 인증 토큰 확인 — KO/EN 채널 각각.
 *
 * expiryDate 는 1시간짜리 단기 접속 토큰(access token)의 만료 시각이라 거의 항상 지나 있다(잡음).
 * 실제로 "지금 업로드 가능한가"는 자동 재발급 열쇠(refresh_token) 유무가 결정한다 —
 * 이게 있으면 googleapis 가 만료된 접속 토큰을 알아서 갱신한다(youtube-core.ts 의 'tokens' 핸들러).
 * 그래서 hasRefreshToken 을 함께 내려 화면이 만료시각 대신 이 값을 보여주게 한다.
 */
function checkToken(fileName: string) {
  const tp = path.join(REMOTION_ROOT, 'credentials', fileName)
  try {
    if (existsSync(tp)) {
      const token = JSON.parse(readFileSync(tp, 'utf-8'))
      return {
        authenticated: true,
        expiryDate: token.expiry_date ? new Date(token.expiry_date).toISOString() : undefined,
        hasRefreshToken: !!token.refresh_token,
      }
    }
  } catch { /* ignore */ }
  return { authenticated: false, expiryDate: undefined as string | undefined, hasRefreshToken: false }
}

/**
 * 세력도감 업로드 상태 — 한국어 세로 영상. 세로 롱폼(KO-LV, 편 경계 있으면 KO-LV{N}편) + 세로 쇼츠 N편(에피소드 데이터의 진영 part 수만큼).
 * 출력: out/Faction/{ep}-KO-LV.mp4 또는 {ep}-KO-LV{N}.mp4 (롱폼) · {ep}-KO-S{N}.mp4 (쇼츠)
 * 기록: scripts/youtube/faction-lineup.json
 */
async function factionStatus(episode: string) {
  const auth = { ko: checkToken('youtube_token.json'), en: checkToken('youtube_token_en.json') }

  const lineupPath = path.join(REMOTION_ROOT, 'scripts', 'youtube', 'faction-lineup.json')
  let episodeMeta = null
  try {
    const lineup = JSON.parse(await readFile(lineupPath, 'utf-8'))
    episodeMeta = lineup[episode] ?? null
  } catch { /* ignore */ }

  // 영상 종류 — 에피소드 데이터의 진영 part 에서 편 수를 산출한다(편 없으면 단일 쇼츠).
  const factionData = await loadFactionScriptFromDb(episode).catch(() => null)
  const epVariants = factionData ? factionVariants(factionData.groups, factionData.longformLayout) : []

  const factionOut = path.join(REMOTION_ROOT, 'out', 'Faction')

  const variants = []
  for (const v of epVariants) {
    const base = `${episode}-${v.fileSuffix}`
    const videoPath = path.join(factionOut, `${base}.mp4`)
    const srtPath = path.join(factionOut, `${base}.srt`)
    const thumbPath = path.join(factionOut, `${base}-THUMB.png`)
    let video = null
    if (existsSync(videoPath)) {
      const s = await stat(videoPath)
      video = { exists: true, size: s.size, name: `${base}.mp4` }
    }
    variants.push({
      lang: 'ko' as const,
      type: (v.isShorts ? 'shorts' : 'longform') as 'shorts' | 'longform',
      shortsIndex: v.part ?? 0,
      key: v.key,
      label: v.label,
      video,
      srt: existsSync(srtPath) ? { exists: true, name: `${base}.srt` } : null,
      thumb: existsSync(thumbPath) ? { exists: true, name: `${base}-THUMB.png` } : null,
    })
  }

  // 기록된 영상이 유튜브에 아직 있는지 대조 — 세력도감는 KO 채널 하나뿐이라 1 unit.
  const live = await checkUploadsLive(episodeMeta?.uploads, () => 'ko')

  return NextResponse.json({ auth, lineup: episodeMeta, variants, meta: null, live })
}

export async function GET(req: Request) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const url = new URL(req.url)
  const episode = url.searchParams.get('episode')
  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })

  return factionStatus(episode)
}
