'use client'

import { MapPin } from 'lucide-react'
import { useCountries, getCountryName } from '@/hooks/useCountries'

interface Props {
  code: string
}

export default function NationalityBadge({ code }: Props) {
  // 훅 호출로 캐시 초기화 보장
  useCountries()

  if (!code) return null

  const name = getCountryName(code)

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-400">
      <MapPin className="w-3 h-3" />{name}
    </span>
  )
}
