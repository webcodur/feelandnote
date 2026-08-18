// 인물 16축 스펙트럼 채점 척도 — 물리 저장소는 celeb_persona.persona를 유지한다.
//
// 이 파일이 유일한 척도다. 문서·백오피스 화면·채점 작업 지시문은 모두 여기를 참조한다.
// 수치를 다른 곳에 옮겨 적지 마라. 26.08.08 통합 이전에는 척도가 두 벌이었고 서로 어긋나 있었다.
//   - docs/project/celeb/celeb-5-spectrum.md : 실존 인물 기준 (무력 한 축만)
//   - sw/web-bo/src/constants/spectrumReferencePoints.ts : KOEI 삼국지 기준 (능력 네 축)
//   같은 무력인데 조조 79 · 이순신 88로 두 자가 갈라져 있었고, 채점 담당은 문서만 읽어
//   삼국지 표를 보지 못했다. 그 결과 잣대 없는 축(통솔·덕목·성향)은 채점 회차마다 흔들렸다.
//
// 실측 근거(26.08.08): 잣대가 있는 무력은 회차가 바뀌어도 지휘관 평균이 76~78로 일정했으나,
// 잣대가 없는 통솔은 인물 위상과의 상관이 -0.16 ~ +0.54로 요동쳤다.

// ─────────────────────────────────────────────────────────────
// 축 정의
// ─────────────────────────────────────────────────────────────

export type AbilityKey = 'command' | 'martial' | 'intellect' | 'charm'
export type InnerVirtueKey = 'temperance' | 'diligence' | 'reflection' | 'courage'
export type OuterVirtueKey = 'loyalty' | 'benevolence' | 'fairness' | 'humility'
export type DispositionKey =
  | 'pessimism_optimism'
  | 'conservative_progressive'
  | 'individual_social'
  | 'cautious_bold'

export type SpectrumAxis = AbilityKey | InnerVirtueKey | OuterVirtueKey | DispositionKey

export const ABILITY_KEYS: readonly AbilityKey[] = ['command', 'martial', 'intellect', 'charm'] as const
export const INNER_VIRTUE_KEYS: readonly InnerVirtueKey[] = ['temperance', 'diligence', 'reflection', 'courage'] as const
export const OUTER_VIRTUE_KEYS: readonly OuterVirtueKey[] = ['loyalty', 'benevolence', 'fairness', 'humility'] as const
export const DISPOSITION_KEYS: readonly DispositionKey[] = [
  'pessimism_optimism',
  'conservative_progressive',
  'individual_social',
  'cautious_bold',
] as const

export const SPECTRUM_AXES: readonly SpectrumAxis[] = [
  ...ABILITY_KEYS,
  ...INNER_VIRTUE_KEYS,
  ...OUTER_VIRTUE_KEYS,
  ...DISPOSITION_KEYS,
] as const

/** 축 한국어 이름. 사용자 화면 노출 문구는 이 값을 쓴다. */
export const AXIS_LABELS: Record<SpectrumAxis, string> = {
  command: '통솔',
  martial: '무력',
  intellect: '지력',
  charm: '매력',
  temperance: '절제',
  diligence: '근면',
  reflection: '성찰',
  courage: '용기',
  loyalty: '충성',
  benevolence: '인자',
  fairness: '공정',
  humility: '겸양',
  pessimism_optimism: '비관↔낙관',
  conservative_progressive: '보수↔진보',
  individual_social: '개인↔공동체',
  cautious_bold: '신중↔대담',
}

/** 축이 무엇을 재는가. 채점 지시문에 그대로 싣는다. */
export const AXIS_DEFINITIONS: Record<SpectrumAxis, string> = {
  command: '조직·군대·국가를 실제로 이끌고 관리한 역량. 명성·흥행력·산업 영향력은 여기가 아니라 매력에서 잰다.',
  martial: '근력·민첩·지구력·강인함(부상 회복·고통 인내 포함)의 종합 추정치. 전장의 무인과 경기장의 선수를 같은 자로 잰다. 신체 활동 이력은 이 추정치의 증거이지 점수 자체가 아니다. 시대·환경이 가한 수동 피해(피격·기아·학대·감염)는 본인 능력 근거에서 뺀다 — 겪었다는 사실이 체력이 아니다.',
  intellect: '지적 능력·분석력·창의적 사고·전문 지식.',
  charm: '인간적 매력·예술적 아우라·대중적 호소력. 위압적 권위뿐 아니라 우아함·품격도 포함한다.',
  temperance: '욕망·감정·권력의 자제.',
  diligence: '꾸준한 노력.',
  reflection: '자기 행동을 돌아보는 습관.',
  courage: '위험을 감수하고 신념에 따라 행동함.',
  loyalty: '집단·신념·인간관계에 대한 헌신.',
  benevolence: '타인의 고통에 대한 공감과 선행.',
  fairness: '편파 없는 원칙적 판단.',
  humility: '자신을 낮추고 타인을 존중함.',
  pessimism_optimism: '세계와 미래를 비관하는가 낙관하는가.',
  conservative_progressive: '기존 질서를 지키는가 바꾸는가.',
  individual_social: '개인의 독립을 앞세우는가 공동체를 앞세우는가.',
  cautious_bold: '신중히 재는가 과감히 감행하는가.',
}

