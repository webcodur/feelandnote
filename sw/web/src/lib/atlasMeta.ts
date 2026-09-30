/**
 * 신화·세력 주소의 검색 제목·설명 — 순수 함수만 둔다. 조회는 페이지가 한다.
 *
 * 제목은 사람들이 실제로 치는 말을 담는다 — 신화는 「오디세이아 줄거리와 등장인물」, 세력은 「페이팔 마피아: 피터 틸·일론 머스크 등」.
 * 설명은 한 줄 정의로 시작해 「만나 보세요!」로 끝낸다(266개 실데이터로 검수한 호객형 — 26.09.30 채택):
 * 그룹이 둘 이상이면 「그룹1, 그룹2, 그룹3 등으로 나뉜 인물들을」을, 그룹 이름이 이미 사람을 가리키면 「…로 나눠」를,
 * 그룹이 없거나 하나뿐이면 아직 부르지 않은 사람으로 「…도 만나 보세요!」를 쓴다. 인원·책 수는 넣지 않는다 —
 * 명단은 자주 바뀌는데 검색 결과는 다음 방문까지 옛 숫자를 보인다(26.09.29 유저 지시). 규칙 원문은 ops-02-seo.md 「신화·세력도감」.
 */
import { estimateTitleWidth } from './celeb/meta'
import { withParticle } from './korean-particle'
import { appendWithinSnippet } from './seoSentences'

/** 사이트명 접미사(「 | 필앤노트」)를 뺀 제목 본문 폭 — 기관 선정 제목과 같은 예산 */
const TITLE_WIDTH_BUDGET = 24
/** 설명에 부르는 그룹·인물 수 */
const NAMED_IN_LIST = 3
/** 「그 외」 묶음은 그룹 이름으로 부르지 않는다 */
const ETC_GROUPS = new Set(['그 외', '기타', 'Others', 'Other'])
/**
 * 그룹 이름이 이미 사람을 가리키는 꼬리 — 참이면 「인물들」을 다시 붙이지 않고 「…로 나눠 만나 보세요!」로 끝낸다
 * (「떠난 인물로 나뉜 인물들을」처럼 겹치는 문장을 피한다). 어중간하면 사람이 아닌 쪽으로 둔다 — 「…으로 나뉜 인물들을」은 어느 그룹에도 성립한다.
 */
const PEOPLE_GROUP = /(들|진|파|영|실|신|족|세대|정령|인물|사람|계보|일가|일행|사단|패밀리|잔당|동맹|수장|수뇌|가문|왕가|가족|후예|주인공|빌런|왕|여왕|공주|왕자|사상가|학자|작가|과학자|발명가|정치인|운동가|철학자|예언자|전문가|요원|승려|사제|신관|리더|거장|스타|아티스트|가수|스트리머|유튜버|해커|지휘관|지휘자|촌장|족장|선조|조상|시조|비행사|선구자|창업자|투자자|폭로자|기업가|기업인|선언자|복수자|신스틸러|발굴자|개척자|해독가|지도자|구혼자|배신자|조언자|영웅|히어로|전사|선수|공격수|수비수|골키퍼|미드필더|센터|가드|간판|단골|기사|무사|장군|신하|대신|귀족|평민|노예|시민|상인|도적|해적|용병|음악가|작곡가|시인|화가|건축가|디자이너|엔지니어|의사|교사|교수|의원|대표|임원|멤버|동료|선배|후배|친구|부하|측근|심복|가신|병사|군인|장교|사령관|원수|제독|함장|선장|선원|항해사|탐험가|모험가|사냥꾼|어부|농부|목동|장인|명장|대가|천재|신동|마녀|무녀|선녀|점쟁이|현자|성자|보살|여래|천왕|신장|용왕|산신|도깨비|요괴|귀신|괴수|괴물|거인|요정|마왕|용사|아이돌|래퍼|보컬|댄서|연주자|연출가|극작가|소설가|조각가|프로그래머|수학자|역사가|고고학자|경제학자|독립운동가|총리|대통령|수상|장관|대사|외교관|교황|주교|목사|신부|수도사|판사|변호사|형사|탐정|스파이|암살자|검객|궁수|기병|사절|특사|전령|행상|포수|목수|석공|남자|여인|소년|소녀|청년|노인|어린이|죄수|수감자|망명자|난민|유민|피난민|생존자|희생자|순교자|후계자|계승자|창시자|창립자|설립자|개발자|제작진|연구진|지도부|수뇌부|간부|에이스|베테랑|루키|신인|고수|달인|명인|교주|성인|현인|군자|의인|산적|노비|기생|광대|궁인|궁녀|내시|환관|시종|하인|하녀|유모|보모|교육자|계몽가|석학|야인|은사|도인|신선|선비|유생|주술사|무당|샤먼|법사|마법사|마술사|음양사|엘프|드워프|호빗|드래곤|켄타우로스|세이렌|머메이드|사이클롭스|스핑크스|아수라|야크샤|천신|지신|총수|코미디언)$/
/** 한 줄 정의가 불렀는지 가릴 때 세지 않는 토막 — 칭호·관사처럼 다른 사람 이름에도 흔히 든다 */
const KO_TITLE_WORDS = new Set(['대왕', '황제', '여왕', '국왕', '왕자', '공주', '대제', '주니어'])
const EN_SKIP_WORDS = new Set(['the', 'and', 'of', 'von', 'van', 'der', 'den', 'del', 'de', 'da', 'la', 'le', 'du', 'al', 'el', 'bin', 'ibn', 'jr', 'sr', 'sir', 'king', 'queen', 'lady', 'prince', 'princess', 'emperor', 'great', 'saint'])

