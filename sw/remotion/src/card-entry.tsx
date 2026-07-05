/**
 * 카드뉴스 전용 Remotion 엔트리 — still 출고용 경량 번들.
 * 메인 Root(수백 개 책·영상 컴포지션)를 번들하면 모듈 그래프가 커져 still 렌더가 메모리 한계에 부딪힌다.
 * 여기서는 카드 컴포넌트(FactionCard·BookCard)만 등록해 번들을 가볍게 한다.
 * script·episodeName·card 는 렌더 시 inputProps 로 주입한다(defaultProps 는 메타 선택용 자리표시).
 */
import React from 'react'
import { Composition, registerRoot } from 'remotion'
import { FactionCard } from './compositions/FactionCard'
import type { FactionScript } from './compositions/Faction/types'

const EMPTY_SCRIPT = { title: '', groups: [] } as unknown as FactionScript

const RATIOS: { id: string; width: number; height: number }[] = [
  { id: 'FactionCard-4x5', width: 1080, height: 1350 },
  { id: 'FactionCard-3x4', width: 1080, height: 1440 },
  { id: 'FactionCard-1x1', width: 1080, height: 1080 },
  { id: 'FactionCard-9x16', width: 1080, height: 1920 },
]

const CardRoot: React.FC = () => (
  <>
    {RATIOS.map(({ id, width, height }) => (
      <Composition
        key={id}
        id={id}
        component={FactionCard}
        durationInFrames={1}
        fps={1}
        width={width}
        height={height}
        defaultProps={{ script: EMPTY_SCRIPT, episodeName: '', card: { type: 'cover' as const, groupIndex: 0 } }}
      />
    ))}
  </>
)

registerRoot(CardRoot)