// ─────────────────────────────────────────────────────────────
// 점수 범위
// ─────────────────────────────────────────────────────────────

/**
 * 성향 4축의 부호 방향 — **반드시 확인하고 매겨라.**
 * 26.08.08 채점에서 근거는 제대로 쓰고 부호를 반대로 붙인 사례가 여럿 나왔다.
 * 한비자에게 "국법을 앞세운다"는 근거로 -40(개인 쪽), 마르쿠스 아우렐리우스에게
 * "공동체 우선의 신념"이라는 근거로 -30을 준 식이다. 키 이름의 앞 단어가 플러스가 아니다.
 */
export const DISPOSITION_POLES: Record<DispositionKey, { minus: string; plus: string }> = {
  pessimism_optimism: { minus: '-50 극도의 비관', plus: '+50 극도의 낙관' },
  conservative_progressive: { minus: '-50 극보수 · 기존 질서 수호', plus: '+50 극진보 · 질서 전복' },
  individual_social: { minus: '-50 극단적 개인주의 · 홀로 · 은둔', plus: '+50 극단적 공동체주의 · 집단 우선' },
  cautious_bold: { minus: '-50 극도로 신중 · 재고 후 행동', plus: '+50 극도로 대담 · 즉시 감행' },
}

/** 점수를 적기 전 자문할 것: 이 근거는 마이너스 극과 플러스 극 중 어느 쪽 설명인가. */
export const DISPOSITION_SIGN_CHECK =
  '성향 점수를 적기 전에 DISPOSITION_POLES를 보고 근거 문장이 어느 극을 설명하는지 확인한다. 근거와 부호가 반대면 잘못 매긴 것이다.'

export const ABILITY_RANGE = { min: 0, max: 100 } as const
export const VIRTUE_RANGE = { min: 0, max: 100 } as const
export const DISPOSITION_RANGE = { min: -50, max: 50 } as const

export function axisRange(axis: SpectrumAxis): { min: number; max: number } {
  return (DISPOSITION_KEYS as readonly string[]).includes(axis) ? DISPOSITION_RANGE : ABILITY_RANGE
}

export function isScoreInRange(axis: SpectrumAxis, score: number): boolean {
  const { min, max } = axisRange(axis)
  return Number.isInteger(score) && score >= min && score <= max
}

// ─────────────────────────────────────────────────────────────
// 무력 8단계 등급 — 유일하게 등급제를 쓰는 축
// ─────────────────────────────────────────────────────────────

export interface MartialGrade {
  name: string
  hanja: string
  min: number
  max: number
  criterion: string
}

export const MARTIAL_GRADES: readonly MartialGrade[] = [
  { name: '무신', hanja: '武神', min: 95, max: 100, criterion: '근력·민첩·파워·지구력이 인류사 정상급' },
  { name: '맹장', hanja: '猛將', min: 85, max: 94, criterion: '전장·경기장 정상급 신체 능력. 직접 접전·시합으로 입증' },
  { name: '용장', hanja: '勇將', min: 75, max: 84, criterion: '실전·실기 경험 풍부. 부상 복귀·장기 지속의 체력 상위권' },
  { name: '무인', hanja: '武人', min: 65, max: 74, criterion: '군사 교육·신체 중심 직업으로 단련된 체력 수준' },
  { name: '문무', hanja: '文武', min: 50, max: 64, criterion: '일정 수준의 신체 훈련 기록. 비전투직도 지속 훈련이 확인되면 이 위로' },
  { name: '서생', hanja: '書生', min: 35, max: 49, criterion: '비신체직 종사자의 기본 체력 추정치. 특별한 훈련·질환 기록 없음' },
  { name: '허약', hanja: '虛弱', min: 20, max: 34, criterion: '만성 질환·병약 기록으로 체력 전반 저하. 활동은 가능하나 지속성 부족' },
  { name: '잔질', hanja: '殘疾', min: 5, max: 19, criterion: '신체 장애·중증 질환으로 일상·직업 활동 자체가 제한됨' },
] as const

/**
 * 신체 역량 입증 여성을 제외한 일반 여성의 무력 보정 — 무력 한 축에만 적용한다.
 * 고정 -15가 아니라 점진(tapered) 보정이다. 고점(50+)은 -15, 저점(50 미만)은 보정량이 선형 줄어든다.
 * 0점은 보정 0, 50점은 -15, 100점은 -15. 저점에서 0점 붕괴를 막는다.
 *
 * 적용 예:
 *   raw 100 → -15 = 85   raw 50 → -15 = 35   raw 30 → -9 = 21
 *   raw 15 → -4 = 11     raw 8 → -2 = 6      raw 0 → 0 = 0
 */
