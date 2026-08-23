import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getBookPersonEpisode } from '@/actions/admin/book-person/episodes'
import { REMOTION_LOCAL } from '@/lib/remotion-local'
import BookPersonEditor from '@/features/book-person/unit/BookPersonEditor'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>
}): Promise<Metadata> {
  const { name } = await params
  return { title: decodeURIComponent(name) }
}

export default async function BookPersonEditPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  const folder = decodeURIComponent(name)

  if (!REMOTION_LOCAL) {
    return (
      <p className="text-sm text-text-secondary">
        렌더 저장소가 이 컴퓨터에 없다. .env에 REMOTION_LOCAL=1을 넣어라.
      </p>
    )
  }

  try {
    const { script, hasDraft, registeredBooks } = await getBookPersonEpisode(folder)
    return <BookPersonEditor folder={folder} initial={script} hasDraft={hasDraft} registeredBooks={registeredBooks} />
  } catch {
    notFound()
  }
}
