import { REGIONS, TERRITORIES } from '@/lib/game/suikoden/constants'
import type { DispositionAction, RegionId, TerritoryId } from '@/lib/game/suikoden/types'
import { type Locale, resolveLocale } from '@/types/locale'

interface SuikodenText {
  common: {
    confirm: string
    close: string
    cancel: string
  }
  game: {
    loading: string
    characterCount: (count: number) => string
  }
  hud: {
    season: Record<string, string>
    turn: (turn: number) => string
    people: (count: number) => string
    territories: (count: number) => string
    fame: (value: number) => string
  }
  toolbar: {
    nextTurn: string
    returnHome: string
    autoOn: string
    autoOff: string
    dialogAuto: string
    dialogManual: string
    develop: string
    military: string
    diplomacy: string
    misc: string
    tax: string
    taxLow: string
    taxNormal: string
    taxHigh: string
    buildingStatus: string
    buildingCount: (count: number) => string
    buildingConstructing: (count: number) => string
    noBuildings: string
    invade: string
    ally: string
    claim: string
    noAdjacentTerritories: string
    allied: string
    friendly: (value: number) => string
    hostile: (value: number) => string
    neutral: string
    alliance: string
    ceasefire: string
    tribute: string
    surrender: string
    noOtherFactions: string
    abandonHint: (companionMax: number) => string
    abandon: string
    abandonConfirm: string
    abandonExecute: string
    viewingForeignTerritory: string
    unclaimedTerritory: (territory: string) => string
  }
  strategy: {
    assignRecruiter: string
    cannotReachTerritory: string
    noDeployableUnits: string
    helpTitle: string
    helpTurnLabel: string
    helpTurnDesc: string
    helpBuildTitle: string
    helpBuildDesc: string
    helpAssignTitle: string
    helpAssignDesc: string
    helpBattleTitle: string
    helpBattleDesc: string
    helpDiplomacyTitle: string
    helpDiplomacyDesc: string
    helpStatsTitle: string
    helpStat1: string
    helpStat2: string
    helpStat3: string
    helpStat4: string
    helpStat5: string
    helpStat6: string
    helpStat7: string
    helpFooter: string
    panelResources: string
    panelToolbar: string
    panelBuildings: string
    panelLogs: string
    mapWorld: string
    mapGlobe: string
    mapText: string
    characterInfo: string
    factionStatus: string
    help: string
    goMain: string
    unclaimedLand: string
    noOneOccupies: string
    claim: string
    memberCount: (count: number) => string
    territoryCount: (count: number) => string
  }
  action: {
    hp: string
    attack: string
    attackDesc: string
    defend: string
    defendDesc: string
    retreat: string
    retreatDesc: string
  }
  placement: {
    title: string
    subtitle: string
    enemyPreview: string
    confirm: string
  }
  battle: {
    row: {
      front: string
      middle: string
      rear: string
    }
    defeated: string
    turn: (turn: number) => string
  }
  dialog: {
    queueCount: (count: number) => string
    manualHint: string
  }
  result: {
    badgeVictory: string
    badgeDefeat: string
    badgeTimeout: string
    titleVictory: string
    titleDefeat: string
    titleTimeout: string
    descriptionVictory: (leaderName: string) => string
    descriptionDefeat: string
    descriptionTimeout: string
    elapsed: string
    people: string
    territories: string
    difficulty: string
    restart: string
    difficultyLabel: Record<'easy' | 'normal' | 'hard', string>
  }
  disposition: {
    action: Record<DispositionAction, { label: string; desc: string }>
    recruitSuccess: (name: string) => string
    recruitFail: (name: string) => string
    genericResult: (name: string, action: DispositionAction) => string
    summaryTitle: string
    summaryResult: Record<DispositionAction, { success?: string; failure?: string; plain: string }>
    back: string
    title: string
    loyaltyValue: string
    loyaltyVirtue: string
    recruitRate: string
  }
  map: {
    move: string
    unclaimed: string
    ally: string
    current: string
    territory: string
    continent: string
    buildings: (count: number) => string
    legend: string
    myTerritory: string
    otherTerritory: string
    zoomIn: string
    zoomOut: string
    reset: string
    controls: string
  }
}