export function femaleMartialAdjust(rawScore: number): number {
  const adj = rawScore >= 50 ? 15 : Math.round((15 * rawScore) / 50)
  return Math.max(5, rawScore - adj)
}

export const FEMALE_MARTIAL_ADJUSTMENT_RULE =
  '무력(martial) 한 축에만 적용한다. 능력 나머지(command·intellect·charm)와 덕목·성향은 성별과 무관하게 동일 자로 잰다. ' +
  '모든 여성에게 점진 보정을 적용한다 — 신체 역량 입증 여성(athlete·commander·무술·댄서·실전 전투 등)도 포함. ' +
  '직군·이력으로 받은 무력 플러스(athlete 기본 80+, 댄서 구간 55~60 등)와 성별 보정은 별개 차원이다 — 직군 플러스는 산출 단계에서, 보정은 산출 후 한 번. ' +
  '보정량: 산출 점수 ≥ 50이면 -15, 50 미만이면 round(15 × 점수/50). ' +
  '즉 100→85, 50→35, 30→21, 15→11, 8→6, 0→0. 보정 후 점수가 5 미만이면 5로 고정한다.'

export function martialGradeOf(score: number): MartialGrade | undefined {
  return MARTIAL_GRADES.find(g => score >= g.min && score <= g.max)
}

/**
 * 무력 하한선의 함정 — 26.08.08 실측에서 학자·문인 105명이 잔질(20 미만)에 잘못 들어가 있었다.
 * "싸운 적 없음"과 "몸을 못 씀"은 다르다. 잔질은 실제 장애·중증 질환 기록이 있을 때만이다.
 * 평화주의자라서, 은둔했다는 이유로 10점대를 주지 마라.
 */
export const MARTIAL_FLOOR_RULE =
  '잔질(5~19)은 실제 신체 장애·중증 질환 기록이 있을 때만 부여한다. 전투 기록이 없다는 이유만으로는 서생(35~49)이 기본이다. 반대로 피해적 경험(피격·기아·학대·감염·포로 생활)은 본인의 능동적 신체 능력이 아니므로 무력 근거에서 뺀다 — 겪었다는 사실이 체력이 아니다.'

/** 배우·음악인 무력 — 개별 필모그래피를 추적하지 않고 아래 체력 유형으로 잡는다. 점수는 신체 능력 추정치이지 '연기·흥행 이력'이 아니다. */
export const PERFORMER_MARTIAL_BANDS = [
  { condition: '실제 무술가·격투가 출신(기초 체력 입증됨)', min: 75, max: 90, examples: ['이소룡', '성룡'] },
  { condition: '스포츠 선수 출신(경쟁 체력 입증됨)', min: 65, max: 74, examples: ['제이슨 스타뎀', '드웨인 존슨'] },
  { condition: '대표적 액션스타(비무술 출신, 장기 신체 훈련 기록)', min: 65, max: 70, examples: ['아놀드 슈왈츠제네거', '실베스터 스탤론'] },
  { condition: '무용·댄서 출신(근지구력·협응력 훈련 입증)', min: 55, max: 60, examples: [] },
  { condition: '그 외 배우·음악인(특별한 신체 훈련 기록 없음 — 비신체직 기본값)', min: 50, max: 55, examples: [] },
] as const

// ─────────────────────────────────────────────────────────────
// 축별 기준점 — 실존 인물 통합 척도
// ─────────────────────────────────────────────────────────────

export interface SpectrumAnchor {
  score: number
  nickname: string
  /** 왜 이 점수인가. 채점자가 자기 인물을 견주는 근거가 된다. */
  note: string
}

