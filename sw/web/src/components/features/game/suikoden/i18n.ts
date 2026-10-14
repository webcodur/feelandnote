import type { Locale } from '@/types/locale'
import type { BattleState, LogEntry } from '@/lib/game/suikoden/types'
export type { Locale }
export type NameLookup = { hero: (id: string) => string; territory: (id: string) => string; faction: (id: string) => string }
export const resolveLocale = (locale: string): Locale => locale.startsWith('en') ? 'en' : 'ko'
export const num = (locale: Locale, value: number | string): string => typeof value === 'string' ? value : new Intl.NumberFormat(locale).format(Math.round(value))

export function getText(locale: Locale) {
  const t = (ko: string, en: string) => locale === 'en' ? en : ko
  const n = (value: number | string) => num(locale, value)
  const classes = { general: t('무장', 'General'), saint: t('성인', 'Healer'), strategist: t('책사', 'Strategist'), official: t('관리', 'Administrator'), artist: t('예인', 'Artist'), artisan: t('장인', 'Artisan'), ranger: t('협객', 'Ranger') }
  const buildings = { farmland: t('농장', 'Farmland'), market: t('시장', 'Market'), barracks: t('병영', 'Barracks'), academy: t('학당', 'Academy'), temple: t('사원', 'Temple'), theater: t('극장', 'Theater'), fortress: t('성채', 'Fortress'), tavern: t('주막', 'Tavern'), shipyard: t('조선소', 'Shipyard') }
  const tasks = { farm: t('농업', 'Farming'), commerce: t('상업', 'Commerce'), walls: t('수축', 'Fortification'), relief: t('구휼', 'Relief'), conscript: t('징병', 'Conscription'), train: t('훈련', 'Training'), subdue: t('토벌', 'Suppression'), search: t('탐색', 'Search'), recruit: t('등용', 'Recruitment'), move: t('이동', 'Travel'), build: t('건설', 'Construction'), battle: t('출진', 'Battle'), diplomacy: t('외교', 'Diplomacy') }
  const errors: Record<string, string> = {
    default: t('명령을 실행하지 못했습니다. 현재 상태를 확인해 주세요.', 'The command could not be completed. Check the current situation.'),
    no_faction: t('거병한 뒤에 명령할 수 있습니다.', 'Raise your banner before issuing orders.'),
    not_enough_gold: t('금이 부족합니다.', 'Not enough gold.'), not_enough_food: t('군량이 부족합니다.', 'Not enough provisions.'),
    fame_low: t('명성이 부족합니다.', 'Your fame is too low.'), not_adjacent: t('이웃한 영토를 골라 주세요.', 'Choose a neighboring territory.'),
    target_cooldown: t('이 인물은 당분간 다시 설득할 수 없습니다.', 'This person needs time before another approach.'),
    already_acted: t('이번 달 명령을 이미 마쳤습니다.', 'This officer has already acted this month.'),
    dev_max: t('이미 개발 한도에 도달했습니다.', 'Development has reached its limit.'),
    no_units: t('출진할 수 있는 부대가 없습니다.', 'No troops are ready to deploy.'),
    need_shipyard: t('해로로 출진하려면 조선소가 필요합니다.', 'A shipyard is required for a naval sortie.'),
  }
  return {
    appName: t('천도', 'Cheondo'), appEn: 'Winds of Liangshan', tagline: t('인연을 모아 천하를 이끌다', 'Gather companions. Shape the realm.'),
    exit: t('나가기', 'Exit'), back: t('뒤로', 'Back'), cancel: t('취소', 'Cancel'), close: t('닫기', 'Close'), ok: t('확인', 'Confirm'),
    menu: t('메뉴', 'Menu'), resume: t('계속하기', 'Resume'), toTitle: t('제목 화면', 'Title screen'), loading: t('인물 명부를 불러오는 중', 'Loading the roster'), retry: t('다시 시도', 'Retry'),
    loadFailed: t('인물 명부를 불러오지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.', 'The roster could not be loaded. Check your connection and try again.'),
    saved: t('자동 저장', 'Autosaved'), saveWarn: t('저장하지 못했습니다. 창을 닫으면 진행이 사라질 수 있습니다.', 'Saving failed. Progress may be lost when you close this window.'),
    neutral: t('재야', 'Independent'), ours: t('아군', 'Ours'), faction: (name: string) => t(`${name}군`, `${name}'s faction`),
    rosterCount: (count: number | string) => t(`${n(count)}명의 인물이 기다립니다`, `${n(count)} people await`),
    date: (year: number, month: number) => t(`${year}년 ${month}월`, `${year} / ${month}`),
    seasons: { spring: t('봄', 'Spring'), summer: t('여름', 'Summer'), autumn: t('가을', 'Autumn'), winter: t('겨울', 'Winter') },
    difficulty: { easy: t('쉬움', 'Easy'), normal: t('보통', 'Normal'), hard: t('어려움', 'Hard') },
    eras: { early: t('근세', 'Early modern'), contemporary: t('현대', 'Contemporary'), ancient: t('고대', 'Ancient'), medieval: t('중세', 'Medieval'), modern: t('근현대', 'Modern'), unknown: t('미상', 'Unknown') },
    abilities: { command: t('통솔', 'Command'), martial: t('무력', 'Might'), intellect: t('지력', 'Intellect'), charm: t('매력', 'Charm') },
    abilityShort: { command: t('통', 'Cmd'), martial: t('무', 'Mgt'), intellect: t('지', 'Int'), charm: t('매', 'Cha') },
    virtues: { temperance: t('절제', 'Temperance'), diligence: t('근면', 'Diligence'), reflection: t('성찰', 'Reflection'), courage: t('용기', 'Courage'), loyalty: t('충의', 'Loyalty'), benevolence: t('인애', 'Benevolence'), fairness: t('공정', 'Fairness'), humility: t('겸양', 'Humility') },
    dispositions: { pessimism_optimism: [t('비관', 'Pessimism'), t('낙관', 'Optimism')], conservative_progressive: [t('보수', 'Conservative'), t('진보', 'Progressive')], individual_social: [t('개인', 'Individual'), t('공동체', 'Social')], cautious_bold: [t('신중', 'Cautious'), t('대담', 'Bold')] },
    classes, buildings, fameRanks: [t('무명', 'Unknown'), t('입문', 'Emerging'), t('유명', 'Known'), t('명망', 'Renowned'), t('위명', 'Celebrated'), t('영웅', 'Heroic'), t('전설', 'Legendary')],
    classDesc: { general: t('전열에서 돌격하는 지휘관', 'A commander who leads the front line'), saint: t('아군의 병력을 회복하는 치유자', 'A healer who restores allied troops'), strategist: t('지력으로 적의 진형을 흔드는 책사', 'A tactician who disrupts enemy formations'), official: t('방어와 내정에 능한 관리', 'An administrator skilled in defense and development'), artist: t('아군의 사기를 북돋는 예인', 'An artist who inspires allied morale'), artisan: t('공성에 능한 기술자', 'An engineer skilled in siege warfare'), ranger: t('후열에서도 적을 겨누는 협객', 'A ranger who can strike from the rear') },
    title: {
      continue: t('이어하기', 'Continue'), continueSub: (name: string, date: string, lands: number) => `${name} · ${date} · ${t(`영토 ${lands}`, `${lands} ${lands === 1 ? 'territory' : 'territories'}`)}`,
      newGame: t('새로운 천하', 'New realm'), newGameSub: t('주군을 고르고 강호로 떠납니다', 'Choose a lord and begin your journey'),
      codex: t('성도', 'Constellation'), codexSub: t('만나고 함께한 인물들의 기록', 'The people you have met and recruited'),
      howTo: t('길잡이', 'How to play'), howToSub: t('방랑에서 천하 통일까지', 'From wandering to unification'), exitSub: t('쉼터로 돌아갑니다', 'Return to the rest area'),
      overwrite: t('새 판을 시작하면 이전 자동 저장을 덮어씁니다. 새로 시작할까요?', 'Starting a new game will replace the previous autosave. Start anew?'), overwriteYes: t('새로 시작', 'Start anew'),
    },
    select: {
      title: t('주군을 고르세요', 'Choose your lord'), subtitle: (count: string) => t(`${count}명의 인물 중, 누구와 천하를 시작할까요?`, `Who among ${count} people will lead your journey?`),
      all: t('전체', 'All'), cls: t('병과', 'Class'), grade: t('등급', 'Grade'), era: t('시대', 'Era'), region: t('지역', 'Region'),
      search: t('이름으로 찾기', 'Search by name'), featured: t('주목할 인물', 'Featured people'), random: t('무작위 선택', 'Random'), picked: t('선택한 주군', 'Selected lord'),
      difficulty: t('난이도', 'Difficulty'), start: t('강호로 떠나기', 'Begin your journey'), empty: t('조건에 맞는 인물이 없습니다.', 'No people match these filters.'),
      count: (count: number | string) => t(`${n(count)}명`, `${n(count)} people`), home: t('고향', 'Home'), natives: (count: number) => t(`고향 인물 ${n(count)}명`, `${n(count)} local people`),
      derived: t('직군과 지명도를 바탕으로 산출한 게임 능력치입니다.', 'These game stats are derived from profession and renown.'),
      real: t('실존', 'Historical'), fiction: t('허구', 'Fictional'), sort: t('정렬', 'Sort'), sortGrade: t('능력순', 'Ability'), sortName: t('이름순', 'Name'), sortRenown: t('지명도순', 'Renown'),
      startFame: t('시작 명성', 'Starting fame'), diffDesc: (factions: number, years: number) => t(`경쟁 세력 ${factions}개 · 제한 ${years}년`, `${factions} rival factions · ${years}-year limit`),
    },
    hud: {
      gold: t('금', 'Gold'), food: t('군량', 'Provisions'), fame: t('명성', 'Fame'), lands: t('영토', 'Territories'), officers: t('인재', 'Officers'), wander: t('방랑 중', 'Wandering'),
      roster: t('인재 명부', 'Roster'), diplomacy: t('외교', 'Diplomacy'), chronicle: t('연대기', 'Chronicle'), endTurn: t('다음 달', 'Next month'),
      idle: (count: number) => t(`명령 대기 ${n(count)}명`, `${n(count)} ${count === 1 ? 'officer' : 'officers'} ready`), pending: (count: number) => t(`미결 사건 ${count}건`, `${count} unresolved events`),
      resolveFirst: t('사건을 먼저 처리하세요', 'Resolve pending events first'), toMonth: (month: number) => t(`${month}월로`, `To month ${month}`),
      limit: (months: number) => t(`${months}개월 남음`, `${months} months left`), foodLeft: (months: number) => t(`군량 약 ${months}개월분`, `About ${months} months of provisions`), foodLeftShort: (months: number) => `${months}${t('개월', ' mo')}`,
      foodWarn: t('군량과 금이 바닥나면 병사가 흩어집니다.', 'Troops will desert when provisions and gold run out.'),
      foodBuying: (gold: number | string) => t(`부족한 군량을 매달 금 ${n(gold)}으로 구매`, `Buying provisions for ${n(gold)} gold each month`), foodBuyingShort: (gold: string) => t(`군량 -${gold}금/월`, `Food -${gold} gold/mo`), foodBuyingWarn: t('군량 부족분은 금으로 사들이고 있습니다.', 'Gold is being used to cover the food shortage.'),
    },
    territory: {
      population: t('인구', 'Population'), farm: t('농업', 'Farming'), commerce: t('상업', 'Commerce'), walls: t('성벽', 'Walls'), order: t('민심', 'Public order'),
      governor: t('태수', 'Governor'), governorHint: t('이 영토의 인재 중 태수를 임명합니다.', 'Appoint a governor from officers stationed here.'),
      capital: t('도읍', 'Capital'), buildings: t('시설', 'Buildings'), emptySlot: t('빈 터', 'Empty slot'), months: (months: number) => t(`${months}개월`, `${months} months`),
      delegate: t('위임', 'Delegate'), delegateOn: t('내정 위임 중', 'Development delegated'), delegateOff: t('직접 지휘', 'Direct control'), income: t('월 수입', 'Monthly income'),
      officers: t('주둔 인재', 'Stationed officers'), noOfficers: t('주둔한 인재가 없습니다.', 'No officers are stationed here.'),
      talent: t('재야 인재', 'Local talent'), known: (found: number, all: number) => t(`발견 ${found}/${all}명`, `Discovered ${found}/${all}`), noTalent: t('새로 만날 인재가 없습니다.', 'No new people remain to meet.'), unknownTalent: t('탐색으로 인재를 찾아보세요.', 'Search for undiscovered people.'),
      nativeCount: (count: number) => t(`이 땅의 인물 ${n(count)}명`, `${n(count)} natives`), militia: t('향병', 'Militia'), defense: t('방어', 'Defense'), threat: t('위협', 'Threat'), seaOnly: t('해로', 'Sea route'), unguarded: t('방어 인재 없음', 'Unguarded'),
    },
    buildingDesc: {
      farmland: t('농업 생산을 늘립니다.', 'Increases food production.'), market: t('금 수입을 늘리고 군량 구매 비용을 줄입니다.', 'Increases gold income and reduces food purchase costs.'),
      barracks: t('병력 상한과 징병 효율을 높이고 병력을 보충합니다.', 'Increases troop capacity and conscription efficiency, and replenishes troops.'),
      academy: t('주둔 인재의 훈련도를 높입니다.', 'Improves stationed officers’ training.'), temple: t('부상을 치료하고 민심을 높입니다.', 'Heals wounds and improves public order.'),
      theater: t('명성과 민심을 높입니다.', 'Improves fame and public order.'), fortress: t('성벽을 보강합니다.', 'Reinforces the walls.'), tavern: t('인재 탐색과 방문에 도움이 됩니다.', 'Helps discover and attract people.'), shipyard: t('해로로 출진할 수 있습니다.', 'Allows sorties along sea routes.'),
    },
    commands: {
      ...tasks, reward: t('포상', 'Reward'), sortie: t('출진', 'Sortie'), governor: t('태수 임명', 'Appoint governor'), none: t('명령할 수 있는 인재가 없습니다.', 'No officers are available.'),
      pickOfficer: t('명령할 인재', 'Acting officer'), pickDest: t('목적지', 'Destination'), cost: (gold: number, food: number) => [gold ? `${t('금', 'Gold')} ${gold}` : '', food ? `${t('군량', 'Food')} ${food}` : ''].filter(Boolean).join(' · '), expect: (gain: number) => t(`예상 +${gain}`, `Expected +${gain}`), chance: (p: number) => t(`성공 ${Math.round(p * 100)}%`, `${Math.round(p * 100)}% chance`),
      groups: { develop: t('내정', 'Development'), military: t('군사', 'Military'), people: t('인재', 'Personnel') },
      desc: { reward: t('금을 내려 충성을 높입니다.', 'Spend gold to improve loyalty.'), farm: t('농업을 개발합니다.', 'Develop farming.'), commerce: t('상업을 개발합니다.', 'Develop commerce.'), walls: t('성벽을 수축합니다.', 'Fortify the walls.'), relief: t('군량을 나누어 민심을 높입니다.', 'Distribute provisions to improve public order.'), conscript: t('주민을 병사로 모집합니다.', 'Recruit local residents into the army.'), train: t('부대를 훈련합니다.', 'Train this officer’s troops.'), subdue: t('영토의 위협을 토벌합니다.', 'Suppress a local threat.'), search: t('이 땅의 인재를 찾습니다.', 'Search for local talent.'), recruit: t('발견한 인재를 설득합니다.', 'Persuade a discovered person to join.'), move: t('인재를 이웃 영토로 옮깁니다.', 'Move an officer to a neighboring territory.'), build: t('새 시설을 건설합니다.', 'Construct a new building.'), sortie: t('이웃 영토로 군을 보냅니다.', 'Send an army into a neighboring territory.') },
    },
    officer: { troops: t('병력', 'Troops'), training: t('훈련', 'Training'), loyalty: t('충성', 'Loyalty'), wound: t('부상', 'Wounds'), level: t('단계', 'Level'), ready: t('대기', 'Ready'), tasks, status: { free: t('재야', 'Independent'), lord: t('군주', 'Lord'), officer: t('소속 인재', 'Officer'), companion: t('동료', 'Companion'), prisoner: t('포로', 'Prisoner') } },
    roster: {
      title: t('인재 명부', 'Roster'), prisoners: t('포로', 'Prisoners'), empty: t('표시할 인재가 없습니다.', 'No people to display.'), sortBy: t('정렬 기준', 'Sort by'), starsView: t('성도 보기', 'Constellation view'), listView: t('목록 보기', 'List view'),
      filled: (count: number) => t(`108성 중 ${count}성`, `${count} of 108 stars`),
      col: { name: t('이름', 'Name'), cls: t('병과', 'Class'), grade: t('등급', 'Grade'), loc: t('위치', 'Location'), loyalty: t('충성', 'Loyalty'), star: t('성호', 'Star'), task: t('명령', 'Task'), troops: t('병력', 'Troops') },
    },
    sheet: { profile: t('인물 소개', 'Profile'), home: t('고향', 'Home'), location: t('현재 위치', 'Location'), faction: t('소속', 'Faction'), reality: { real: t('실존', 'Historical'), fiction: t('허구', 'Fictional'), both: t('실존·전승', 'Historical and legendary') }, alive: t('생존', 'Living'), maxTroops: t('병력 상한', 'Troop capacity'), salary: t('월 봉록', 'Monthly salary'), skill: t('전투 기술', 'Battle skill'), row: t('기본 배치', 'Formation'), virtues: t('덕목', 'Virtues'), dispositions: t('성향', 'Dispositions'), record: t('기록', 'Record'), voice: t('인사 듣기', 'Hear greeting'), quote: t('한마디', 'Quote') },
    codex: { title: t('성도', 'Constellation'), desc: t('만난 인연은 판이 끝나도 남습니다.', 'The people you meet remain in your records after a game ends.'), filterAll: t('전체', 'All'), filterMet: t('만난 인물', 'Met'), filterJoined: t('함께한 인물', 'Joined'), unknown: t('아직 만나지 않은 인물', 'Not yet met'), progress: (met: string, joined: string, total: string) => t(`만남 ${met} · 동행 ${joined} / ${total}`, `Met ${met} · Joined ${joined} / ${total}`), lordTimes: (count: number) => t(`주군으로 ${count}회`, `Lord in ${count} games`) },
    report: { title: (date: string) => t(`${date} 소식`, `${date} report`), quiet: t('큰 변화 없이 한 달이 흘렀습니다.', 'The month passed without major events.'), more: (count: number) => t(`외 ${count}건`, `${count} more`) },
    result: { unified: t('천하 통일', 'The realm united'), unifiedDesc: t('모든 땅에 하나의 깃발이 섰습니다.', 'One banner now flies over every territory.'), fallen: t('세력 패망', 'Your faction has fallen'), fallenDesc: t('마지막 영토를 잃었습니다. 새로운 인연으로 다시 시작하세요.', 'Your last territory is lost. Begin again with new companions.'), timeout: t('시대의 끝', 'An era ends'), timeoutDesc: t('주어진 시간 안에 천하를 통일하지 못했습니다.', 'The realm was not united within the time limit.'), again: t('다시 시작', 'Play again'), months: (count: number) => t(`${count}개월`, `${count} months`), stats: { lands: t('최대 영토', 'Most territories'), lost: t('패배', 'Battles lost'), recruited: t('등용', 'Recruited'), stars: t('108성', 'Stars'), turns: t('경과', 'Time elapsed'), won: t('승리', 'Battles won') } },
    howTo: { title: t('천도 길잡이', 'How to play'), steps: [
      { title: t('주군을 고르세요', 'Choose a lord'), body: t('인물의 고향에서 방랑을 시작합니다. 능력과 병과, 고향의 인재를 살펴보세요.', 'Begin wandering in your lord’s homeland. Consider their abilities, class and local talent.') },
      { title: t('인연을 모으세요', 'Gather companions'), body: t('이웃 땅을 여행하고 인물을 만나 동료로 맞이하세요. 도적과 거래, 소문도 기다립니다.', 'Travel to neighboring lands and recruit companions. Face bandits, help merchants and follow rumors.') },
      { title: t('깃발을 세우세요', 'Raise your banner'), body: t('거병하면 영토를 경영할 수 있습니다. 농업·상업과 인재 등용으로 세력을 키우세요.', 'Raise an army to govern a territory. Develop farming and commerce and recruit officers.') },
      { title: t('천하를 이끄세요', 'Unite the realm'), body: t('군량을 준비해 이웃 땅으로 출진하세요. 모든 영토를 얻으면 승리하며, 마지막 땅을 잃거나 제한 시간이 지나면 끝납니다.', 'Prepare provisions and march into neighboring lands. Win by claiming every territory; losing your last land or reaching the time limit ends the game.') },
    ] },
    threats: { bandits: t('도적', 'Bandits'), plague: t('역병', 'Plague'), flood: t('홍수', 'Flood') },
    battle: {
      attack: t('공격', 'Attack'), guard: t('방어', 'Guard'), duel: t('일기토', 'Duel'), retreat: t('후퇴', 'Retreat'), retreatConfirm: t('이 전투에서 후퇴할까요?', 'Retreat from this battle?'),
      auto: t('자동 전투', 'Auto battle'), speed: t('속도', 'Speed'), begin: t('전투 시작', 'Begin battle'), continue: t('계속', 'Continue'), victory: t('승리', 'Victory'), defeat: t('패배', 'Defeat'),
      ours: t('아군', 'Ours'), enemy: t('적군', 'Enemy'), militia: t('향병', 'Militia'), front: t('전열', 'Front'), back: t('후열', 'Rear'), morale: t('사기', 'Morale'), round: (current: number, max: number) => t(`${current}/${max}회전`, `Round ${current}/${max}`),
      turnOrder: t('행동 순서', 'Turn order'), enemyTurn: t('적군 행동 중', 'Enemy turn'), firstMove: (name: string) => t(`${name} 선공`, `${name} acts first`),
      pickTarget: t('공격할 대상을 고르세요', 'Choose a target'), pickAlly: t('도울 아군을 고르세요', 'Choose an ally'), cooldown: (turns: number) => t(`${turns}회 뒤 사용`, `Ready in ${turns} actions`),
      placement: t('부대 배치', 'Formation'), placementHint: t('두 부대를 차례로 누르면 자리를 바꿉니다.', 'Select two units to swap their positions.'), waveHint: t('전열이 비면 적이 후열을 공격할 수 있습니다.', 'Enemies can reach the rear when the front line is empty.'),
      conquered: (place: string) => t(`${place} 점령했습니다`, `${place}: captured`), held: (place: string) => t(`${place} 지켜냈습니다`, `${place}: defended`), lost: (place: string) => t(`${place} 잃었습니다`, `${place}: lost`), failed: (place: string) => t(`${place} 공격에 실패했습니다`, `${place}: attack repelled`), lossesOurs: t('아군 손실', 'Our losses'), lossesEnemy: t('적군 손실', 'Enemy losses'),
      skills: { charge: t('돌격', 'Charge'), fire: t('화공', 'Fire attack'), confuse: t('혼란', 'Confuse'), heal: t('치유', 'Heal'), fortify: t('결계', 'Fortify'), inspire: t('고무', 'Inspire'), volley: t('일제 사격', 'Volley'), siege: t('공성', 'Siege'), snipe: t('저격', 'Snipe') },
      skillDesc: { charge: t('강하게 돌격합니다.', 'Launch a powerful charge.'), fire: t('지력으로 화공을 펼칩니다.', 'Attack with fire using intellect.'), confuse: t('적을 혼란에 빠뜨립니다.', 'Confuse an enemy.'), heal: t('아군 병력을 회복합니다.', 'Restore allied troops.'), fortify: t('아군의 방어를 높입니다.', 'Fortify allied defenses.'), inspire: t('아군 사기를 높입니다.', 'Raise allied morale.'), volley: t('적의 한 열을 공격합니다.', 'Attack an enemy row.'), siege: t('방어 진지를 공격합니다.', 'Strike enemy fortifications.'), snipe: t('적 한 부대를 겨눕니다.', 'Take aim at an enemy unit.') },
      statuses: { guard: t('방어', 'Guarding'), fortify: t('결계', 'Fortified'), confused: t('혼란', 'Confused'), inspired: t('고무', 'Inspired'), weakened: t('약화', 'Weakened') },
    },
    duel: {
      title: t('일기토', 'Duel'), moves: { attack: t('공격', 'Attack'), guard: t('방어', 'Guard'), desperate: t('필살', 'Desperate strike') },
      accept: t('승부한다', 'Accept'), refuse: t('거절한다', 'Refuse'), draw: t('무승부', 'Draw'), round: (round: number) => t(`${round}합`, `Round ${round}`),
      challenge: (a: string, b: string) => t(`${a}과 ${b}의 승부`, `${a} faces ${b}`), incoming: (name: string) => t(`${name}이 일기토를 청합니다.`, `${name} challenges you to a duel.`), win: (name: string) => t(`${name} 승리`, `${name} wins`),
      read: t('상대의 말을 읽으세요. 허세일 수도 있습니다.', 'Read your opponent’s words. They may be bluffing.'), rule: t('공격은 필살을 끊고, 방어는 공격을 막고, 필살은 방어를 부숩니다.', 'Attack interrupts desperate strikes; guard counters attack; desperate strikes break guard.'),
      hints: { attack: [t('빈틈을 놓치지 않겠다.', 'I will not miss an opening.'), t('정면으로 겨루자.', 'Face me head on.')], guard: [t('먼저 와 보아라.', 'Make your move.'), t('서두르지 않겠다.', 'I will not rush.')], desperate: [t('이번에 끝내겠다!', 'This ends now!'), t('모든 것을 걸겠다.', 'I stake everything on this strike.')] },
    },
    sortie: {
      title: t('출진', 'Sortie'), from: t('출발지', 'From'), to: t('목표', 'Target'), start: t('출진한다', 'Deploy'), pick: (selected: number, max: number) => t(`출진 부대 ${selected}/${max}`, `Units ${selected}/${max}`),
      ourPower: t('아군 전력', 'Our strength'), enemyPower: t('예상 적 전력', 'Estimated enemy strength'), advantage: [t('불리', 'Unfavorable'), t('접전', 'Even'), t('유리', 'Favorable'), t('우세', 'Overwhelming')], supply: (amount: number) => t(`군량 ${n(amount)} 필요`, `${n(amount)} provisions required`),
      leavesEmpty: (place: string) => t(`출진하면 ${place}의 수비가 비게 됩니다.`, `This sortie leaves ${place} undefended.`), noSource: t('출진할 수 있는 이웃 영토가 없습니다.', 'No neighboring territory can launch this sortie.'), needShipyard: (place: string) => t(`${place}에 조선소가 필요합니다.`, `${place} needs a shipyard.`), slowBreak: t('제한 라운드 안에 방어선을 무너뜨리기 어려울 수 있습니다.', 'Your army may not break the defenses before the round limit.'),
      errors,
    },
    diplomacy: {
      title: t('외교', 'Diplomacy'), none: t('외교할 세력이 없습니다.', 'There are no rival factions.'), envoy: t('사절', 'Envoy'), noEnvoy: t('행동 가능한 인재 없음', 'No officer ready'),
      relation: t('우호도', 'Relations'), power: t('전력', 'Strength'), powerVs: (enemy: string, ours: string) => t(`상대 ${enemy} · 아군 ${ours}`, `Theirs ${enemy} · Ours ${ours}`), lands: (count: number) => t(`영토 ${count}`, `${count} lands`), members: (count: number) => t(`인재 ${count}명`, `${count} officers`),
      actions: { gift: t('친선', 'Send gift'), alliance: t('동맹', 'Alliance'), ceasefire: t('정전', 'Ceasefire'), surrender: t('항복 권고', 'Demand surrender'), break: t('조약 파기', 'Break treaty') },
      desc: { gift: t('금을 보내 우호도를 높입니다.', 'Send gold to improve relations.'), alliance: t('일정 기간 서로 공격하지 않는 동맹을 청합니다.', 'Propose an alliance and suspend hostilities.'), ceasefire: t('일정 기간 전투를 멈춥니다.', 'Propose a temporary ceasefire.'), surrender: t('전력과 우호도를 바탕으로 항복을 권합니다.', 'Demand surrender based on strength and relations.'), break: t('현재 조약을 파기합니다. 관계가 악화됩니다.', 'Break the current treaty at the cost of relations.') },
      personality: { conqueror: t('정복형', 'Conqueror'), schemer: t('책략형', 'Schemer'), benevolent: t('인덕형', 'Benevolent'), cautious: t('신중형', 'Cautious'), builder: t('경영형', 'Builder') },
      treaty: { alliance: t('동맹', 'Alliance'), ceasefire: t('정전', 'Ceasefire') }, until: (months: number) => t(`${months}개월 남음`, `${months} months remaining`),
      send: t('보낸다', 'Send'), breakDo: t('파기한다', 'Break'), odds: (p: number) => t(`성공 ${p}%`, `${p}% chance`), waitMonths: (months: number) => t(`${months}개월 뒤`, `In ${months} months`), needRelation: (relation: number) => t(`우호도 ${relation} 필요`, `Requires ${relation} relations`), notYet: t('아직 조건이 되지 않습니다.', 'The conditions are not yet met.'),
    },
    events: {
      accept: t('수락', 'Accept'), decline: t('거절', 'Decline'), command: t('직접 지휘', 'Command'), auto: t('자동 전투', 'Auto battle'), yield: t('영토를 내준다', 'Yield territory'),
      invadedTitle: t('적의 침공', 'Invasion'), invaded: (faction: string, at: string) => t(`${faction}이 ${at}을 침공했습니다.`, `${faction} has invaded ${at}.`), invadedCount: (count: number) => t(`적 부대 ${count}`, `${count} enemy units`), noDefenders: (place: string) => t(`${place}에 지킬 부대가 없습니다.`, `${place} has no defending units.`), ours: t('수비군', 'Defenders'),
      outlookLabel: t('예상 형세', 'Outlook'), outlook: [t('유리', 'Favorable'), t('대등', 'Even'), t('불리', 'Unfavorable'), t('매우 불리', 'Overwhelming enemy')],
      visitorTitle: t('인재 방문', 'A visitor'), visitor: (at: string) => t(`${at}에 인재가 찾아왔습니다.`, `A person has arrived in ${at}.`), welcome: t('맞이한다', 'Welcome'),
      discontentTitle: t('흔들리는 마음', 'Discontent'), discontent: (loyalty: number) => t(`충성이 ${loyalty}입니다. 마음을 돌릴 방도를 고르세요.`, `Loyalty is ${loyalty}. Choose how to respond.`), release: t('보내준다', 'Let go'), persuade: t('설득한다', 'Persuade'), reward: t('포상한다', 'Reward'),
      proposalAlliance: t('동맹 제안', 'Alliance proposal'), proposalCeasefire: t('정전 제안', 'Ceasefire proposal'), alliance: (faction: string) => t(`${faction}이 동맹을 청합니다.`, `${faction} proposes an alliance.`), ceasefire: (faction: string, gold: number) => t(`${faction}이 금 ${gold}을 보내며 정전을 청합니다.`, `${faction} offers ${gold} gold for a ceasefire.`), refuseOffer: t('청을 거절한다', 'Decline offer'),
      prisonersTitle: t('포로 처분', 'Prisoners'), prisoners: t('등용을 권하거나 풀어줄 수 있습니다.', 'Attempt recruitment or release the prisoners.'), recruitTry: (p: number) => t(`등용 ${Math.round(p * 100)}%`, `Recruit ${Math.round(p * 100)}%`), free: t('석방', 'Release'), joined: t('합류', 'Joined'), refused: t('거절', 'Refused'), released: t('석방됨', 'Released'), kept: t('억류', 'Held'),
      defectedTitle: t('인재 이탈', 'An officer departs'), defectedMany: (count: number) => t(`인재 ${count}명 이탈`, `${count} officers depart`), defected: t('충성이 낮아진 인재가 세력을 떠났습니다.', 'Officers with low loyalty have left the faction.'),
      fellTitle: t('세력 패망', 'A faction falls'), fell: (faction: string) => t(`${faction}의 깃발이 내려갔습니다.`, `${faction} has fallen.`), starsTitle: t('108성 집결', 'The 108 stars assemble'), stars: t('108성이 모두 모였습니다. 인연의 힘이 세력을 돕습니다.', 'All 108 stars have gathered. Their bond strengthens the faction.'),
    },
    wander: {
      title: t('강호 방랑', 'Wandering'), here: t('현재 위치', 'Current location'), party: t('동료', 'Companions'), part: t('헤어지기', 'Part ways'), slot: t('동료 자리', 'Companion slot'), locals: (count: number) => t(`재야 인물 ${count}명`, `${count} independent people`),
      search: t('인연을 찾는다', 'Seek encounters'), searchSub: t('한 달 동안 이 땅을 둘러봅니다.', 'Spend a month exploring this land.'), moveHint: t('이웃 땅을 골라 여행합니다. 한 달이 흐릅니다.', 'Choose a neighboring land to travel. A month will pass.'),
      turns: (count: number) => t(`방랑 ${count}개월`, `${count} months wandering`), seaFare: (gold: number) => t(`뱃삯 ${gold}`, `Sea fare ${gold}`), occupied: t('다른 세력의 영토', 'Another faction’s territory'),
      raise: t('거병한다', 'Raise your banner'), raiseSub: t('이 땅에서 동료들과 세력을 일으킵니다.', 'Found a faction here with your companions.'), raiseConfirm: (place: string) => t(`${place}에서 거병할까요?`, `Raise your banner in ${place}?`), capitalBlocked: t('다른 세력의 도읍에서는 거병할 수 없습니다.', 'You cannot raise an army in another faction’s capital.'), uprisingConfirm: (place: string, faction: string) => t(`${faction}의 ${place}을 차지하고 거병할까요?`, `Seize ${place} from ${faction} and raise your banner?`), uprisingSub: t('영토를 빼앗긴 세력과 관계가 악화됩니다.', 'Relations with its former owner will deteriorate.'),
      enc: {
        hero: (name: string) => t(`${name}과의 만남`, `Meeting ${name}`), invite: (p: number) => t(`동료로 청한다 (${Math.round(p * 100)}%)`, `Invite (${Math.round(p * 100)}%)`), talk: t('이야기한다', 'Talk'), leave: t('길을 떠난다', 'Leave'), full: t('동료 자리가 가득 찼습니다.', 'Your party is full.'),
        fight: t('맞서 싸운다', 'Fight'), flee: t('피한다', 'Flee'), pay: (gold: number) => t(`금 ${gold}을 준다`, `Pay ${gold} gold`), banditsSub: (enemy: number, ours: number, p: number) => t(`도적 전력 ${enemy} · 일행 ${Math.round(ours)} · 승산 ${Math.round(p * 100)}%`, `Bandits ${enemy} · Party ${Math.round(ours)} · ${Math.round(p * 100)}% chance`),
        escort: (gold: number) => t(`호위한다 (보수 ${gold})`, `Escort (${gold} gold)`), decline: t('사양한다', 'Decline'), merchantSub: (p: number) => t(`상인이 호위를 부탁합니다. 습격 시 승산 ${Math.round(p * 100)}%`, `A merchant needs an escort. Chance against an ambush: ${Math.round(p * 100)}%`),
        help: t('도와준다', 'Help'), villageSub: t('마을 사람들이 도움을 구합니다.', 'Villagers ask for help.'), shrineSub: t('작은 사원에서 잠시 쉬어갑니다.', 'Rest at a small temple.'), divine: t('점을 친다', 'Seek a divination'), rest: t('기도하고 쉰다', 'Pray and rest'),
        rumor: (name: string, place: string) => t(`${name}이 ${place}에 있다고 합니다.`, `${name} is said to be in ${place}.`), rumorSub: t('이름난 인물의 소식을 들었습니다.', 'You hear news of a notable person.'), lead: (name: string, at: string) => t(`${name}이 ${at}에 있다고 합니다.`, `${name} is said to be in ${at}.`), quiet: t('조용한 하루가 흘렀습니다.', 'A quiet day passes.'), ok: t('계속', 'Continue'),
        joined: (name: string) => t(`${name}이 동료가 되었습니다.`, `${name} joins your party.`), refused: t('동행을 사양했습니다.', 'They declined.'), talked: t('이야기를 나누며 명성을 얻었습니다.', 'The conversation earned you fame.'), won: (gold: number) => t(`도적을 물리치고 금 ${gold}을 얻었습니다.`, `Defeated the bandits and gained ${gold} gold.`), lost: (gold: number) => t(`패배하여 금 ${gold}을 잃었습니다.`, `Lost ${gold} gold in defeat.`), paid: t('금을 주고 통과했습니다.', 'Paid to pass.'), fled: t('무사히 피했습니다.', 'Escaped safely.'), villageDone: t('마을을 돕고 명성을 얻었습니다.', 'Helping the village earned you fame.'), helped: t('호위를 마쳤습니다.', 'Completed the escort.'), defended: (gold: number) => t(`습격을 막고 금 ${gold}을 받았습니다.`, `Repelled the ambush and received ${gold} gold.`), robbed: (gold: number) => t(`습격으로 금 ${gold}을 잃었습니다.`, `Lost ${gold} gold in the ambush.`), rested: t('기도하며 명성을 얻었습니다.', 'Your prayers earned you fame.'), foretold: (name: string, at: string) => t(`${name}이 ${at}에 있다고 합니다.`, `${name} is said to be in ${at}.`), ignored: t('다시 길을 떠납니다.', 'You continue your journey.'),
      },
    },
    toast: {
      errors, farm_done: (gain: number) => t(`농업 +${gain}`, `Farming +${gain}`), commerce_done: (gain: number) => t(`상업 +${gain}`, `Commerce +${gain}`), walls_done: (gain: number) => t(`성벽 +${gain}`, `Walls +${gain}`), relief_done: (gain: number) => t(`민심 +${gain}`, `Order +${gain}`), conscript_done: (gain: number) => t(`병력 +${gain}`, `Troops +${gain}`), train_done: (gain: number) => t(`훈련 +${gain}`, `Training +${gain}`),
      subdue_ok: t('위협을 물리쳤습니다.', 'The threat has been suppressed.'), subdue_fail: t('토벌에 실패했습니다.', 'The suppression failed.'), search_found: (count: number) => t(`인재 ${count}명을 발견했습니다.`, `Discovered ${count} people.`), search_none: t('인재를 찾지 못했습니다.', 'No new talent was found.'), search_gold: (gold: number) => t(`금 ${gold}을 얻었습니다.`, `Found ${gold} gold.`), search_exhausted: t('이 땅의 인재를 모두 만났습니다.', 'All local people have been discovered.'), recruit_ok: (name: string) => t(`${name}이 합류했습니다.`, `${name} has joined.`), recruit_fail: (name: string) => t(`${name}의 마음을 얻지 못했습니다.`, `${name} declined to join.`), move_done: (where: string) => t(`${where}으로 이동했습니다.`, `Moved to ${where}.`), build_started: (name: string, months: number) => t(`${name} 건설을 시작했습니다. ${months}개월 소요됩니다.`, `${name} construction started; ${months} months remaining.`), reward_done: (gain: number) => t(`충성 +${gain}`, `Loyalty +${gain}`), dismissed: t('인재를 내보냈습니다.', 'The officer has been dismissed.'), governor_set: t('태수를 임명했습니다.', 'A governor has been appointed.'), delegate_on: t('내정을 위임합니다.', 'Development delegated.'), delegate_off: t('직접 지휘합니다.', 'Direct control restored.'), gift_done: (gain: number) => t(`우호도 +${gain}`, `Relations +${gain}`), alliance_ok: t('동맹을 맺었습니다.', 'An alliance has been formed.'), alliance_fail: t('동맹 제안을 거절당했습니다.', 'The alliance proposal was declined.'), ceasefire_ok: t('정전을 맺었습니다.', 'A ceasefire has been agreed.'), ceasefire_fail: t('정전 제안을 거절당했습니다.', 'The ceasefire proposal was declined.'), surrender_ok: t('상대 세력이 항복했습니다.', 'The other faction has surrendered.'), surrender_fail: t('항복 권고를 거절당했습니다.', 'The surrender demand was rejected.'), break_done: t('조약을 파기했습니다.', 'The treaty has been broken.'),
    },
  }
}

