import { redirect } from 'next/navigation'

/** 옛 태그 관리 주소 — 도감 테마 관리는 세력도 화면으로 합쳤다(26.07.25) */
export default function TagsPage() {
  redirect('/factions')
}
