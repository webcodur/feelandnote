// 국가 코드(ISO 3166-1 alpha-2) → 한글명/영문명 변환
// 브라우저·Node 내장 Intl.DisplayNames 기반, 외부 API 의존 없음. 서버/클라이언트 공용
import type { Country } from '../types'

// ISO 3166-1 alpha-2 국가 코드와 서비스가 지원하는 코소보(XK)
const COUNTRY_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR',
  'BS', 'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM',
  'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ',
  'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB',
  'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW',
  'GY', 'HK', 'HM', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS',
  'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY',
  'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD',
  'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU',
  'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR',
  'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT',
  'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH',
  'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC',
  'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ',
  'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'XK', 'YE',
  'YT', 'ZA', 'ZM', 'ZW',
]

const countryCodes = new Set(COUNTRY_CODES)

// 기존 인물 데이터의 역사적 국적이다. 현재 러시아·체코·세르비아 국기로 바꾸지 않는다.
const HISTORICAL_COUNTRIES: Record<string, { name: string; name_en: string }> = {
  SU: { name: '소련', name_en: 'Soviet Union' },
  CS: { name: '체코슬로바키아', name_en: 'Czechoslovakia' },
}

export function isCountryCode(code: string): boolean {
  return countryCodes.has(code.trim().toUpperCase())
}

/**
 * 국적을 특정할 수 없는 인물에 쓰는 코드. ISO 3166-1이 사용자 지정용으로 비워 둔 자리라
 * 실제 국가와 충돌하지 않는다.
 *
 * **비워 두는 것과 다르다.** 빈 값은 "아직 조사하지 않았다"는 뜻이고, 이 코드는
 * "조사했으나 특정할 수 없다"는 뜻이다. 익명 활동가처럼 신원 비공개가 그 인물의 성격인
 * 경우에도 이 값을 쓴다 — 추정으로 국가를 붙이는 것이 오히려 사실을 왜곡한다.
 */
export const UNKNOWN_COUNTRY_CODE = 'XX'

const UNKNOWN_COUNTRY: Country = { code: UNKNOWN_COUNTRY_CODE, name: '미확인', name_en: 'Unknown' }

// 국가 목록을 한 번만 빌드 (모듈 로드 시 1회)
function buildCountries(): Country[] {
  const koNames = new Intl.DisplayNames(['ko'], { type: 'region' })
  const enNames = new Intl.DisplayNames(['en'], { type: 'region' })

  const countries = COUNTRY_CODES
    .map((code) => {
      const name_en = enNames.of(code) || code
      return {
        name: koNames.of(code) || name_en,
        name_en,
        code,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  // 실제 국가가 아니므로 이름순에 섞지 않고 목록 맨 뒤에 둔다
  countries.push(UNKNOWN_COUNTRY)
  return countries
}

// 모듈 레벨 캐시 (lazy 빌드)
let countriesCache: Country[] | null = null

function getCountries(): Country[] {
  if (!countriesCache) countriesCache = buildCountries()
  return countriesCache
}

// 국가 데이터 조회 (기존 비동기 인터페이스 유지)
export async function fetchCountries(): Promise<Country[]> {
  return getCountries()
}

// 국가 코드 → 한글명 변환 (동기)
export function getCountryName(code: string): string {
  return getCountryNameByLocale(code, 'ko')
}

// 국가 코드 → 로케일 기반 국가명 (동기)
export function getCountryNameByLocale(code: string, locale: string): string {
  const value = code?.trim()
  if (!value) return ''
  const normalized = value.toUpperCase()
  const country = HISTORICAL_COUNTRIES[normalized] ?? getCountries().find((c) => c.code === normalized)
  // 이미 이름인 값은 보존하고, 해석할 수 없는 짧은 코드는 미확인으로 표시한다.
  if (!country) return /^[A-Z0-9_-]{1,3}$/i.test(value) ? (locale === 'en' ? UNKNOWN_COUNTRY.name_en : UNKNOWN_COUNTRY.name) : value
  return locale === 'en' ? country.name_en : country.name
}

// 국가 코드 → 한글명 변환 (비동기, 기존 인터페이스 유지)
export async function getCountryNameAsync(code: string): Promise<string> {
  return getCountryName(code)
}

// 여러 국가 코드 → 한글명 일괄 변환 (비동기, 기존 인터페이스 유지)
export async function getCountryNamesMap(codes: string[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  for (const code of codes) {
    if (!code) continue
    map[code] = getCountryName(code)
  }
  return map
}
