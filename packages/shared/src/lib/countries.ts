// 국가 코드(ISO 3166-1 alpha-2) → 한글명/영문명 변환
// 브라우저·Node 내장 Intl.DisplayNames 기반, 외부 API 의존 없음. 서버/클라이언트 공용
import type { Country } from '../types'

// ISO 3166-1 alpha-2 국가 코드 전체 목록
const COUNTRY_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR',
  'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM',
  'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ',
  'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB',
  'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GT', 'GU', 'GW',
  'GY', 'HK', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS',
  'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY',
  'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD',
  'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU',
  'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR',
  'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT',
  'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH',
  'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC',
  'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ',
  'UA', 'UG', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'YE',
  'YT', 'ZA', 'ZM', 'ZW',
]

// 국가 목록을 한 번만 빌드 (모듈 로드 시 1회)
function buildCountries(): Country[] {
  const koNames = new Intl.DisplayNames(['ko'], { type: 'region' })
  const enNames = new Intl.DisplayNames(['en'], { type: 'region' })

  return COUNTRY_CODES
    .map((code) => {
      const name_en = enNames.of(code) || code
      return {
        name: koNames.of(code) || name_en,
        name_en,
        code,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
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
  if (!code) return ''
  const country = getCountries().find((c) => c.code === code)
  return country?.name || code
}

// 국가 코드 → 로케일 기반 국가명 (동기)
export function getCountryNameByLocale(code: string, locale: string): string {
  if (!code) return ''
  const country = getCountries().find((c) => c.code === code)
  if (!country) return code
  return locale === 'en' ? country.name_en : country.name
}

// 국가 코드 → 한글명 변환 (비동기, 기존 인터페이스 유지)
export async function getCountryNameAsync(code: string): Promise<string> {
  return getCountryName(code)
}

// 여러 국가 코드 → 한글명 일괄 변환 (비동기, 기존 인터페이스 유지)
export async function getCountryNamesMap(codes: string[]): Promise<Record<string, string>> {
  const countries = getCountries()
  const map: Record<string, string> = {}
  for (const code of codes) {
    if (!code) continue
    const country = countries.find((c) => c.code === code)
    map[code] = country?.name || code
  }
  return map
}
