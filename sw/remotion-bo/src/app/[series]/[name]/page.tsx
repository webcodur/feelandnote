import { redirect } from 'next/navigation'
import { isFactionSeries } from '@/lib/series-registry'

export default async function EpisodePage({ params }: { params: Promise<{ series: string; name: string }> }) {
  const { series, name: rawName } = await params
  const name = decodeURIComponent(rawName)
  // 세력도: 편집 언어·탭이 세부 페이지(/[lang]/[tab])다 — 기본값(둘 다·정보)으로 보낸다
  if (isFactionSeries(series)) redirect(`/${series}/${encodeURIComponent(name)}/both/info`)
  redirect(`/${series}/${encodeURIComponent(name)}/scenario`)
}