const COMMAND: readonly SpectrumAnchor[] = [
  { score: 98, nickname: '칭기즈 칸', note: '흩어진 부족을 통합해 역사상 최대 연속 제국을 세움' },
  { score: 97, nickname: '나폴레옹 보나파르트', note: '60여 회 전투를 직접 설계·지휘' },
  { score: 96, nickname: '이순신', note: '23전 무패. 백의종군 복귀 후 명량에서 13척으로 133척 격파' },
  { score: 95, nickname: '율리우스 카이사르', note: '갈리아 정복·내전 승리·로마 지배' },
  { score: 92, nickname: '존 D. 록펠러', note: '스탠더드 오일로 미국 정유 90%를 수직 통합' },
  { score: 90, nickname: '모리스 창', note: 'TSMC를 파운드리 세계 1위로 30년간 이끎' },
  { score: 88, nickname: '헤르베르트 폰 카라얀', note: '베를린 필을 30년 넘게 장악한 상임지휘자' },
  { score: 85, nickname: '구스타프 말러', note: '빈 궁정 오페라 총감독. 악단을 직접 통솔' },
  { score: 80, nickname: '박진영', note: '연예 기획사를 세워 소속 아티스트를 발굴·경영' },
  { score: 74, nickname: '찰리 채플린', note: '자기 스튜디오 운영, 유나이티드 아티스츠 공동 창업' },
  { score: 68, nickname: '비욘세', note: '자기 작품을 만드는 제작사 하나를 운영' },
  { score: 55, nickname: '소크라테스', note: '제자를 두었으나 조직을 만들지 않음' },
  { score: 42, nickname: '노암 촘스키', note: '대학 한 학과에서 제자를 양성' },
  { score: 35, nickname: '아이작 뉴턴', note: '조폐국장 재임. 연구는 홀로 수행' },
  { score: 22, nickname: '장자', note: '학파를 세우지 않고 홀로 사유' },
  { score: 10, nickname: '후한 헌제', note: '자리만 있고 실권이 없었음' },
] as const

const MARTIAL: readonly SpectrumAnchor[] = [
  { score: 98, nickname: '알렉산더 대왕', note: '근력·민첩·지구력 정상급. 최전선 돌격 반복·수차례 중상 복귀로 입증' },
  { score: 97, nickname: '마이클 조던', note: '폭발적 가속·코어 파워·민첩이 경기장 정상급' },
  { score: 90, nickname: '오기', note: '실전 전투력·근접 격투 강인함 정상급' },
  { score: 88, nickname: '이순신', note: '해상 장기 근무 지구력·총상 후 복귀 회복력 상위' },
  { score: 80, nickname: '칭기즈 칸', note: '평생 마상 원정을 견딘 강인함·지구력 상위' },
  { score: 73, nickname: '어니스트 헤밍웨이', note: '종군·복싱·수렴 등 다종목 기초 체력·근지구력 상위' },
  { score: 68, nickname: '나폴레옹 보나파르트', note: '포병 장교 훈련·군사 교육으로 단련된 체력' },
  { score: 51, nickname: '공자', note: '전통 예식 무예(활쏘기·수레몰기) 기초 훈련 연마' },
  { score: 38, nickname: '마하트마 간디', note: '비신체직 활동가 기본 체력. 단식·장거리 행진의 인내는 있으나 근력·파워는 낮음' },
  { score: 36, nickname: '스티브 잡스', note: '비신체직 기업인 기본 체력. 특별한 훈련 기록 없음' },
  { score: 25, nickname: '마리 앙투아네트', note: '병약 체질·만성 쇠약 추정' },
  { score: 22, nickname: '아이작 뉴턴', note: '만성 병약·극히 제한적 체력' },
  { score: 10, nickname: '손빈', note: '다리 절단으로 일상·직업 활동 자체가 제한됨' },
  { score: 8, nickname: '스티븐 호킹', note: '전신 마비로 일상 활동 자체가 제한됨' },
] as const

const INTELLECT: readonly SpectrumAnchor[] = [
  { score: 99, nickname: '아이작 뉴턴', note: '역학·광학·미적분을 홀로 세움' },
  { score: 97, nickname: '소크라테스', note: '문답으로 서양 철학의 방법을 세움' },
  { score: 96, nickname: '공자', note: '유가 사상 체계를 정립' },
  { score: 93, nickname: '모리스 창', note: '존재하지 않던 파운드리 사업 모델을 창안' },
  { score: 90, nickname: '장자', note: '역설로 존재와 인식의 경계를 되물음' },
  { score: 88, nickname: '에이브러햄 링컨', note: '독학으로 법률가가 되어 헌법 논쟁을 주도' },
  { score: 81, nickname: '찰리 채플린', note: '각본·연출·작곡·편집을 홀로 수행' },
  { score: 78, nickname: '마돈나', note: '40년간 트렌드를 선점하며 커리어를 재설계' },
  { score: 68, nickname: '제임스 패터슨', note: '대중이 원하는 서사 구조를 설계' },
  { score: 60, nickname: '톰 크루즈', note: '40년간 흥행 감각을 유지한 커리어 관리' },
  { score: 45, nickname: '장비', note: '전투 감각은 뛰어나나 계략과는 거리가 멂' },
  { score: 30, nickname: '유선', note: '판단을 남에게 맡김' },
] as const