const TEXT: Record<Locale, SuikodenText> = {
  ko: {
    common: {
      confirm: '확인',
      close: '닫기',
      cancel: '취소',
    },
    game: {
      loading: '데이터 로딩 중...',
      characterCount: (count) => `${count}명의 인물`,
    },
    hud: {
      season: {
        spring: '봄',
        summer: '여름',
        autumn: '가을',
        winter: '겨울',
      },
      turn: (turn) => `턴 ${turn}`,
      people: (count) => `인원 ${count}`,
      territories: (count) => `영토 ${count}`,
      fame: (value) => `명성 ${value}/1000`,
    },
    toolbar: {
      nextTurn: '다음 턴 ▶',
      returnHome: '본진 복귀',
      autoOn: '자동ON',
      autoOff: '자동OFF',
      dialogAuto: '대화auto',
      dialogManual: '대화manual',
      develop: '내정',
      military: '군사',
      diplomacy: '외교',
      misc: '기타',
      tax: '세율',
      taxLow: '낮음',
      taxNormal: '보통',
      taxHigh: '높음',
      buildingStatus: '건물 현황',
      buildingCount: (count) => `${count}동`,
      buildingConstructing: (count) => `(${count} 건설 중)`,
      noBuildings: '건물 없음',
      invade: '침공',
      ally: '아군',
      claim: '점령',
      noAdjacentTerritories: '인접 영토 없음',
      allied: '동맹',
      friendly: (value) => `우호 ${value}`,
      hostile: (value) => `적대 ${value}`,
      neutral: '중립',
      alliance: '동맹 (금200)',
      ceasefire: '정전 (금100)',
      tribute: '조공',
      surrender: '항복',
      noOtherFactions: '다른 세력 없음',
      abandonHint: (companionMax) => `세력을 해산하고 방랑길에 오른다. 동료 최대 ${companionMax}명, 금 최대 200만 가져갈 수 있다.`,
      abandon: '거병 포기',
      abandonConfirm: '정말 세력을 해산하겠는가?',
      abandonExecute: '해산한다',
      viewingForeignTerritory: '다른 세력의 영토를 살펴보고 있다',
      unclaimedTerritory: (territory) => `${territory} — 무주지`,
    },
    strategy: {
      assignRecruiter: '등용 인물을 할당했다. 다음 턴에 판정.',
      cannotReachTerritory: '현재 거점과 이어진 영토만 공격하거나 점령할 수 있다.',
      noDeployableUnits: '이 거점에 대기 중인 출진 가능 인물이 없다.',
      helpTitle: '천도 — 턴제 전략',
      helpTurnLabel: '턴제',
      helpTurnDesc: "'다음 턴' 버튼으로 10일씩 진행. 건설·자원·AI가 매 턴 처리된다.",
      helpBuildTitle: '건설',
      helpBuildDesc: '인물 선택 → 건물 그리드에서 + 버튼 → 건물 선택. 건설 완료 시 자동 근무.',
      helpAssignTitle: '배치',
      helpAssignDesc: "인물 선택 → 빈 건물 카드의 '배치' 클릭. 근무자가 있으면 생산 1.5배.",
      helpBattleTitle: '전투',
      helpBattleDesc: '군사 메뉴에서 인접 적 영토를 침공한다. 전투에서는 인물마다 차례대로 공격·방어·고유 기술을 선택한다.',
      helpDiplomacyTitle: '외교',
      helpDiplomacyDesc: '외교 탭에서 동맹/정전/조공/항복 등 외교 행동.',
      helpStatsTitle: '인물 능력 (0~100)',
      helpStat1: '통솔 — 조직과 군대를 이끄는 힘. 방어와 부대 생존력에 영향',
      helpStat2: '무력 — 일반 공격·돌격·일기토의 위력. 연병장 건설 조건',
      helpStat3: '지력 — 혼란·화공 등 계략의 위력과 저항. 학당 건설 조건',
      helpStat4: '매력 — 인재 등용·외교·민심에 영향',
      helpStat5: '충의 — 포로 등용 저항과 관계에 대한 헌신',
      helpStat6: '인자 — 치유·사원 건설·민심에 영향',
      helpStat7: '용기 — 돌격·기습·순찰에 영향',
      helpFooter: '훈련으로 통솔·무력·지력을 높일 수 있다. 자세한 설명은 인물 상세의 능력 탭에서 확인한다.',
      panelResources: '자원 현황',
      panelToolbar: '명령 도구바',
      panelBuildings: '건물 배치',
      panelLogs: '이벤트 로그',
      mapWorld: '세계 지도',
      mapGlobe: '3D 지구',
      mapText: '텍스트',
      characterInfo: '인물 상세',
      factionStatus: '세력 현황',
      help: '도움말',
      goMain: '본화면으로',
      unclaimedLand: '무주지',
      noOneOccupies: '아무도 점령하지 않은 땅이다.',
      claim: '점령',
      memberCount: (count) => `${count}명`,
      territoryCount: (count) => `${count}`,
    },
    action: {
      hp: 'HP',
      attack: '공격',
      attackDesc: '물리 대미지',
      defend: '방어',
      defendDesc: '피해 50% 감소',
      retreat: '후퇴',
      retreatDesc: '전장 이탈',
    },
    placement: {
      title: '부대 배치',
      subtitle: '유닛을 클릭하여 위치를 변경하세요',
      enemyPreview: '적군 배치',
      confirm: '전투 개시',
    },
    battle: {
      row: {
        front: '전열',
        middle: '중열',
        rear: '후열',
      },
      defeated: '격파',
      turn: (turn) => `턴 ${turn}`,
    },
    dialog: {
      queueCount: (count) => `+${count}개 대기`,
      manualHint: 'Space / Enter / ✕',
    },
    result: {
      badgeVictory: '[통일]',
      badgeDefeat: '[패망]',
      badgeTimeout: '[시간초과]',
      titleVictory: '통일 달성!',
      titleDefeat: '패배...',
      titleTimeout: '시간 초과',
      descriptionVictory: (leaderName) => `${leaderName}이(가) 천하를 통일했다.`,
      descriptionDefeat: '세력이 무너졌다.',
      descriptionTimeout: '제한 턴 내에 통일하지 못했다. 역사의 뒤안길로...',
      elapsed: '경과',
      people: '인재 수',
      territories: '영토 수',
      difficulty: '난이도',
      restart: '다시 시작',
      difficultyLabel: {
        easy: '쉬움',
        normal: '보통',
        hard: '어려움',
      },
    },
    disposition: {
      action: {
        recruit: { label: '등용', desc: '세력에 합류시킨다' },
        imprison: { label: '포로', desc: '포로로 가둔다' },
        execute: { label: '처형', desc: '처형한다 (명성 -30)' },
        release: { label: '해방', desc: '풀어준다 (명성 +10)' },
      },
      recruitSuccess: (name) => `${name} 등용 성공!`,
      recruitFail: (name) => `${name}이(가) 거절했다.`,
      genericResult: (name, action) => `${name}을(를) ${{
        imprison: '포로로 잡았다',
        execute: '처형했다',
        release: '풀어주었다',
        recruit: '등용했다',
      }[action]}.`,
      summaryTitle: '처분 결과',
      summaryResult: {
        recruit: { success: '등용 성공', failure: '등용 거절', plain: '등용' },
        imprison: { plain: '포로' },
        execute: { plain: '처형' },
        release: { plain: '해방' },
      },
      back: '돌아가기',
      title: '포로 처분',
      loyaltyValue: '충성도',
      loyaltyVirtue: '충의',
      recruitRate: '등용 성공률',
    },
    map: {
      move: '이동 →',
      unclaimed: '무주지',
      ally: '아군',
      current: '현재',
      territory: '거점',
      continent: '대륙',
      buildings: (count) => `건물 ${count}`,
      legend: '범례',
      myTerritory: '내 영토',
      otherTerritory: '타 세력 / 미점령',
      zoomIn: '확대',
      zoomOut: '축소',
      reset: '초기화',
      controls: '드래그: 회전 · 휠: 줌',
    },
  },
  en: {
    common: {
      confirm: 'Confirm',
      close: 'Close',
      cancel: 'Cancel',
    },
    game: {
      loading: 'Loading data...',
      characterCount: (count) => `${count} characters`,
    },
    hud: {
      season: {
        spring: 'Spring',
        summer: 'Summer',
        autumn: 'Autumn',
        winter: 'Winter',
      },
      turn: (turn) => `Turn ${turn}`,
      people: (count) => `Talents ${count}`,
      territories: (count) => `Territories ${count}`,
      fame: (value) => `Fame ${value}/1000`,
    },
    toolbar: {
      nextTurn: 'Next Turn ▶',
      returnHome: 'Return Home',
      autoOn: 'Auto ON',
      autoOff: 'Auto OFF',
      dialogAuto: 'Dialog Auto',
      dialogManual: 'Dialog Manual',
      develop: 'Develop',
      military: 'Military',
      diplomacy: 'Diplomacy',
      misc: 'Misc',
      tax: 'Tax Rate',
      taxLow: 'Low',
      taxNormal: 'Normal',
      taxHigh: 'High',
      buildingStatus: 'Buildings',
      buildingCount: (count) => `${count}`,
      buildingConstructing: (count) => `(${count} building)`,
      noBuildings: 'No buildings',
      invade: 'Invade',
      ally: 'Allied',
      claim: 'Claim',
      noAdjacentTerritories: 'No adjacent territories',
      allied: 'Alliance',
      friendly: (value) => `Friendly ${value}`,
      hostile: (value) => `Hostile ${value}`,
      neutral: 'Neutral',
      alliance: 'Alliance (200g)',
      ceasefire: 'Ceasefire (100g)',
      tribute: 'Tribute',
      surrender: 'Surrender',
      noOtherFactions: 'No rival factions',
      abandonHint: (companionMax) => `Disband your faction and return to wandering. You may keep up to ${companionMax} companions and at most 200 gold.`,
      abandon: 'Abandon Uprising',
      abandonConfirm: 'Disband this faction?',
      abandonExecute: 'Disband',
      viewingForeignTerritory: 'Viewing another faction territory',
      unclaimedTerritory: (territory) => `${territory} — Unclaimed`,
    },
    strategy: {
      assignRecruiter: 'Assigned a recruiter. The attempt resolves next turn.',
      cannotReachTerritory: 'You can only invade or claim a territory connected to the current stronghold.',
      noDeployableUnits: 'No idle, battle-ready figures are stationed at this stronghold.',
      helpTitle: 'Cheondo — Turn-Based Strategy',
      helpTurnLabel: 'Turn-Based',
      helpTurnDesc: "Advance 10 days with the 'Next Turn' button. Construction, resources, and AI all resolve each turn.",
      helpBuildTitle: 'Construction',
      helpBuildDesc: 'Select a character, press + on the building grid, then choose a structure. Completed buildings automatically begin operating.',
      helpAssignTitle: 'Assignment',
      helpAssignDesc: 'Select a character, then assign them to an empty building slot. Staffed buildings run at 1.5x output.',
      helpBattleTitle: 'Battle',
      helpBattleDesc: 'Invade a neighboring enemy territory from the military menu. Each figure acts in turn and chooses attacks, defense, or a unique skill.',
      helpDiplomacyTitle: 'Diplomacy',
      helpDiplomacyDesc: 'Use the diplomacy tab for alliances, ceasefires, tribute, and surrender demands.',
      helpStatsTitle: 'Character Stats (0-100)',
      helpStat1: 'Command — Leadership of armies and organizations; improves defense and unit durability.',
      helpStat2: 'Martial — Power of attacks, charges, and duels; required for training grounds.',
      helpStat3: 'Intellect — Power and resistance for confusion and fire tactics; required for academies.',
      helpStat4: 'Charm — Influences recruitment, diplomacy, and public order.',
      helpStat5: 'Loyalty — Resistance to recruitment and devotion to relationships.',
      helpStat6: 'Benevolence — Supports healing, temples, and public order.',
      helpStat7: 'Courage — Supports charges, ambushes, and patrols.',
      helpFooter: 'Training can raise Command, Martial, and Intellect. See the Ability tab for full descriptions.',
      panelResources: 'Resources',
      panelToolbar: 'Command Bar',
      panelBuildings: 'Building Layout',
      panelLogs: 'Event Log',
      mapWorld: 'World Map',
      mapGlobe: '3D Globe',
      mapText: 'Text',
      characterInfo: 'Character Info',
      factionStatus: 'Faction Status',
      help: 'Help',
      goMain: 'Back Home',
      unclaimedLand: 'Unclaimed',
      noOneOccupies: 'No one holds this land.',
      claim: 'Claim',
      memberCount: (count) => `${count}`,
      territoryCount: (count) => `${count}`,
    },
    action: {
      hp: 'HP',
      attack: 'Attack',
      attackDesc: 'Physical damage',
      defend: 'Defend',
      defendDesc: 'Reduce damage by 50%',
      retreat: 'Retreat',
      retreatDesc: 'Leave the battlefield',
    },
    placement: {
      title: 'Formation',
      subtitle: 'Click a unit to change its position',
      enemyPreview: 'Enemy Formation',
      confirm: 'Begin Battle',
    },
    battle: {
      row: {
        front: 'Front',
        middle: 'Middle',
        rear: 'Rear',
      },
      defeated: 'Defeated',
      turn: (turn) => `Turn ${turn}`,
    },
    dialog: {
      queueCount: (count) => `+${count} queued`,
      manualHint: 'Space / Enter / ✕',
    },
    result: {
      badgeVictory: '[Unified]',
      badgeDefeat: '[Defeated]',
      badgeTimeout: '[Time Up]',
      titleVictory: 'Unification Achieved!',
      titleDefeat: 'Defeat...',
      titleTimeout: 'Time Up',
      descriptionVictory: (leaderName) => `${leaderName} unified the realm.`,
      descriptionDefeat: 'Your faction has fallen.',
      descriptionTimeout: 'You failed to unify the realm before the turn limit.',
      elapsed: 'Elapsed',
      people: 'Talents',
      territories: 'Territories',
      difficulty: 'Difficulty',
      restart: 'Restart',
      difficultyLabel: {
        easy: 'Easy',
        normal: 'Normal',
        hard: 'Hard',
      },
    },
    disposition: {
      action: {
        recruit: { label: 'Recruit', desc: 'Bring them into your faction' },
        imprison: { label: 'Imprison', desc: 'Keep them as a prisoner' },
        execute: { label: 'Execute', desc: 'Execute them (Fame -30)' },
        release: { label: 'Release', desc: 'Set them free (Fame +10)' },
      },
      recruitSuccess: (name) => `${name} joined your cause!`,
      recruitFail: (name) => `${name} refused.`,
      genericResult: (name, action) => `${name} ${{
        imprison: 'was imprisoned',
        execute: 'was executed',
        release: 'was released',
        recruit: 'was recruited',
      }[action]}.`,
      summaryTitle: 'Disposition Summary',
      summaryResult: {
        recruit: { success: 'Recruited', failure: 'Refused', plain: 'Recruit' },
        imprison: { plain: 'Imprisoned' },
        execute: { plain: 'Executed' },
        release: { plain: 'Released' },
      },
      back: 'Return',
      title: 'Prisoner Disposition',
      loyaltyValue: 'Loyalty',
      loyaltyVirtue: 'Virtue',
      recruitRate: 'Recruit Rate',
    },
    map: {
      move: 'Move →',
      unclaimed: 'Unclaimed',
      ally: 'Ally',
      current: 'Current',
      territory: 'Territory',
      continent: 'Continent',
      buildings: (count) => `Buildings ${count}`,
      legend: 'Legend',
      myTerritory: 'My Territories',
      otherTerritory: 'Other / Unclaimed',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      reset: 'Reset',
      controls: 'Drag: rotate · Wheel: zoom',
    },
  },
}

