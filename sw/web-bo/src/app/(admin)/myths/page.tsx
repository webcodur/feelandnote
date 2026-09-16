import type { Metadata } from 'next'
import { getMythMusicCatalog } from '@/actions/admin/myth-music'
import { getMythEditorData, listMythThemes } from '@/actions/admin/myths'
import MythEditor from '@/components/myths/MythEditor'

export const metadata: Metadata = {
  title: '신화 편집',
}

/** 신화 편집 — `?tag=<전승 id>`로 전승을 고른다. 고르지 않으면 공개 중인 첫 전승을 연다 */
export default async function MythsPage({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  const { tag } = await searchParams
  const [myths, musicCatalog] = await Promise.all([listMythThemes(), getMythMusicCatalog()])
  const selectedId = myths.find(m => m.id === tag)?.id ?? myths.find(m => m.published)?.id ?? myths[0]?.id ?? null
  const detail = selectedId ? await getMythEditorData(selectedId) : null

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">신화 편집</h1>
        <p className="text-sm text-text-secondary mt-1">
          서비스 「신화의 세계」에 나가는 전승·그룹·인물을 고칩니다.
        </p>
      </div>
      <MythEditor key={selectedId ?? 'none'} myths={myths} selectedId={selectedId} detail={detail} musicCatalog={musicCatalog} />
    </div>
  )
}
