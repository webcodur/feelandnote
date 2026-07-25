import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTag, getTagCelebs } from '@/actions/admin/tags'
import { getThemeEpisodeLinks, getThemeParentOptions } from '@/actions/admin/factions/themes'
import ThemeEditor from './ThemeEditor'

export const metadata: Metadata = {
  title: '도감 테마',
}

/**
 * 도감 테마 편집 — 테마 하나가 화면 한 장.
 *
 * 영상 편이 없어도 열린다. 세력도감은 글과 사진만으로도 성립하기 때문이다.
 */
export default async function FactionThemePage({
  params,
}: {
  params: Promise<{ tagId: string }>
}) {
  const { tagId } = await params

  const [tag, celebs, links, parents] = await Promise.all([
    getTag(tagId),
    getTagCelebs(tagId),
    getThemeEpisodeLinks(),
    getThemeParentOptions(tagId),
  ])

  if (!tag) notFound()

  return (
    <ThemeEditor
      tag={tag}
      initialCelebs={celebs}
      episodes={links[tagId] ?? []}
      parentOptions={parents.options}
      ownChildCount={parents.ownChildCount}
    />
  )
}