const TERRITORY_ID_BY_NAME = new Map<string, TerritoryId>(
  TERRITORIES.map((territory) => [territory.name, territory.id]),
)

const REGION_ID_BY_NAME = new Map<string, RegionId>(
  REGIONS.map((region) => [region.name, region.id]),
)

function localizeTerritoryName(name: string, translateTerritory?: (id: TerritoryId) => string): string {
  const territoryId = TERRITORY_ID_BY_NAME.get(name)
  return territoryId && translateTerritory ? translateTerritory(territoryId) : name
}

function localizeRegionName(name: string, translateRegion?: (id: RegionId) => string): string {
  const regionId = REGION_ID_BY_NAME.get(name)
  return regionId && translateRegion ? translateRegion(regionId) : name
}

export function getSuikodenText(locale: string): SuikodenText {
  return TEXT[resolveLocale(locale)]
}

export function stripSuikodenFactionSuffix(name: string): string {
  return name.replace(/의 세력$/, '').trim()
}

export function formatSuikodenDate(year: number, month: number, day: number, locale: string): string {
  if (resolveLocale(locale) === 'en') {
    return `${year}.${month}.${day}`
  }
  return `${year}년 ${month}월 ${day}일`
}

export function formatSuikodenElapsed(year: number, month: number, locale: string): string {
  const elapsedYears = year - 1002
  if (resolveLocale(locale) === 'en') {
    return `${elapsedYears}y ${month}m`
  }
  return `${elapsedYears}년 ${month}월`
}

