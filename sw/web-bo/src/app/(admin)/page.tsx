import { getDashboardStats, getRecentUsers } from '@/actions/admin/stats'
import { Users, Library, FileText, TrendingUp, UserPlus, Clock } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const stats = await getDashboardStats()
  const recentUsers = await getRecentUsers(5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">대시보드</h1>
        <p className="text-text-secondary mt-1">서비스 현황을 한눈에 확인하세요</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="전체 사용자"
          value={stats.totalUsers}
          color="blue"
        />
        <StatCard
          icon={UserPlus}
          label="오늘 가입"
          value={stats.todayNewUsers}
          color="green"
        />
        <StatCard
          icon={Library}
          label="전체 콘텐츠"
          value={stats.totalContents}
          color="purple"
        />
        <StatCard
          icon={FileText}
          label="전체 기록"
          value={stats.totalRecords}
          color="orange"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          icon={TrendingUp}
          label="주간 활성 사용자"
          value={stats.activeUsers}
          color="cyan"
          size="large"
        />
      </div>

      {/* Recent Users */}
      <div className="bg-bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">최근 가입 사용자</h2>
          <Link
            href="/users"
            className="text-sm text-accent hover:underline"
          >
            전체 보기
          </Link>
        </div>

        {recentUsers.length === 0 ? (
          <p className="text-text-secondary text-center py-8">가입한 사용자가 없습니다</p>
        ) : (
          <div className="space-y-3">
            {recentUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {user.nickname || user.email.split('@')[0]}
                    </p>
                    <p className="text-xs text-text-secondary">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <Clock className="w-3 h-3" />
                  {formatDate(user.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  size = 'normal',
}: {
  icon: React.ElementType
  label: string
  value: number
  color: 'blue' | 'green' | 'purple' | 'orange' | 'cyan'
  size?: 'normal' | 'large'
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    purple: 'bg-purple-500/10 text-purple-400',
    orange: 'bg-orange-500/10 text-orange-400',
    cyan: 'bg-cyan-500/10 text-cyan-400',
  }

  return (
    <div className={`bg-bg-card border border-border rounded-lg p-6 ${size === 'large' ? 'col-span-1' : ''}`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-text-secondary text-sm">{label}</p>
          <p className="text-2xl font-bold text-text-primary">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '방금 전'
  if (diffMins < 60) return `${diffMins}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays < 7) return `${diffDays}일 전`

  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  })
}
