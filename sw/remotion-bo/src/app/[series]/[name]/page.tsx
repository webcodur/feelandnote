import { redirect } from 'next/navigation'

export default async function EpisodePage({ params }: { params: Promise<{ series: string; name: string }> }) {
  const { series, name } = await params
  redirect(`/${series}/${name}/scenario`)
}