export function translateSuikodenMessage(
  message: string,
  locale: string,
  options?: {
    translateTerritory?: (id: TerritoryId) => string
    translateRegion?: (id: RegionId) => string
  },
): string {
  if (resolveLocale(locale) !== 'en') return message

  if (message === '금화가 부족하다.') return 'Not enough gold.'
  if (message === '대상 세력을 찾을 수 없다.') return 'Target faction not found.'
  if (message === '상대 전력이 아직 높다. (30% 이하일 때 가능)') return 'Their military power is still too high. (Available only at 30% or less)'

  let match = message.match(/^(.+?)의 (.+?)에 침공!$/)
  if (match) {
    return `${stripSuikodenFactionSuffix(match[1])} invades ${localizeTerritoryName(match[2], options?.translateTerritory)}!`
  }

  match = message.match(/^(.+?)을\(를\) 점령했다! \(명성 \+(\d+)\)$/)
  if (match) {
    return `Captured ${localizeTerritoryName(match[1], options?.translateTerritory)}! (Fame +${match[2]})`
  }

  match = message.match(/^(.+?)과 동맹 체결! \(명성 \+(\d+)\)$/)
  if (match) {
    return `Alliance forged with ${stripSuikodenFactionSuffix(match[1])}! (Fame +${match[2]})`
  }

  match = message.match(/^(.+?)이 동맹을 거부했다\.$/)
  if (match) {
    return `${stripSuikodenFactionSuffix(match[1])} refused the alliance.`
  }

  match = message.match(/^(.+?)과 정전 협정! \(명성 \+(\d+)\)$/)
  if (match) {
    return `Ceasefire signed with ${stripSuikodenFactionSuffix(match[1])}! (Fame +${match[2]})`
  }

  match = message.match(/^(.+?)이 정전을 거부했다\.$/)
  if (match) {
    return `${stripSuikodenFactionSuffix(match[1])} refused the ceasefire.`
  }

  match = message.match(/^(.+?)에 금 (\d+) 조공$/)
  if (match) {
    return `Sent ${match[2]} gold in tribute to ${stripSuikodenFactionSuffix(match[1])}.`
  }

  match = message.match(/^(.+?)이 항복을 거부했다\.$/)
  if (match) {
    return `${stripSuikodenFactionSuffix(match[1])} refused to surrender.`
  }

  match = message.match(/^(.+?)이 항복했다! 영토와 인재를 흡수\. \(명성 \+(\d+)\)$/)
  if (match) {
    return `${stripSuikodenFactionSuffix(match[1])} surrendered! Territories and talents absorbed. (Fame +${match[2]})`
  }

  match = message.match(/^(.+?)과 동맹을 체결했다!$/)
  if (match) {
    return `Alliance formed with ${stripSuikodenFactionSuffix(match[1])}!`
  }

  match = message.match(/^(.+?)이 거부했다\. \(성공률 (\d+)%\)$/)
  if (match) {
    return `${stripSuikodenFactionSuffix(match[1])} refused. (Success rate ${match[2]}%)`
  }

  match = message.match(/^(.+?)과 정전 협정을 맺었다!$/)
  if (match) {
    return `Ceasefire signed with ${stripSuikodenFactionSuffix(match[1])}!`
  }

  match = message.match(/^(.+?)이 거부했다\.$/)
  if (match) {
    return `${stripSuikodenFactionSuffix(match[1])} refused.`
  }

  match = message.match(/^(.+?)에 금 (\d+)을 보냈다\. \(관계 \+(\d+)\)$/)
  if (match) {
    return `Sent ${match[2]} gold to ${stripSuikodenFactionSuffix(match[1])}. (Relations +${match[3]})`
  }

  match = message.match(/^(.+?)이 항복했다! \(명성 \+(\d+)\)$/)
  if (match) {
    return `${stripSuikodenFactionSuffix(match[1])} surrendered! (Fame +${match[2]})`
  }

  match = message.match(/^(.+)】$/)
  if (match) {
    return `【${localizeRegionName(match[1], options?.translateRegion)}】`
  }

  return message
}