type Locale = 'ko' | 'en'

const listEn = (items: readonly string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

const sentence = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`)

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * 한 줄 정의가 이 사람을 불렀는가 — 성이나 이름 한 토막만 불러도 센다(「도요토미 히데요시」 → 히데요시).
 * 한국어는 조사가 붙으므로 글자 포함으로, 로마자는 낱말 머리에서 맞춘다. 칭호·관사(대왕·of)와 서수(1세)는 세지 않는다.
 */
function namedIn(text: string, name: string): boolean {
  return name.split(/[\s\-·]+/).some((raw) => {
    const token = raw.replace(/[.,'’]/g, '')
    if (/[가-힣]/.test(token)) {
      if (token.length < 2 || /^\d/.test(token) || KO_TITLE_WORDS.has(token)) return false
      // 칭호가 붙은 이름은 떼고도 맞춘다 — 「세종대왕」을 「세종과 강희제처럼」이 이미 불렀다
      const bare = token.replace(/(대왕|대제|황제|여왕|국왕)$/, '')
      return text.includes(token) || (bare.length >= 2 && bare !== token && text.includes(bare))
    }
    // RM·JD 같은 대문자 약칭은 두 글자도 이름으로 세고, of·de 같은 관사 토막은 세지 않는다
    if ((token.length < 3 && !/^[A-Z]{2,}$/.test(token)) || EN_SKIP_WORDS.has(token.toLowerCase())) return false
    return new RegExp(`(^|[^\\p{L}])${escapeRegExp(token)}`, 'u').test(text)
  })
}

/** 같은 사람을 가리키는 이름인가(띄어쓰기·붙임표·대소문자 무시) — 「임꺽정」 세력의 「임꺽정」 */
const sameName = (a: string, b: string) => a.replace(/[\s\-·]/g, '').toLowerCase() === b.replace(/[\s\-·]/g, '').toLowerCase()

export interface MythMetaInput {
  name: string
  headline: string | null
  description: string | null
  /** 대표 인물 이름(차례대로). 제목은 앞 두 명, 설명은 아직 부르지 않은 앞 세 명을 쓰므로 여섯 명쯤 넘긴다 */
  leads: readonly string[]
  /** 명단 인원 — 화면에 싣지 않고 「등」을 붙일지만 가른다 */
  memberCount: number
  /** 표시 차례대로 현지화된 그룹 이름(null은 「그 외」 묶음) — 「…으로 나뉜 인물들을 만나 보세요!」에 쓴다 */
  groups?: readonly (string | null)[]
}

/**
 * 「만나 보세요!」 마무리 — 그룹이 둘 이상이면 그룹 이름으로(「촉한, 위나라, 오나라 등으로 나뉜 인물들을」),
 * 그룹 이름이 이미 사람을 가리키면 「…로 나눠」로 줄이고(「지도부, 연구진, 떠난 인물로」), 그룹이 없거나 하나뿐이면
 * 제목·한 줄 정의가 부르지 않은 사람을 싣는다(「슈가·정국도 만나 보세요!」). 부를 사람이 없으면 이름을 받는다.
 */
function closing(input: MythMetaInput, characters: boolean, locale: Locale, title: string): string {
  const groups = (input.groups ?? [])
    .map((name) => name?.trim())
    .filter((name): name is string => Boolean(name) && !ETC_GROUPS.has(name!))
  const noun = characters ? (locale === 'en' ? 'characters' : '등장인물') : (locale === 'en' ? 'members' : '인물들')
  if (groups.length >= 2) {
    const shown = groups.slice(0, NAMED_IN_LIST)
    const more = groups.length > shown.length
    if (locale === 'en') return `Meet the ${noun}, grouped into ${listEn(shown)}${more ? ', and more' : ''}!`
    const list = shown.join(', ') + (more ? ' 등' : '')
    return shown.some((group) => PEOPLE_GROUP.test(group))
      ? `${withParticle(list, 'direction')} 나눠 만나 보세요!`
      : `${withParticle(list, 'direction')} 나뉜 ${withParticle(noun, 'object')} 만나 보세요!`
  }
  const already = (name: string) => namedIn(title, name) || namedIn(input.headline ?? '', name) || sameName(name, input.name)
  const rest = input.leads.filter((name) => !already(name))
  const listed = rest.slice(0, NAMED_IN_LIST)
  const more = rest.length > listed.length
  if (listed.length === 0) {
    return locale === 'en' ? `Meet the ${noun} of ${input.name}!` : `${input.name}의 ${withParticle(noun, 'object')} 만나 보세요!`
  }
  if (locale === 'en') {
    const list = listEn(listed) + (more ? ', and more' : '')
    return rest.length < input.leads.length ? `Meet ${list}, too!` : `Meet ${input.name}'s ${noun} — ${list}!`
  }
  const list = listed.join('·')
  return rest.length < input.leads.length
    ? `${list}${more ? ' 등도' : '도'} 만나 보세요!`
    : `${list}${more ? ' 등' : ''} ${input.name}의 ${withParticle(noun, 'object')} 만나 보세요!`
}

