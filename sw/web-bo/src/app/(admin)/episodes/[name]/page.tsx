import type { Metadata } from 'next'
import { getEpisode } from '@/actions/admin/episodes'
import { EpisodeEditor } from './EpisodeEditor'

interface Props {
  params: Promise<{ name: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params
  return { title: `대본 편집 — ${name}` }
}

export default async function EpisodeEditPage({ params }: Props) {
  const { name } = await params
  const episode = await getEpisode(name)

  return <EpisodeEditor name={name} initial={episode} />
}