export function translateSuikodenBattleLog(message: string, locale: string): string {
  if (resolveLocale(locale) !== 'en') return message

  const rowText = TEXT.en.battle.row

  if (message === '전투 개시!') return 'Battle begins!'
  if (message === '공격측 승리!') return 'Attacker victory!'
  if (message === '방어측 승리!') return 'Defender victory!'
  if (message === '무승부. 양측 퇴각.') return 'Draw. Both sides withdraw.'

  let match = message.match(/^(.+?)은\(는\) 혼란 상태로 행동 불가!$/)
  if (match) return `${match[1]} is confused and cannot act!`

  match = message.match(/^(.+?)이\(가\) (.+?)에게 (\d+) 피해!$/)
  if (match) return `${match[1]} deals ${match[3]} damage to ${match[2]}!`

  match = message.match(/^(.+?)이\(가\) 방어 태세!$/)
  if (match) return `${match[1]} braces for defense!`

  match = message.match(/^(.+?)이\(가\) 후퇴했다\.$/)
  if (match) return `${match[1]} retreated.`

  match = message.match(/^(.+?)의 돌격! (.+?)에게 (\d+) 피해! \(자상 (\d+)\)$/)
  if (match) return `${match[1]} charges! ${match[2]} takes ${match[3]} damage. (${match[1]} suffers ${match[4]})`

  match = message.match(/^(.+?)의 혼란! (.+?) 행동 불가!$/)
  if (match) return `${match[1]} confuses ${match[2]}! ${match[2]} cannot act!`

  match = message.match(/^(.+?)의 혼란이 (.+?)에게 통하지 않았다!$/)
  if (match) return `${match[1]}'s confusion failed on ${match[2]}!`

  match = message.match(/^(.+?)의 화공! (전열|중열|후열)에 (\d+) 피해!$/)
  if (match) {
    const row = match[2] === '전열' ? rowText.front : match[2] === '중열' ? rowText.middle : rowText.rear
    return `${match[1]} unleashes fire attack! ${row} row takes ${match[3]} damage!`
  }

  match = message.match(/^(.+?)의 치유! (.+?) HP \+(\d+)!$/)
  if (match) return `${match[1]} heals ${match[2]} for +${match[3]} HP!`

  match = message.match(/^(.+?)의 결계! (.+?) 1턴 무적!$/)
  if (match) return `${match[1]} shields ${match[2]} for 1 turn!`

  match = message.match(/^(.+?)의 철벽! (.+?) 방어력 상승!$/)
  if (match) return `${match[1]} fortifies ${match[2]}! Defense rises!`

  match = message.match(/^(.+?)의 외교 위협! 적 사기 -15!$/)
  if (match) return `${match[1]} uses diplomatic pressure! Enemy morale -15!`

  match = message.match(/^(.+?)의 고무! 아군 사기 \+10!$/)
  if (match) return `${match[1]} rallies the army! Ally morale +10!`

  match = message.match(/^(.+?)의 문화 감화! 적 사기 -15!$/)
  if (match) return `${match[1]} sways the foe with culture! Enemy morale -15!`

  match = message.match(/^(.+?)의 기습! (.+?)에게 (\d+) 피해!$/)
  if (match) return `${match[1]} ambushes ${match[2]} for ${match[3]} damage!`

  match = message.match(/^(.+?)이\(가\) 적 전열에 함정을 설치했다!$/)
  if (match) return `${match[1]} traps the enemy front row!`

  match = message.match(/^(.+?)이\(가\) 함정에 걸려 (\d+) 피해!$/)
  if (match) return `${match[1]} triggers a trap and takes ${match[2]} damage!`

  match = message.match(/^(.+?)의 공성 강타! (.+?)에게 (\d+) 피해!$/)
  if (match) return `${match[1]} lands a siege strike on ${match[2]} for ${match[3]} damage!`

  match = message.match(/^(.+?)이\(가\) 매복을 탐지해 함정 (\d+)개를 해제했다!$/)
  if (match) return `${match[1]} detects the ambush and removes ${match[2]} trap(s)!`

  match = message.match(/^(.+?)이\(가\) 매복을 탐지했지만 함정이 없었다\.$/)
  if (match) return `${match[1]} searches for an ambush, but finds no traps.`

  match = message.match(/^(.+?)의 일기토! (.+?)에게 (\d+) 피해, 반격 (\d+) 피해!$/)
  if (match) return `${match[1]} duels ${match[2]} for ${match[3]} damage and takes ${match[4]} in return!`

  match = message.match(/^(.+?) 쓰러졌다!$/)
  if (match) return `${match[1]} has fallen!`

  return message
}
