import type { Metadata } from 'next'
import { EpisodeProvider } from '@/lib/episode-context'
import { EpisodeHeader } from '@/components/EpisodeHeader'
import { TabNav } from '@/components/TabNav'
import { usesLangTabEditor } from '@/lib/series-registry'

export async function generateMetadata({ params }: { params: Promise<{ series: string; name: string }> }): Promise<Metadata> {
  const { name: rawName } = await params
  const name = decodeURIComponent(rawName)
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
  const { series, name: rawName } = await params
  const name = decodeURIComponent(rawName)

  // 담화: 음성·책 기반 래퍼(EpisodeProvider/TabNav)를 거치지 않고 자체 편집 화면을 띄운다.
  if (usesLangTabEditor(series)) {
    return <>{children}</>
  }

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