const CHARM: readonly SpectrumAnchor[] = [
  { score: 99, nickname: '마릴린 먼로', note: '한 세기의 미의 기준이 됨' },
  { score: 98, nickname: '엘비스 프레슬리', note: '대중음악의 대중적 호소력 최정점' },
  { score: 95, nickname: '알렉산더 대왕', note: '병사들이 인도까지 따라나섬' },
  { score: 92, nickname: '마하트마 간디', note: '옷 한 벌로 한 대륙을 움직임' },
  { score: 90, nickname: '넬슨 만델라', note: '적대 진영까지 끌어안은 인간적 흡인력' },
  { score: 88, nickname: '공자', note: '제자 삼천이 따름' },
  { score: 82, nickname: '이순신', note: '과묵하나 병사와 백성의 신망이 두터움' },
  { score: 75, nickname: '스티븐 호킹', note: '전신 마비를 딛고 위트로 대중을 사로잡음' },
  { score: 62, nickname: '장자', note: '기지 넘치는 언변으로 회자되나 대중과 거리를 둠' },
  { score: 42, nickname: '아이작 뉴턴', note: '고립적이고 논쟁적인 성격' },
  { score: 25, nickname: '하인리히 힘러', note: '측근조차 꺼린 음습한 인상' },
] as const

const TEMPERANCE: readonly SpectrumAnchor[] = [
  { score: 96, nickname: '마하트마 간디', note: '금욕·단식을 평생 실천' },
  { score: 94, nickname: '마더 테레사', note: '사유재산 없이 평생 생활' },
  { score: 92, nickname: '소크라테스', note: '가난을 감수하며 욕망을 절제' },
  { score: 88, nickname: '모리스 창', note: '38세에 박사 진학. 평생 절제된 생활' },
  { score: 78, nickname: '공자', note: '예로써 자신을 다스림' },
  { score: 48, nickname: '마이클 조던', note: '훈련은 혹독하나 도박 등 사생활 논란' },
  { score: 35, nickname: '아이작 뉴턴', note: '연구에 몰두하나 분노와 집착을 못 다스림' },
  { score: 28, nickname: '알렉산더 대왕', note: '폭음과 격분으로 측근을 살해' },
  { score: 22, nickname: '아돌프 히틀러', note: '권력욕과 증오를 제어하지 못함' },
  { score: 10, nickname: '버나드 매도프', note: '탐욕을 끝까지 제어하지 못함' },
] as const

const DILIGENCE: readonly SpectrumAnchor[] = [
  { score: 98, nickname: '아이작 뉴턴', note: '식사를 잊을 만큼 연구에 몰두' },
  { score: 95, nickname: '스티븐 호킹', note: '전신 마비 속에서 55년간 연구·집필' },
  { score: 94, nickname: '이순신', note: '전시에도 난중일기를 거르지 않음' },
  { score: 92, nickname: '칭기즈 칸', note: '평생 원정을 멈추지 않음' },
  { score: 88, nickname: '마하트마 간디', note: '수십 년간 운동과 저술을 병행' },
  { score: 72, nickname: '마릴린 먼로', note: '연기 수업을 이어갔으나 지속성이 흔들림' },
  { score: 58, nickname: '장자', note: '저술은 남겼으나 애씀 자체를 경계' },
  { score: 45, nickname: '아돌프 히틀러', note: '실무를 미루고 측근에게 떠넘김' },
] as const

const REFLECTION: readonly SpectrumAnchor[] = [
  { score: 98, nickname: '소크라테스', note: '캐묻지 않는 삶은 살 가치가 없다고 함' },
  { score: 90, nickname: '마하트마 간디', note: '자서전에서 자기 과오를 스스로 들춤' },
  { score: 88, nickname: '공자', note: '하루 세 번 자신을 돌아봄' },
  { score: 82, nickname: '에이브러햄 링컨', note: '결정의 근거를 거듭 되짚음' },
  { score: 50, nickname: '알렉산더 대왕', note: '측근 살해 후 며칠 자책했으나 방식을 바꾸지 않음' },
  { score: 42, nickname: '엘비스 프레슬리', note: '공개적 자기 성찰이 드묾' },
  { score: 8, nickname: '아돌프 히틀러', note: '끝까지 남을 탓함' },
] as const

const COURAGE: readonly SpectrumAnchor[] = [
  { score: 96, nickname: '알렉산더 대왕', note: '매 전투 최전선 돌격, 수차례 중상' },
  { score: 95, nickname: '소크라테스', note: '사형 선고에도 신념 철회를 거부' },
  { score: 95, nickname: '이순신', note: '파직·고문 후에도 다시 바다로 나감' },
  { score: 92, nickname: '넬슨 만델라', note: '종신형을 감수하고 신념을 지킴' },
  { score: 88, nickname: '에이브러햄 링컨', note: '분열을 각오하고 노예해방을 밀어붙임' },
  { score: 68, nickname: '아이작 뉴턴', note: '학계 논쟁에는 맞섰으나 공개를 오래 미룸' },
  { score: 55, nickname: '아돌프 히틀러', note: '참호 경험은 있으나 말년에는 은신' },
  { score: 20, nickname: '유선', note: '싸우지 않고 항복' },
] as const

