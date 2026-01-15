'use client'

import { useState, useEffect } from 'react'

interface Country {
  name: string
  code: string
}

interface RestCountryResponse {
  name: { common: string }
  translations?: { kor?: { common?: string } }
  cca2: string
}

// REST Countries API에서 국가 목록 가져오기
export function useCountries() {
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCountries() {
      try {
        const res = await fetch('https://restcountries.com/v3.1/all?fields=name,translations,cca2')
        if (!res.ok) throw new Error('국가 목록을 가져오는데 실패했습니다.')

        const data: RestCountryResponse[] = await res.json()

        // 한글 번역명 우선, 없으면 영문명 사용
        const formatted: Country[] = data
          .map((c) => ({
            name: c.translations?.kor?.common || c.name.common,
            code: c.cca2,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

        setCountries(formatted)
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류')
      } finally {
        setLoading(false)
      }
    }

    fetchCountries()
  }, [])

  return { countries, loading, error }
}