export type CheondoText = ReturnType<typeof getText>

export function formatYear(locale: Locale, year: number | null): string {
  if (year === null) return locale === 'en' ? 'Unknown' : '미상'
  return year < 0 ? (locale === 'en' ? `${-year} BCE` : `기원전 ${-year}년`) : (locale === 'en' ? String(year) : `${year}년`)
}
export function encounterTitle(locale: Locale, kind: string): string {
  const labels: Record<string, [string, string]> = { hero: ['새로운 인연', 'A new acquaintance'], bandits: ['길을 막은 도적', 'Bandits on the road'], merchant: ['상인의 부탁', 'A merchant’s request'], village: ['마을의 사정', 'A village in need'], shrine: ['길가의 사원', 'A roadside temple'], rumor: ['강호의 소문', 'A rumor'], quiet: ['잠깐의 휴식', 'A quiet rest'] }
  return labels[kind]?.[locale === 'en' ? 1 : 0] ?? ''
}
const LOG_LABELS: Record<string, [string, string]> = {
  wander_start: ['강호로 떠나다', 'A journey begins'], wander_move: ['새로운 땅에 도착하다', 'Arrived in a new land'], wander_joined: ['동료를 맞이하다', 'A companion joins'], raise: ['깃발을 세우다', 'A banner is raised'], uprising: ['봉기하다', 'An uprising begins'], volunteers: ['의용병이 합류하다', 'Volunteers join'],
  invaded: ['적이 침공하다', 'An enemy invades'], conquer: ['영토를 점령하다', 'A territory is conquered'], conquer_neutral: ['무주지를 차지하다', 'Independent land is claimed'], repelled: ['침공군을 물리치다', 'An invasion is repelled'], faction_fell: ['세력이 무너지다', 'A faction falls'], succession: ['새 군주가 뒤를 잇다', 'A new lord succeeds'],
  prisoner_joined: ['포로가 합류하다', 'A prisoner joins'], captured_turned: ['사로잡힌 인재가 귀순하다', 'A captured officer changes sides'], prisoner_returned: ['포로가 돌아가다', 'A prisoner returns'], prisoner_rescued: ['포로를 구하다', 'A prisoner is rescued'],
  unpaid: ['봉록을 지급하지 못하다', 'Salaries go unpaid'], food_bought: ['부족한 군량을 사들이다', 'Provisions are purchased'], starving: ['군량이 떨어져 병사가 흩어지다', 'Troops desert as provisions run out'], build_done: ['시설을 완공하다', 'Construction is completed'], threat: ['영토에 위협이 생기다', 'A local threat emerges'], defected: ['인재가 세력을 떠나다', 'An officer leaves'],
  harvest: ['수확을 거두다', 'The harvest arrives'], drought: ['가뭄이 들다', 'Drought strikes'], flood: ['홍수가 나다', 'Flooding strikes'], plague: ['역병이 돌다', 'Plague spreads'], locusts: ['메뚜기 떼가 들다', 'Locusts descend'], festival: ['축제가 열리다', 'A festival is held'], bumper: ['풍년이 들다', 'A bountiful harvest'], stars108: ['108성이 모이다', 'The 108 stars assemble'], fame_rank: ['명성이 높아지다', 'Fame rises'], treaty_end: ['조약이 끝나다', 'A treaty expires'],
  subdue_ok: ['위협을 토벌하다', 'A threat is suppressed'], subdue_fail: ['토벌에 실패하다', 'Suppression fails'], search_found: ['인재를 발견하다', 'Talent is discovered'], recruit_ok: ['인재를 등용하다', 'An officer is recruited'], dismissed: ['인재를 내보내다', 'An officer is dismissed'], joined: ['인재가 합류하다', 'An officer joins'], level_up: ['인재가 성장하다', 'An officer gains a level'],
  alliance: ['동맹을 맺다', 'An alliance is formed'], ceasefire: ['정전을 맺다', 'A ceasefire is agreed'], treaty_broken: ['조약을 파기하다', 'A treaty is broken'], surrender: ['항복을 받아들이다', 'A surrender is accepted'], visitor_joined: ['방문한 인재를 맞이하다', 'A visitor joins'], discontent_resolved: ['인재의 마음을 돌리다', 'An officer is reassured'],
}
export function formatLog(locale: Locale, entry: LogEntry, names: NameLookup): string {
  const T = getText(locale), p = entry.params
  const action = LOG_LABELS[entry.code]?.[locale === 'en' ? 1 : 0] ?? (locale === 'en' ? 'Realm news' : '천하의 소식')
  const details = Object.entries(p).map(([key, value]) => {
    if (['hero', 'target', 'lord'].includes(key)) return names.hero(String(value))
    if (['at', 'to', 'territory'].includes(key)) return names.territory(String(value))
    if (['faction', 'from', 'defender'].includes(key)) return value ? names.faction(String(value)) : T.neutral
    if (key === 'building') return T.buildings[value as keyof typeof T.buildings] ?? String(value)
    if (key === 'threat') return T.threats[value as keyof typeof T.threats] ?? String(value)
    return typeof value === 'number' ? num(locale, value) : String(value)
  }).filter(Boolean)
  return [action, ...details].join(' · ')
}
export function formatBattleLog(locale: Locale, entry: BattleState['log'][number] | undefined, nameOf: (id: string) => string): string {
  if (!entry) return ''
  const T = getText(locale), p = entry.params
  const who = nameOf(String(p.unit ?? '')), target = nameOf(String(p.target ?? ''))
  const labels: Record<string, string> = {
    attack: T.battle.attack, attack_crit: locale === 'en' ? 'Critical hit' : '치명타', skill_hit: T.battle.skills[p.skill as keyof typeof T.battle.skills] ?? (locale === 'en' ? 'Skill' : '기술'), skill_row: locale === 'en' ? 'Row attack' : '열 공격',
    rout: locale === 'en' ? 'Routed' : '패주', confused_skip: locale === 'en' ? 'Confusion prevents action' : '혼란으로 행동 불가', confuse_ok: locale === 'en' ? 'Confusion succeeds' : '혼란 성공', confuse_fail: locale === 'en' ? 'Confusion resisted' : '혼란 저항', heal: T.battle.skills.heal, fortify: T.battle.skills.fortify, inspire: T.battle.skills.inspire, guard: T.battle.guard,
    duel_start: T.duel.title, duel_refused: T.duel.refuse, duel_draw: T.duel.draw, duel_win: locale === 'en' ? 'Duel victory' : '일기토 승리', siege_fall: locale === 'en' ? 'The defenses fall' : '방어선 붕괴', siege_hold: locale === 'en' ? 'The defenses hold' : '방어선 유지', battle_end: locale === 'en' ? 'Battle ends' : '전투 종료',
  }
  const amount = p.dmg ?? p.amount
  return [who, labels[entry.code] ?? (locale === 'en' ? 'Battle report' : '전황'), p.target ? target : '', typeof amount === 'number' ? num(locale, amount) : ''].filter(Boolean).join(' · ')
}

export const eraOf = (birth: number | null): 'ancient' | 'medieval' | 'early' | 'modern' | 'contemporary' | 'unknown' => birth === null ? 'unknown' : birth < 500 ? 'ancient' : birth < 1500 ? 'medieval' : birth < 1800 ? 'early' : birth < 1945 ? 'modern' : 'contemporary'
