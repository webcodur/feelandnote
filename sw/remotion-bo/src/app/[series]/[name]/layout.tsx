import type { Metadata } from 'next'
import { EpisodeProvider } from '@/lib/episode-context'
import { EpisodeHeader } from '@/components/EpisodeHeader'
import { TabNav } from '@/components/TabNav'

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

  // 26.07.26 까지는 자체 편집 화면을 쓰는 시리즈(가상 담화)를 여기서 갈라 래퍼를 건너뛰었다.
  // 그 시리즈가 web-bo 로 이관되면서 남은 시리즈는 전부 책 기반 래퍼를 쓴다 — 분기를 걷어냈다.
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
