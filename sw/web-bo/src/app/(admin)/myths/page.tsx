import type { Metadata } from 'next'
import { getMythMusicCatalog } from '@/actions/admin/myth-music'
import { getMythEditorData, listMythEntries } from '@/actions/admin/myths'
import MythEditor from '@/components/myths/MythEditor'

export const metadata: Metadata = {
  title: '신화 편집',
}

/** 신화 편집 — `?myth=<신화 id>`로 신화를 고른다. 고르지 않으면 공개 중인 첫 신화를 연다 */
export default async function MythsPage({ searchParams }: { searchParams: Promise<{ myth?: string }> }) {
  const { myth } = await searchParams
  const [myths, musicCatalog] = await Promise.all([listMythEntries(), getMythMusicCatalog()])
  const selectedId = myths.find(m => m.depth === 1 && m.id === myth)?.id
    ?? myths.find(m => m.depth === 1 && m.published)?.id
    ?? myths.find(m => m.depth === 1)?.id
    ?? null
  const detail = selectedId ? await getMythEditorData(selectedId) : null

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">신화 편집</h1>
        <p className="text-sm text-text-secondary mt-1">
          서비스 「신화의 세계」에 나가는 신화·그룹·인물을 고칩니다.
        </p>
      </div>
      <MythEditor key={selectedId ?? 'none'} myths={myths} selectedId={selectedId} detail={detail} musicCatalog={musicCatalog} />
    </div>
  )
}
