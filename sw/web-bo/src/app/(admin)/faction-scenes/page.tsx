import type { Metadata } from 'next'
import { getSceneEditorData, listSceneEntries } from '@/actions/admin/faction-scenes'
import SceneLibrary from '@/components/faction-scenes/SceneLibrary'

export const metadata: Metadata = { title: '주요 장면 관리' }

export default async function FactionScenesPage({ searchParams }: { searchParams: Promise<{ entry?: string }> }) {
  const [{ entry }, entries] = await Promise.all([searchParams, listSceneEntries()])
  const selected = entries.find(item => item.id === entry || item.slug === entry)
    ?? entries.find(item => item.sceneCount > 0) ?? entries[0]
  const detail = selected ? await getSceneEditorData(selected.id) : null
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">주요 장면</h1>
        <p className="mt-1 text-sm text-text-secondary">신화와 팩션의 시작 그림, 이야기 순서, 한·영 해설을 관리합니다.</p>
      </header>
      <SceneLibrary entries={entries} detail={detail} />
    </div>
  )
}
