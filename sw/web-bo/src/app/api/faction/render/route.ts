import { NextResponse } from 'next/server'
import { runTask } from '@feelandnote/shared/bo/task-queue'
import { factionVariants, factionCompBase } from '@feelandnote/shared/lib/youtube-faction-meta'
import { FACTION_SERIES } from '@/lib/faction-paths'
import { guardFactionRoute } from '@/lib/faction-route'
// 원천 교체 — 에피소드 데이터를 파일(loadFactionEpisode)이 아니라 DB 에서 조립한다.
// 실행 스크립트는 여전히 파일을 읽으므로 렌더 직전에 ensureFactionExport 로 파일을 DB 와 맞춘다.
import { loadFactionScriptFromDb, ensureFactionExport } from '@/lib/faction-episode-data'

// 세력도 렌더 코덱 — 옛 시리즈 정의(series-registry 의 faction.render.codec)에 있던 값을 상수로 옮겼다.
// 이 창구는 팩션 전용이라 시리즈 판별이 없다(prores 프로필은 책 기반 시리즈 전용이라 버렸다).
const RENDER_CODEC = 'h264'

export async function POST(req: Request) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const { episode, only } = await req.json()
  if (!episode) return NextResponse.json({ error: 'episode required' }, { status: 400 })

  // 실행 스크립트(pnpm render:faction)가 읽는 faction-data.json 을 DB 와 맞춘다.
  // 막혔으면(사람이 파일을 직접 고쳐 둔 경우 등) 옛 내용으로 영상이 나가므로 시작하지 않는다.
  const blocked = await ensureFactionExport(episode)
  if (blocked) return NextResponse.json({ error: blocked }, { status: 400 })

  // 세력도 — 컴포지션 ID·출력 접미사는 factionVariants(에피소드 데이터 기반) 단일원천을 따른다(Root.tsx 등록과 일치).
  // 세로 롱폼(KO-LV, 편 경계 있으면 KO-LV{N}편) + 세로 쇼츠 N편(진영 part 의 실제 편 수만큼). 가로(LH)·영문(EN)은 Root.tsx에서 주석.
  const base = factionCompBase(episode)
  const factionData = await loadFactionScriptFromDb(episode)
  // only 미지정=전체 / 'longform'·'shorts' 로 거를 수 있다.
  const targets = factionVariants(factionData.groups, factionData.longformLayout)
    .filter(v => !only || (only === 'shorts' ? v.isShorts : only === 'longform' ? !v.isShorts : true))
    .map(v => ({ comp: `${base}-${v.fileSuffix}`, out: `out/Faction/${episode}-${v.fileSuffix}.mp4` }))
  // 렌더는 **창고 방식**으로 돈다(`render:staged`) — 그 편 자산 + 공용만 임시로 모아 넘긴다.
  // 옛 `pnpm render` 는 public 7.3GB 를 통째로 번들에 복사했다(편마다 매번, 디스크 사고 이력).
  const taskIds = targets.map(t =>
    runTask('render-faction', FACTION_SERIES, episode,
      ['render:staged', '--', '--episode', episode, t.comp, t.out, '--codec', RENDER_CODEC]).id,
  )
  // 세로 롱폼 썸네일 — KO-LV-TH 스틸을 각 롱폼 variant 이름의 THUMB.png 로 출고한다.
  // 유튜브 업로드(variantFiles)가 `{episode}-{suffix}-THUMB.png` 를 자동 인식해 붙인다.
  if (only !== 'shorts') {
    const lvVariants = factionVariants(factionData.groups, factionData.longformLayout).filter(v => !v.isShorts)
    for (const v of lvVariants) {
      taskIds.push(runTask('faction-thumb', FACTION_SERIES, episode,
        ['render:staged', '--', '--episode', episode, '--still',
          `${base}-KO-LV-TH`, `out/Faction/${episode}-${v.fileSuffix}-THUMB.png`]).id)
    }
  }
  // 자막(SRT)도 함께 — 데이터 기반이라 즉시 생성된다(롱폼·쇼츠 1·2편 한 번에).
  taskIds.push(runTask('faction-srt', FACTION_SERIES, episode, ['faction:srt', '--', '--episode', episode]).id)
  return NextResponse.json({ taskIds })
}
