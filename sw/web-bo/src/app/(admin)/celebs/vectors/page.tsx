import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getSpectrumVectors } from '@/actions/admin/spectrum'
import CelebSearchBar from '@/components/celeb/CelebSearchBar'
import SpectrumReferencePanel from './components/SpectrumReferencePanel'
import VectorDashboard from './components/VectorChart'

export const metadata: Metadata = {
  title: '스펙트럼 분석 (Spectrum)',
}

export default async function SpectrumVectorPage() {
  const vectors = await getSpectrumVectors()

  return (
    <div className="space-y-6">
      <CelebSearchBar
        className="max-w-xl"
        detailPathTemplate="/celebs/vectors/[slug]"
      />

      <div className="flex items-center gap-4">
        <Link
          href="/celebs"
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">스펙트럼 분석 (Spectrum)</h1>
          <p className="text-sm text-text-secondary mt-1">
            셀럽의 덕목·능력·성향을 16개 축으로 분석 · {vectors.length}명 등록
          </p>
        </div>
      </div>

      <SpectrumReferencePanel vectors={vectors} />
      <VectorDashboard vectors={vectors} />
    </div>
  )
}
