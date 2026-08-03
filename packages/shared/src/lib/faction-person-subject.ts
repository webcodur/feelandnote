/**
 * faction_people의 주체 경계.
 *
 * faction_people는 자연인 또는 하나의 이름·행위 주체를 가진 개별 허구 인물만 담는다.
 * 회사·조직·제품·기계·기체·부대·종족·듀오는 faction_groups와 미디어 문맥으로 관리한다.
 * 완전한 의미 판별기는 아니며, 과거 사고에서 확인된 명백한 비인물 입력을 모든 진입점에서 막는 가드다.
 */

const EXACT_NON_PERSON_NAMES = new Set([
  'waymo', 'tesla (fsd)', 'cruise', 'boeing', 'airbus', 'c919',
  'shield ai', 'bae systems', 'rheinmetall', 'dji', 'skydio',
  'nuscale', 'terrapower', 'x-energy', 'commonwealth fusion', 'helion energy',
  'tae technologies', 'quantumscape', 'catl', 'byd', 'rivian', 'lucid motors',
  'lg에너지솔루션', 'panasonic', 'cia', 'mi6 (sis)', 'mossad',
  'sas', 'devgru (seal team 6)', '어나니머스', '럴즈섹', '다크사이드',
  '죽은 소의 교단', '하르피이아', '라이스트뤼고네스', '라이스트뤼고네스족',
  '세이렌', '로토스파고스족', '기주키의 형제들',
])

const KOREAN_NON_PERSON = /(형제|자매|족$|조직|단체|집단|협회|재단|위원회|교단|부대|특임단|군단|함대|자주포|전투기|폭격기|미사일|전차|로봇)/
const ENGLISH_NON_PERSON = /\b(brothers|sisters|twins|collective|organization|association|foundation|committee|systems|technologies|motors|airlines|airways|corporation|company|group|team|brigade|battalion|missile|bomber|fighter aircraft|tank|robot|harpies|sirens|lotus-eaters|laestrygonians)\b/i
const MODEL_NON_PERSON = /^(?:F-\d|B-\d|K[29]\b|M1\b|Falcon (?:9|Heavy)$|Starship$|Dragon$|New (?:Shepard|Glenn)$|Saturn V$|SLS$|Atlas V$|Vulcan Centaur$|Electron$|Neutron$|Figure \d|NEO Beta$|Unitree G1$)/i

function normalized(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function nonIndividualFactionSubjectReason(name: unknown, nameEn?: unknown): string | null {
  const ko = normalized(name)
  const en = normalized(nameEn)
  const values = [ko, en].filter(Boolean)
  if (!ko) return '이름이 없는 행'
  if (values.some(value => value.includes('&') || /\s\/\s/.test(value))) return '둘 이상을 묶은 이름'
  if (values.some(value => EXACT_NON_PERSON_NAMES.has(value.toLocaleLowerCase('en')))) return '회사·조직·집단 이름'
  if (KOREAN_NON_PERSON.test(ko)) return '조직·집단·장비를 뜻하는 이름'
  if (ENGLISH_NON_PERSON.test(en)) return '조직·집단·장비를 뜻하는 영문 이름'
  if (MODEL_NON_PERSON.test(ko) || MODEL_NON_PERSON.test(en)) return '제품·기체·장비 모델명'
  return null
}

export function assertIndividualFactionSubject(
  name: unknown,
  nameEn?: unknown,
  label = '팩션 인물',
): void {
  const reason = nonIndividualFactionSubjectReason(name, nameEn)
  if (!reason) return
  throw new Error(`${label}(${normalized(name) || normalized(nameEn)})은 개별 인물이 아닙니다: ${reason}. 회사·조직·제품·기계·부대·집단은 세력(그룹)으로 관리하세요.`)
}
