import { redirect } from 'next/navigation'

export default async function VoicePage({ params }: { params: Promise<{ series: string; name: string }> }) {
  const { series, name } = await params
  redirect(`/${series}/${name}/scenario`)
}
