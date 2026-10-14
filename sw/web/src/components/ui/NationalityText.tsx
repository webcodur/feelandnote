'use client'

import { useLocale } from 'next-intl'
import { getCountryNameByLocale } from '@/lib/countries'
import { getCountryFlagCode } from '@/lib/utils/countryFlag'
import CountryFlag from './CountryFlag'

interface Props {
  code: string | null | undefined
  display?: 'text' | 'flag' | 'both'
  className?: string
}

// 국가명은 현재 언어를 따른다. 국기가 없는 코드는 표시 방식에 관계없이 이름을 남긴다.
export default function NationalityText({ code, display = 'flag', className = '' }: Props) {
  const locale = useLocale()
  const normalized = code?.trim()
  if (!normalized) return null

  const name = getCountryNameByLocale(normalized, locale)
  const flagCode = getCountryFlagCode(normalized)
  if (display === 'text' || !flagCode) return <span className={className}>{name}</span>
  if (display === 'flag') return <CountryFlag code={flagCode} label={name} className={className} />

  return <span className={`inline-flex items-center gap-1.5 ${className}`}>
    <CountryFlag code={flagCode} />
    <span className="min-w-0 truncate">{name}</span>
  </span>
}
