// 천도 — 이벤트 시스템

import type { GameState, Season } from './types'

export interface GameEvent {
  id: string
  name: string
  description: string
  icon: string
  season?: Season  // 특정 계절에만 발생
  probability: number  // 0-1
  effect: (state: GameState) => GameState
}

// ── 계절 이벤트 ──

const SEASONAL_EVENTS: GameEvent[] = [
  // 봄
  {
    id: 'bumper_crop_spring',
    name: '풍년',
    description: '봄비가 넉넉히 내려 농작물이 잘 자란다.',
    icon: '🌸',
    season: 'spring',
    probability: 0.15,
    effect: (s) => ({
      ...s,
      factions: s.factions.map(f => ({
        ...f,
        resources: { ...f.resources, food: f.resources.food + Math.floor(f.resources.food * 0.3) },
      })),
      log: [...s.log, '🌸 풍년! 식량 +30%'],
    }),
  },
  {
    id: 'plague_spring',
    name: '역병',
    description: '역병이 돌아 병력이 감소한다.',
    icon: '🦠',
    season: 'spring',
    probability: 0.08,
    effect: (s) => ({
      ...s,
      factions: s.factions.map(f => ({
        ...f,
        members: f.members.map(m => ({
          ...m,
          troops: Math.max(10, Math.floor(m.troops * 0.9)),
        })),
      })),
      log: [...s.log, '🦠 역병! 병력 -10%'],
    }),
  },
  // 여름
  {
    id: 'flood_summer',
    name: '홍수',
    description: '폭우로 강 인접 영토에 피해가 발생한다.',
    icon: '🌊',
    season: 'summer',
    probability: 0.1,
    effect: (s) => ({
      ...s,
      factions: s.factions.map(f => ({
        ...f,
        resources: { ...f.resources, food: Math.max(0, f.resources.food - 50) },
        territories: f.territories.map(t => ({
          ...t,
          morale: Math.max(0, t.morale - 5),
        })),
      })),
      log: [...s.log, '🌊 홍수! 식량 -50, 민심 하락'],
    }),
  },
  {
    id: 'good_harvest_summer',
    name: '풍작',
    description: '여름 작물이 풍성하게 열렸다.',
    icon: '🌾',
    season: 'summer',
    probability: 0.12,
    effect: (s) => ({
      ...s,
      factions: s.factions.map(f => ({
        ...f,
        resources: { ...f.resources, food: f.resources.food + 80 },
      })),
      log: [...s.log, '🌾 풍작! 식량 +80'],
    }),
  },
  // 가을
  {
    id: 'harvest_festival',
    name: '수확제',
    description: '추수의 기쁨으로 민심이 올라간다.',
    icon: '🎃',
    season: 'autumn',
    probability: 0.2,
    effect: (s) => ({
      ...s,
      factions: s.factions.map(f => ({
        ...f,
        territories: f.territories.map(t => ({
          ...t,
          morale: Math.min(100, t.morale + 10),
        })),
      })),
      log: [...s.log, '🎃 수확제! 민심 +10'],
    }),
  },
  {
    id: 'refugees_autumn',
    name: '유민 유입',
    description: '전란을 피해 유민이 몰려왔다.',
    icon: '👥',
    season: 'autumn',
    probability: 0.1,
    effect: (s) => ({
      ...s,
      factions: s.factions.map(f => ({
        ...f,
        territories: f.territories.map(t => ({
          ...t,
          population: t.population + 200,
        })),
      })),
      log: [...s.log, '👥 유민 유입! 인구 +200'],
    }),
  },
  // 겨울
  {
    id: 'blizzard',
    name: '한파',
    description: '혹독한 추위로 식량 소모가 늘어난다.',
    icon: '🥶',
    season: 'winter',
    probability: 0.15,
    effect: (s) => ({
      ...s,
      factions: s.factions.map(f => ({
        ...f,
        resources: { ...f.resources, food: Math.max(0, f.resources.food - 100) },
      })),
      log: [...s.log, '🥶 한파! 식량 -100'],
    }),
  },
]

// ── 일반 이벤트 (계절 무관) ──

const RANDOM_EVENTS: GameEvent[] = [
  {
    id: 'bandits',
    name: '도적 출현',
    description: '도적이 나타나 자원을 약탈한다.',
    icon: '🏴‍☠️',
    probability: 0.05,
    effect: (s) => ({
      ...s,
      factions: s.factions.map(f => ({
        ...f,
        resources: {
          ...f.resources,
          gold: Math.max(0, f.resources.gold - 30),
        },
        territories: f.territories.map(t => ({
          ...t,
          morale: Math.max(0, t.morale - 3),
        })),
      })),
      log: [...s.log, '🏴‍☠️ 도적 출현! 금 -30, 민심 하락'],
    }),
  },
  {
    id: 'merchant_caravan',
    name: '상인 행렬',
    description: '먼 곳에서 온 상인들이 물자를 가져왔다.',
    icon: '🐫',
    probability: 0.06,
    effect: (s) => ({
      ...s,
      factions: s.factions.map(f => ({
        ...f,
        resources: {
          ...f.resources,
          gold: f.resources.gold + 50,
          material: f.resources.material + 30,
        },
      })),
      log: [...s.log, '🐫 상인 행렬! 금 +50, 자재 +30'],
    }),
  },
  {
    id: 'discovery',
    name: '고서 발견',
    description: '도서관에서 귀한 문헌이 발견되었다.',
    icon: '📖',
    probability: 0.04,
    effect: (s) => ({
      ...s,
      factions: s.factions.map(f => ({
        ...f,
        resources: {
          ...f.resources,
          knowledge: f.resources.knowledge + 40,
        },
      })),
      log: [...s.log, '📖 고서 발견! 지식 +40'],
    }),
  },
  {
    id: 'morale_boost',
    name: '축제',
    description: '민중이 자발적으로 축제를 열었다.',
    icon: '🎉',
    probability: 0.05,
    effect: (s) => ({
      ...s,
      factions: s.factions.map(f => ({
        ...f,
        territories: f.territories.map(t => ({
          ...t,
          morale: Math.min(100, t.morale + 5),
          population: t.population + 50,
        })),
      })),
      log: [...s.log, '🎉 축제! 민심 +5, 인구 +50'],
    }),
  },
]

/** 이벤트 체크 (월 1회, 매월 1일에 호출) */
export function checkSeasonEvents(state: GameState): GameState {
  // 매월 1일 0시에만 체크
  if (state.gameTime.day !== 1 || state.gameTime.hour !== 0) return state

  let s = state

  // 계절 이벤트
  for (const evt of SEASONAL_EVENTS) {
    if (evt.season && evt.season !== s.season) continue
    if (Math.random() < evt.probability) {
      s = evt.effect(s)
      break // 한 달에 최대 1개 계절 이벤트
    }
  }

  // 랜덤 이벤트 (계절 이벤트와 별도로 1개 가능)
  for (const evt of RANDOM_EVENTS) {
    if (Math.random() < evt.probability) {
      s = evt.effect(s)
      break
    }
  }

  return s
}