const LOYALTY: readonly SpectrumAnchor[] = [
  { score: 95, nickname: '마더 테레사', note: '평생 한 서원을 지킴' },
  { score: 93, nickname: '이순신', note: '박해받으면서도 나라를 저버리지 않음' },
  { score: 90, nickname: '마하트마 간디', note: '비폭력 노선을 끝까지 견지' },
  { score: 82, nickname: '공자', note: '주나라 예를 평생 좇음' },
  { score: 70, nickname: '소크라테스', note: '아테네 법에 복종했으나 권력에는 굽히지 않음' },
  { score: 45, nickname: '마돈나', note: '장기 협업자도 있으나 팀 교체가 잦음' },
  { score: 38, nickname: '아돌프 히틀러', note: '측근을 필요에 따라 숙청' },
  { score: 27, nickname: '장자', note: '어느 나라에도 출사하지 않음' },
] as const

const BENEVOLENCE: readonly SpectrumAnchor[] = [
  { score: 98, nickname: '마더 테레사', note: '평생을 빈자 곁에서 보냄' },
  { score: 95, nickname: '공자', note: '인을 사상의 중심에 둠' },
  { score: 95, nickname: '마하트마 간디', note: '불가촉천민 차별에 맞섬' },
  { score: 88, nickname: '에이브러햄 링컨', note: '패전 측에 관용을 약속' },
  { score: 55, nickname: '알렉산더 대왕', note: '항복한 도시를 관대히 대하기도, 몰살하기도 함' },
  { score: 30, nickname: '아이작 뉴턴', note: '경쟁자를 집요하게 몰아붙임' },
  { score: 15, nickname: '칭기즈 칸', note: '저항한 도시를 몰살' },
  { score: 5, nickname: '아돌프 히틀러', note: '조직적 학살을 지시' },
] as const

const FAIRNESS: readonly SpectrumAnchor[] = [
  { score: 90, nickname: '소크라테스', note: '상대가 누구든 같은 잣대로 캐물음' },
  { score: 85, nickname: '이순신', note: '군율을 지위와 무관하게 적용' },
  { score: 85, nickname: '에이브러햄 링컨', note: '정적을 내각에 앉힘' },
  { score: 80, nickname: '공자', note: '신분을 가리지 않고 제자를 받음' },
  { score: 62, nickname: '모리스 창', note: '실적 중심 평가를 일관 적용' },
  { score: 45, nickname: '마이클 조던', note: '동료에게 가혹한 잣대를 들이댐' },
  { score: 40, nickname: '닥터 드레', note: '계약 조건 강경, 착취 논란 반복' },
  { score: 5, nickname: '아돌프 히틀러', note: '법을 자의로 뒤집음' },
] as const

const HUMILITY: readonly SpectrumAnchor[] = [
  { score: 97, nickname: '마더 테레사', note: '공로를 모두 남에게 돌림' },
  { score: 94, nickname: '마하트마 간디', note: '지도자 자리를 거듭 사양' },
  { score: 88, nickname: '소크라테스', note: '자신은 아무것도 모른다고 함' },
  { score: 88, nickname: '장자', note: '진흙 속 거북을 자처하며 영달을 사양' },
  { score: 80, nickname: '에이브러햄 링컨', note: '비판을 공개적으로 수용' },
  { score: 40, nickname: '마이클 조던', note: '자기 기량을 공공연히 과시' },
  { score: 22, nickname: '칭기즈 칸', note: '자신을 하늘이 보낸 징벌이라 칭함' },
  { score: 15, nickname: '알렉산더 대왕', note: '신의 아들을 자처하고 부복을 강요' },
  { score: 5, nickname: '아돌프 히틀러', note: '자신을 민족의 유일한 구원자로 내세움' },
] as const

const PESSIMISM_OPTIMISM: readonly SpectrumAnchor[] = [
  { score: 45, nickname: '레이 커즈와일', note: '기술이 인류 문제를 해결한다고 봄' },
  { score: 30, nickname: '톰 크루즈', note: '불가능은 없다는 신조를 공언' },
  { score: 20, nickname: '찰리 채플린', note: '빈곤 속에서도 희망을 그림' },
  { score: 0, nickname: '이순신', note: '최악을 대비하되 끝까지 방법을 찾음' },
  { score: -18, nickname: '노암 촘스키', note: '핵전쟁·기후위기를 거듭 경고' },
  { score: -38, nickname: '에드거 앨런 포', note: '작품 전반이 파멸과 상실로 향함' },
  { score: -45, nickname: '아르투어 쇼펜하우어', note: '삶을 고통으로 규정' },
] as const

