'use client'

import { useState, useEffect } from 'react'
import { fetchCountries, getCountryName } from '../lib/countries'
import type { Country } from '../types'

export { getCountryName }

export function useCountries() {
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCountries()
      .then(setCountries)
      .catch((err) => setError(err instanceof Error ? err.message : '알 수 없는 오류'))
      .finally(() => setLoading(false))
  }, [])

  return { countries, loading, error, getCountryName }
}
