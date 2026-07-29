import { redirect } from 'next/navigation'

export default async function VoicePage({ params }: { params: Promise<{ series: string; name: string }> }) {
  const { series, name: rawName } = await params
  const name = decodeURIComponent(rawName)
  redirect(`/${series}/${encodeURIComponent(name)}/scenario`)
}
