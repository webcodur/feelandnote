'use client'

import { useState, useEffect } from 'react'
import { COUNTRY_NAMES, getCountryName as getStaticCountryName } from '@/constants/countries'

interface Country {
  name: string
  code: string
}

interface RestCountryResponse {
  name: { common: string }
  translations?: { kor?: { common?: string } }
  cca2: string
}

// 모듈 레벨 캐시
let countriesCache: Country[] | null = null
let cachePromise: Promise<Country[]> | null = null

async function fetchCountriesData(): Promise<Country[]> {
  if (countriesCache) return countriesCache

  if (cachePromise) return cachePromise

  cachePromise = fetch('https://restcountries.com/v3.1/all?fields=name,translations,cca2')
    .then((res) => {
      if (!res.ok) throw new Error('국가 목록을 가져오는데 실패했습니다.')
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
    .catch(() => {
      // API 실패 시 정적 매핑 사용
      const fallback = Object.entries(COUNTRY_NAMES).map(([code, name]) => ({ code, name }))
      countriesCache = fallback
      return fallback
    })

  return cachePromise
}

// 국가 코드 → 한글명 변환 (동적 캐시 우선, 없으면 정적 매핑)
export function getCountryName(code: string): string {
  if (!code) return ''
  if (countriesCache) {
    const country = countriesCache.find((c) => c.code === code)
    if (country) return country.name
  }
  return getStaticCountryName(code)
}

// REST Countries API에서 국가 목록 가져오기
export function useCountries() {
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCountriesData()
      .then(setCountries)
      .catch((err) => setError(err instanceof Error ? err.message : '알 수 없는 오류'))
      .finally(() => setLoading(false))
  }, [])

  return { countries, loading, error, getCountryName }
}