const CONSERVATIVE_PROGRESSIVE: readonly SpectrumAnchor[] = [
  { score: 49, nickname: '토머스 페인', note: '왕정 자체를 폐기하자고 주장' },
  { score: 45, nickname: '노암 촘스키', note: '반세기 넘게 아나키즘 노선을 견지' },
  { score: 32, nickname: '비욘세', note: '인종·젠더 메시지를 주류 팝에 삽입' },
  { score: 0, nickname: '에이브러햄 링컨', note: '연방 유지를 앞세우되 노예제는 폐지' },
  { score: -20, nickname: '공자', note: '옛 예를 회복하자고 함' },
  { score: -45, nickname: '증자', note: '스승의 가르침을 한 자도 바꾸지 않으려 함' },
] as const

const INDIVIDUAL_SOCIAL: readonly SpectrumAnchor[] = [
  { score: 48, nickname: '이회영', note: '전 재산을 처분해 독립운동에 바침' },
  { score: 45, nickname: '칼 마르크스', note: '공동체적 생산을 역사의 방향으로 봄' },
  { score: 25, nickname: '모리스 창', note: '국가 산업의 사명에 자신을 결부' },
  { score: 0, nickname: '아이작 뉴턴', note: '학회에 속했으나 연구는 홀로 함' },
  { score: -25, nickname: '구스타프 말러', note: '여름마다 홀로 작곡 오두막에 은둔' },
  { score: -38, nickname: '장자', note: '쓸모없음을 자처하며 얽매임에서 벗어남' },
  { score: -45, nickname: '글렌 굴드', note: '무대를 버리고 녹음실에 홀로 남음' },
] as const

const CAUTIOUS_BOLD: readonly SpectrumAnchor[] = [
  { score: 45, nickname: '알렉산더 대왕', note: '퇴로 없는 원정을 감행' },
  { score: 40, nickname: '칭기즈 칸', note: '병력 열세에도 먼저 침' },
  { score: 25, nickname: '스티븐 호킹', note: '통념을 뒤집는 주장을 감행' },
  { score: 0, nickname: '에이브러햄 링컨', note: '때를 재다가 결정적 순간에 밀어붙임' },
  { score: -25, nickname: '장자', note: '쓸모없는 나무가 베이지 않는다는 처세' },
  { score: -35, nickname: '니콜라우스 코페르니쿠스', note: '10년 넘게 숙고한 뒤에야 출판' },
  { score: -40, nickname: '유선', note: '싸움을 피하고 자리를 지킴' },
] as const

export const SPECTRUM_ANCHORS: Record<SpectrumAxis, readonly SpectrumAnchor[]> = {
  command: COMMAND,
  martial: MARTIAL,
  intellect: INTELLECT,
  charm: CHARM,
  temperance: TEMPERANCE,
  diligence: DILIGENCE,
  reflection: REFLECTION,
  courage: COURAGE,
  loyalty: LOYALTY,
  benevolence: BENEVOLENCE,
  fairness: FAIRNESS,
  humility: HUMILITY,
  pessimism_optimism: PESSIMISM_OPTIMISM,
  conservative_progressive: CONSERVATIVE_PROGRESSIVE,
  individual_social: INDIVIDUAL_SOCIAL,
  cautious_bold: CAUTIOUS_BOLD,
}

// ─────────────────────────────────────────────────────────────
// KOEI 삼국지 대응 — 삼국지 인물을 채점할 때만 참고한다
// ─────────────────────────────────────────────────────────────

/**
 * 삼국지 게임 수치는 실존 인물과 척도가 다르다(무장 무력이 전반적으로 높다).
 * 삼국지 인물끼리의 상대 서열을 잡을 때만 쓰고, 실존 인물과 직접 견주지 마라.
 */
export const THREE_KINGDOMS_ANCHORS: Partial<Record<SpectrumAxis, readonly SpectrumAnchor[]>> = {
  martial: [
    { score: 100, nickname: '여포', note: '삼국지 무력 최정점' },
    { score: 98, nickname: '장비', note: '' },
    { score: 97, nickname: '관우', note: '' },
    { score: 96, nickname: '조운', note: '' },
    { score: 90, nickname: '손책', note: '' },
    { score: 79, nickname: '조조', note: '군주이면서 직접 전장에 섬' },
    { score: 55, nickname: '제갈량', note: '' },
    { score: 35, nickname: '순욱', note: '문관' },
  ],
  intellect: [
    { score: 100, nickname: '제갈량', note: '' },
    { score: 98, nickname: '사마의', note: '' },
    { score: 96, nickname: '가후', note: '' },
    { score: 94, nickname: '순욱', note: '' },
    { score: 80, nickname: '조조', note: '' },
    { score: 62, nickname: '조운', note: '' },
    { score: 25, nickname: '여포', note: '' },
  ],
  command: [
    { score: 98, nickname: '조조', note: '' },
    { score: 96, nickname: '제갈량', note: '' },
    { score: 94, nickname: '관우', note: '' },
    { score: 90, nickname: '여몽', note: '' },
    { score: 85, nickname: '장료', note: '' },
    { score: 75, nickname: '장비', note: '' },
    { score: 50, nickname: '여포', note: '개인 무용은 최정상이나 사람을 못 다룸' },
  ],
  charm: [
    { score: 98, nickname: '유비', note: '' },
    { score: 96, nickname: '조조', note: '' },
    { score: 92, nickname: '제갈량', note: '' },
    { score: 85, nickname: '조운', note: '' },
    { score: 30, nickname: '여포', note: '거듭된 배신으로 신망을 잃음' },
  ],
}

