// 국가 코드(ISO 3166-1 alpha-2) → 한글명 변환
// REST Countries API 기반, 서버/클라이언트 공용
import type { Country } from '../types'

interface RestCountryResponse {
  name: { common: string }
  translations?: { kor?: { common?: string } }
  cca2: string
}

// 모듈 레벨 캐시 (서버: 프로세스 수명, 클라이언트: 세션 수명)
let countriesCache: Country[] | null = null
let cachePromise: Promise<Country[]> | null = null

// 국가 데이터 fetch (캐싱 적용)
export async function fetchCountries(): Promise<Country[]> {
  if (countriesCache) return countriesCache
  if (cachePromise) return cachePromise

  cachePromise = fetch('https://restcountries.com/v3.1/all?fields=name,translations,cca2', {
    next: { revalidate: 86400 }, // 24시간 캐시 (Next.js 서버)
  } as RequestInit)
    .then((res) => {
      if (!res.ok) throw new Error('국가 목록 조회 실패')
      return res.json()
    })
    .then((data: RestCountryResponse[]) => {
      const formatted = data
        .map((c) => ({
          name: c.translations?.kor?.common || c.name.common,
          code: c.cca2,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

      countriesCache = formatted
      return formatted
    })
    .catch((err) => {
      console.error('REST Countries API 오류:', err)
      cachePromise = null
      return []
    })

  return cachePromise
}

// 국가 코드 → 한글명 변환 (동기, 캐시 필요)
export function getCountryName(code: string): string {
  if (!code) return ''
  if (!countriesCache) return code
  const country = countriesCache.find((c) => c.code === code)
  return country?.name || code
}

// 국가 코드 → 한글명 변환 (비동기, 캐시 없어도 작동)
export async function getCountryNameAsync(code: string): Promise<string> {
  if (!code) return ''
  const countries = await fetchCountries()
  const country = countries.find((c) => c.code === code)
  return country?.name || code
}

// 여러 국가 코드 → 한글명 일괄 변환 (비동기)
export async function getCountryNamesMap(codes: string[]): Promise<Record<string, string>> {
  const countries = await fetchCountries()
  const map: Record<string, string> = {}
  for (const code of codes) {
    if (!code) continue
    const country = countries.find((c) => c.code === code)
    map[code] = country?.name || code
  }
  return map
}
