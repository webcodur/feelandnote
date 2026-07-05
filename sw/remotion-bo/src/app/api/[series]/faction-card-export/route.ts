/**
 * 세력도 카드뉴스 내보내기 — 미리보던 카드를 정지 이미지(PNG) 파일로 저장한다.
 * 비율마다 manifest(컴포지션·script·카드별 출력) 하나를 만들어 faction:card-still 스크립트를 부른다.
 * 그 스크립트가 @remotion/renderer 로 props 를 직접 주입해 카드들을 한 번의 번들로 연속 출고한다
 * (remotion CLI 의 --props 파일이 현재 버전에서 깨져 우회). 진행 상황은 작업 패널(runTask)에 표시된다.
 */
import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { runTask } from '@/lib/server-utils'
import { isFactionSeries } from '@/lib/series-registry'
import { loadFactionEpisode, loadFactionCards } from '@/lib/faction-utils'
import { mergeFactionCards } from '@/lib/faction-types'

// 실행 시점에만 도는 동적 라우트(렌더 산출물 out/ 을 fs로 다룸). 빌드 타임 정적 분석·prerender 대상이 아님.
// 경로 상수를 모듈 최상위에 두면 Turbopack이 out/ 디렉토리를 번들 자산으로 추적하다 깨진다 → 핸들러 내부에서 런타임 계산.
export const dynamic = 'force-dynamic'

const RATIO_COMP: Record<string, string> = {
  '4x5': 'FactionCard-4x5',
  '3x4': 'FactionCard-3x4',
  '1x1': 'FactionCard-1x1',
  '9x16': 'FactionCard-9x16',
}

// 출력 파일명 — 카드 종류와 대상 인덱스로 식별(영문만, 한글 폴더는 출력 경로에만).
function cardSlug(card: Record<string, unknown>, i: number): string {
  const type = String(card.type ?? 'card')
  const gi = card.groupIndex != null ? `g${card.groupIndex}` : ''
  const ci = card.clusterIndex != null ? `c${card.clusterIndex}` : ''
  const pi = card.personIndex != null ? `p${card.personIndex}` : ''
  return [String(i + 1).padStart(2, '0'), type, gi, ci, pi].filter(Boolean).join('-')
}

export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isFactionSeries(series)) return NextResponse.json({ error: 'faction series only' }, { status: 400 })

  const { episode, ratio, cards } = await req.json()
  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })
  const comp = RATIO_COMP[ratio]
  if (!comp) return NextResponse.json({ error: 'invalid ratio' }, { status: 400 })
  if (!Array.isArray(cards) || cards.length === 0) return NextResponse.json({ error: 'cards required' }, { status: 400 })

  const REMOTION_ROOT = path.join(process.cwd(), '..', 'remotion')
  const PROPS_DIR = path.join(REMOTION_ROOT, 'out', '.cardprops')

  try {
    // 디스크의 최신 데이터로 렌더 — 영상 데이터(faction-data.json) 위에 카드 대본(faction-cards.json)을 병합한 것이 카드의 원본이다.
    const script = mergeFactionCards(await loadFactionEpisode(episode), await loadFactionCards(episode))
    await mkdir(PROPS_DIR, { recursive: true })

    const ts = Date.now()
    // 카드별 출력 경로 — 같은 비율이면 한 manifest 에 모아 한 번에 출고한다.
    const jobs = cards.map((card: Record<string, unknown>, i: number) => ({
      card,
      out: `out/FactionCard/${episode}/${cardSlug(card, i)}-${ratio}.png`,
    }))
    // 자산은 이 서버의 rm-asset 통로로 받게 한다(public 통째 복사 회피). 렌더는 헤드리스 크롬이 이 URL로 사진을 가져온다.
    const assetBase = new URL(req.url).origin + '/api/rm-asset'
    const manifest = { compId: comp, episodeName: episode, script, jobs, assetBase }
    const manifestFile = path.join(PROPS_DIR, `manifest-${ratio}-${ts}.json`)
    await writeFile(manifestFile, JSON.stringify(manifest), 'utf-8')
    const taskId = runTask('faction-card', series, episode, ['faction:card-still', manifestFile]).id
    return NextResponse.json({ taskIds: [taskId], count: jobs.length, dir: `out/FactionCard/${episode}` })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
