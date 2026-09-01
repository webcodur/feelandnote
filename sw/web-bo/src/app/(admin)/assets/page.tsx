import type { Metadata } from 'next'
import { loadAssetArchive } from '@/actions/admin/assets'
import AssetArchiveBoard from './AssetArchiveBoard'

export const metadata: Metadata = {
  title: '자산 보관소',
}

/**
 * 자산 보관소 — D:\remotion-assets 에 사는 편을 작업 폴더(public)에 걸고 푼다.
 * 팩션은 편집기를 열면 스스로 걸리므로 이 화면은 서재 탐방을 꺼내 쓰거나 다 쓴 편을 정리할 때 쓴다.
 */
export default async function AssetsPage() {
  const snapshot = await loadAssetArchive()

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">자산 보관소</h1>
        <p className="mt-1 text-sm text-text-secondary">
          편의 사진·음성 실체는 보관소에 있고, 작업 중인 편만 작업 폴더에 걸립니다. 서재 탐방은 걸어야 목록에 나타납니다. 팩션은 편집기를 열면 저절로 걸립니다.
        </p>
      </div>

      <AssetArchiveBoard snapshot={snapshot} />
    </div>
  )
}
