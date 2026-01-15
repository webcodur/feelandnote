'use client'

import { useCountries, getCountryName } from '@/hooks/useCountries'

interface Props {
  code: string | null | undefined
}

// 국가 코드를 한글명으로 변환하여 출력하는 컴포넌트
// useCountries 훅으로 캐시 로딩을 보장한다
export default function NationalityText({ code }: Props) {
  // 훅 호출로 캐시 초기화 보장
  useCountries()

  if (!code) return null

  return <span>{getCountryName(code)}</span>
}
