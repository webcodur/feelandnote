import type { Metadata } from 'next'
import { EpisodeProvider } from '@/lib/episode-context'
import { EpisodeHeader } from '@/components/EpisodeHeader'
import { TabNav } from '@/components/TabNav'

export async function generateMetadata({ params }: { params: Promise<{ series: string; name: string }> }): Promise<Metadata> {
  const { name } = await params
  const label = name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
  return { title: label }
}

export default async function EpisodeLayout({
  params,
  children,
}: {
  params: Promise<{ series: string; name: string }>
  children: React.ReactNode
}) {
  const { series, name } = await params

  return (
    <EpisodeProvider series={series} name={name}>
      <div className="space-y-4">
        <EpisodeHeader />
        <TabNav basePath={`/${series}/${name}`} />
        {children}
      </div>
    </EpisodeProvider>
  )
}