// ─────────────────────────────────────────────────────────────
// 채점 원칙
// ─────────────────────────────────────────────────────────────

/**
 * 통솔 판정 — 무엇을 "조직을 굴린 기록"으로 칠 것인가.
 * 26.08.08 배치 시험에서 같은 인물(가수)에게 통솔 58과 44가 갈렸다. 한쪽은 이름을 붙인
 * 브랜드 사업을 경영으로 봤고, 다른 쪽은 라이선싱이라 보았다. 아래로 가른다.
 */
export const COMMAND_JUDGMENT = {
  /** 통솔로 세는 것 */
  counts: [
    '사람을 뽑고 자르고 배치하는 권한을 실제로 행사했다',
    '조직의 예산·전략을 스스로 결정했다',
    '군대·관청·기업·악단·제작 현장처럼 지휘 계통이 있는 집단을 이끌었다',
  ],
  /** 다른 축이 맡는 것 — 통솔 대신 여기서 잰다 */
  belongsElsewhere: [
    '작품 판매고·흥행 성적·팔로워 수 → 매력',
    '사상적 영향력·후대에 미친 파급 → 지력',
    '이름만 빌려준 사업, 지분만 가진 경우, 결정권 없는 자문·명예직 → 통솔 근거로는 약하다. 실제 결정권이 확인되면 그만큼 센다',
  ],
  /** 근거 문장에 규모를 적는다. 몇 명을, 몇 년간 이끌었는지가 점수를 가른다. */
  requireScale: '통솔 근거에는 인원 규모 또는 재임 기간을 적는다. "회사를 세웠다"만으로는 자리를 잡기 어렵다.',
} as const

/**
 * 매력 판정 — 언제를 기준으로 잴 것인가.
 * 같은 시험에서 매력 80과 68이 갈렸다. 한쪽은 대표작 시절을, 다른 쪽은 최근 논란 이후를 봤다.
 */
export const CHARM_JUDGMENT = {
  basis: '생애 정점을 기준으로 잰다. 기준점 인물(먼로 99·엘비스 98)이 모두 정점 기준이므로 여기에 맞춘다.',
  note: [
    '말년의 인기 하락이나 최근 논란은 겸양·공정·절제가 이미 담는다. 매력은 그 사람이 가장 빛나던 때의 흡인력을 잰다.',
    '생전 내내 대중과 척진 인물(힘러 25)은 정점 자체가 낮은 경우다.',
  ],
} as const

export const SCORING_PRINCIPLES: readonly string[] = [
  '16축 각각에 대해 그 인물의 근거를 찾아 정리하고, 정리한 근거대로 점수를 낸다.',
  '근거가 얇은 축은 그 인물의 다른 행적에서 성향을 읽어 매긴다.',
  '점수는 행적에서 나온다. 직군 기본값은 행적이 전혀 잡히지 않을 때의 마지막 수단이다.',
  '기준점 인물과 하나씩 견주어 자리를 잡는다.',
  '고점이든 저점이든 근거를 함께 적는다. 15점에도 95점에도 행적을 밝힌다.',
  '인물 간 상대 비교로 서열을 정한 뒤 점수를 매긴다. 기계적으로 같은 값을 반복해 찍지 않는다.',
]

/**
 * 채점 절차 — 조사와 채점을 분리한다.
 * 26.08.08 배치 시험에서 같은 인물의 통솔이 14점 갈렸고, 원인은 척도가 아니라 조사 깊이였다.
 * 한쪽은 브랜드 사업의 실체를 확인했고 다른 쪽은 확인하지 않았다.
 */
export const SCORING_PROCEDURE: readonly string[] = [
  '1단계 — 사실 수집: 이 인물이 실제로 무엇을 운영했고(인원·기간), 어떤 신체 활동 기록이 있고, 무엇을 만들었는지 확인한다. 이 단계에서는 점수를 매기지 않는다.',
  '2단계 — 불확실 표시: 확인되지 않은 항목은 "미확인"으로 남긴다. 짐작으로 메우지 않는다.',
  '3단계 — 기준점 대조: SPECTRUM_ANCHORS의 인물과 하나씩 견주어 점수를 낸다.',
  '4단계 — 근거 작성: reason_ko에 1단계에서 확인한 사실만 쓴다. 미확인 항목을 근거로 쓰지 않는다.',
]