/** 한 줄 정의로 시작해 「만나 보세요!」로 끝낸다. 한 줄 정의가 없으면 소개글의 끝난 문장을 대신 싣는다 */
function describe(input: MythMetaInput, characters: boolean, locale: Locale, title: string): string {
  if (!input.headline) return appendWithinSnippet(sentence(input.name), input.description)
  return `${sentence(input.headline)} ${closing(input, characters, locale, title)}`
}

export function buildMythTitle(input: Pick<MythMetaInput, 'name'>, locale: Locale): string {
  return locale === 'en' ? `${input.name}: Story and Characters` : `${input.name} 줄거리와 등장인물`
}

export function buildMythDescription(input: MythMetaInput, locale: Locale): string {
  return describe(input, true, locale, input.name)
}

export interface FactionMetaInput extends MythMetaInput {
  /** 이야기 속 세력(홍길동전) — 사람을 「등장인물」로 부른다 */
  isFiction: boolean
}

/** 「이름: 대표 2명 등」. 폭을 넘으면 대표를 한 명으로, 그래도 넘치면 「이름 주요 인물」로 둔다 */
export function buildFactionTitle(input: FactionMetaInput, locale: Locale): string {
  // 세력 이름과 같은 사람(「임꺽정」의 임꺽정)은 제목에서 되풀이하지 않는다
  const leads = input.leads.filter((lead) => !sameName(lead, input.name))
  const n = input.memberCount - (input.leads.length - leads.length)
  const [a, b] = leads
  const candidates = locale === 'en'
    ? [
      a && b && n > 2 ? `${input.name}: ${a}, ${b} and Others` : null,
      a && b && n === 2 ? `${input.name}: ${a} and ${b}` : null,
      a && n > 1 ? `${input.name}: ${a} and Others` : null,
      a && n === 1 ? `${input.name}: ${a}` : null,
      `${input.name}: ${input.isFiction ? 'Characters' : 'Key Figures'}`,
    ]
    : (() => {
      const label = input.isFiction ? `${input.name} 등장인물` : input.name
      return [
        a && b && n > 2 ? `${label}: ${a}·${b} 등` : null,
        a && b && n === 2 ? `${label}: ${a}·${b}` : null,
        a && n > 1 ? `${label}: ${a} 등` : null,
        a && n === 1 ? `${label}: ${a}` : null,
        input.isFiction ? label : `${input.name} 주요 인물`,
      ]
    })()
  const usable = candidates.filter((title): title is string => Boolean(title))
  return usable.find((title) => estimateTitleWidth(title) <= TITLE_WIDTH_BUDGET) ?? usable[usable.length - 1]
}

export function buildFactionDescription(input: FactionMetaInput, locale: Locale): string {
  return describe(input, input.isFiction, locale, buildFactionTitle(input, locale))
}
