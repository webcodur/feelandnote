import type { Metadata } from 'next'
import { getCelebStats } from '@/actions/admin/celebs'
import { Users, Briefcase, Globe, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '셀럽 통계',
}

// 직업 라벨 매핑
const professionLabels: Record<string, string> = {
  politician: 'politician',
  humanities_scholar: 'humanities_scholar',
  entrepreneur: 'entrepreneur',
  scientist: 'scientist',
  commander: 'commander',
  author: 'author',
  director: 'director',
  musician: 'musician',
  visual_artist: 'visual_artist',
  leader: 'leader',
  investor: 'investor',
  social_scientist: 'social_scientist',
  actor: 'actor',
  athlete: 'athlete',
  influencer: 'influencer',
  unknown: 'unknown',
}

/**
 * 셀럽 상세로 가는 줄.
 *
 * 상세 화면 주소는 slug로 잡힌다(/celebs/[slug]). 예전엔 id를 끼워 넣어 전부
 * 404로 떨어졌다. slug가 없는 인물은 갈 곳이 없으므로 링크를 걸지 않는다.
 */
function CelebRow({
  slug,
  children,
}: {
  slug: string | null
  children: React.ReactNode
}) {
  const className = 'flex items-center justify-between p-2 rounded-lg'

  if (!slug) {
    return <div className={className}>{children}</div>
  }

  return (
    <Link href={`/celebs/${slug}`} className={`${className} hover:bg-white/5`}>
      {children}
    </Link>
  )
}

export default async function CelebStatsPage() {
  const stats = await getCelebStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">셀럽 통계</h1>
          <p className="text-sm text-text-secondary mt-1">셀럽 현황 및 분포 분석</p>
        </div>
        <Link
          href="/celebs"
          className="px-4 py-2 text-sm bg-bg-card border border-border rounded-lg hover:bg-white/5"
        >
          목록으로
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Users className="w-5 h-5" />}
          label="전체 셀럽"
          value={stats.totalCelebs}
          subValue={`활성: ${stats.activeCelebs}`}
        />
        <SummaryCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="활성률"
          value={`${Math.round((stats.activeCelebs / stats.totalCelebs) * 100)}%`}
          subValue={`${stats.totalCelebs - stats.activeCelebs}명 비활성`}
        />
        <SummaryCard
          icon={<Briefcase className="w-5 h-5" />}
          label="직업 유형"
          value={stats.uniqueProfessions}
          subValue="개 카테고리"
        />
        <SummaryCard
          icon={<Globe className="w-5 h-5" />}
          label="국적"
          value={stats.uniqueNationalities}
          subValue="개국"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 직업별 분포 */}
        <div className="bg-bg-card border border-border rounded-xl p-4 md:p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">profession 분포</h2>
          <div className="space-y-3">
            {stats.professionDistribution.map(({ profession, count }) => {
              const percentage = Math.round((count / stats.activeCelebs) * 100)
              return (
                <div key={profession} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-primary">
                      {professionLabels[profession] || profession}
                    </span>
                    <span className="text-text-secondary">{count}명 ({percentage}%)</span>
                  </div>
                  <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 상위 팔로워 */}
        <div className="bg-bg-card border border-border rounded-xl p-4 md:p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">follower_count TOP 10</h2>
          <div className="space-y-2">
            {stats.topFollowerCelebs.map((celeb, idx) => (
              <CelebRow key={celeb.id} slug={celeb.slug}>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center text-sm font-medium text-accent">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{celeb.nickname}</p>
                    <p className="text-xs text-text-secondary">
                      {professionLabels[celeb.profession || ''] || celeb.profession}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-text-secondary">{celeb.follower_count}명</span>
              </CelebRow>
            ))}
          </div>
        </div>

        {/* 상위 콘텐츠 */}
        <div className="bg-bg-card border border-border rounded-xl p-4 md:p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">content_count TOP 10</h2>
          <div className="space-y-2">
            {stats.topContentCelebs.map((celeb, idx) => (
              <CelebRow key={celeb.id} slug={celeb.slug}>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center text-sm font-medium text-accent">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{celeb.nickname}</p>
                    <p className="text-xs text-text-secondary">
                      {professionLabels[celeb.profession || ''] || celeb.profession}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-text-secondary">{celeb.content_count}개</span>
              </CelebRow>
            ))}
          </div>
        </div>

        {/* 최근 등록 */}
        <div className="bg-bg-card border border-border rounded-xl p-4 md:p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">최근 등록</h2>
          <div className="space-y-2">
            {stats.recentCelebs.map((celeb) => (
              <CelebRow key={celeb.id} slug={celeb.slug}>
                <div>
                  <p className="text-sm font-medium text-text-primary">{celeb.nickname}</p>
                  <p className="text-xs text-text-secondary">
                    {professionLabels[celeb.profession || ''] || celeb.profession}
                  </p>
                </div>
                <span className="text-xs text-text-secondary">
                  {new Date(celeb.created_at).toLocaleDateString('ko-KR')}
                </span>
              </CelebRow>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  subValue: string
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-text-secondary mb-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-secondary mt-1">{subValue}</p>
    </div>
  )
}
