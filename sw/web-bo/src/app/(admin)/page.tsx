import { createClient } from '@/lib/supabase/server'
import {
  Users,
  Library,
  FileText,
  Flag,
  TrendingUp,
  Clock,
  Book,
  Film,
  Gamepad2,
  Music,
  Award,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

const CONTENT_TYPE_CONFIG = {
  BOOK: { label: '도서', icon: Book, color: 'text-blue-400' },
  VIDEO: { label: '영상', icon: Film, color: 'text-red-400' },
  GAME: { label: '게임', icon: Gamepad2, color: 'text-green-400' },
  MUSIC: { label: '음악', icon: Music, color: 'text-purple-400' },
  CERTIFICATE: { label: '자격증', icon: Award, color: 'text-yellow-400' },
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // 통계 데이터 조회
  const [
    { count: userCount },
    { count: contentCount },
    { count: recordCount },
    { count: userContentCount },
    { data: recentUsers },
    { data: contentTypeStats },
    { data: recentActivities },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('contents').select('*', { count: 'exact', head: true }),
    supabase.from('records').select('*', { count: 'exact', head: true }),
    supabase.from('user_contents').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('id, nickname, email, avatar_url, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('contents').select('type'),
    supabase.from('activity_logs').select('*, profiles:user_id (nickname, avatar_url)').order('created_at', { ascending: false }).limit(10),
  ])

  // 콘텐츠 유형별 통계 계산
  const typeCountMap = (contentTypeStats || []).reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const stats = [
    {
      label: '총 사용자',
      value: userCount || 0,
      icon: Users,
      href: '/users',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: '총 콘텐츠',
      value: contentCount || 0,
      icon: Library,
      href: '/contents',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: '사용자 등록 콘텐츠',
      value: userContentCount || 0,
      icon: TrendingUp,
      href: '/contents',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: '총 기록',
      value: recordCount || 0,
      icon: FileText,
      href: '/records',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">대시보드</h1>
        <p className="text-text-secondary mt-1">서비스 현황을 한눈에 확인하세요</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-bg-card border border-border rounded-xl p-6 hover:border-accent/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold text-text-primary">
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-sm text-text-secondary mt-1">{stat.label}</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Content Type Stats & Recent Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 콘텐츠 유형별 통계 */}
        <div className="bg-bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">콘텐츠 유형별 현황</h2>
          <div className="space-y-3">
            {Object.entries(CONTENT_TYPE_CONFIG).map(([type, config]) => {
              const TypeIcon = config.icon
              const count = typeCountMap[type] || 0
              const percentage = contentCount ? Math.round((count / contentCount) * 100) : 0

              return (
                <div key={type} className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-bg-secondary`}>
                    <TypeIcon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-text-primary">{config.label}</span>
                      <span className="text-sm text-text-secondary">{count}개 ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${config.color.replace('text-', 'bg-').replace('-400', '-500')}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 최근 가입자 */}
        <div className="bg-bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">최근 가입자</h2>
            <Link href="/users" className="text-sm text-accent hover:underline">
              전체보기
            </Link>
          </div>
          <div className="space-y-3">
            {(recentUsers || []).map((user) => (
              <Link
                key={user.id}
                href={`/users/${user.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-secondary"
              >
                <div className="relative w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                  {user.avatar_url ? (
                    <Image src={user.avatar_url} alt="" fill unoptimized className="object-cover" />
                  ) : (
                    <Users className="w-5 h-5 text-accent" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {user.nickname || '닉네임 없음'}
                  </p>
                  <p className="text-xs text-text-secondary truncate">{user.email}</p>
                </div>
                <span className="text-xs text-text-secondary">
                  {formatRelativeTime(user.created_at)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="bg-bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">최근 활동</h2>
        <div className="space-y-3">
          {(recentActivities || []).length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-4">최근 활동이 없습니다</p>
          ) : (
            (recentActivities || []).map((activity) => {
              const profile = activity.profiles as { nickname: string; avatar_url: string | null } | null

              return (
                <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-secondary">
                  <div className="relative w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden">
                    {profile?.avatar_url ? (
                      <Image src={profile.avatar_url} alt="" fill unoptimized className="object-cover" />
                    ) : (
                      <Users className="w-4 h-4 text-accent" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">
                      <span className="font-medium">{profile?.nickname || '알 수 없음'}</span>
                      <span className="text-text-secondary"> {formatActionType(activity.action_type)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-text-secondary">
                    <Clock className="w-3 h-3" />
                    <span>{formatRelativeTime(activity.created_at)}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 7) return `${diffDay}일 전`
  return date.toLocaleDateString('ko-KR')
}

function formatActionType(actionType: string): string {
  const actionMap: Record<string, string> = {
    content_add: '콘텐츠를 등록했습니다',
    content_update: '콘텐츠를 수정했습니다',
    content_delete: '콘텐츠를 삭제했습니다',
    record_add: '기록을 작성했습니다',
    record_update: '기록을 수정했습니다',
    follow: '사용자를 팔로우했습니다',
    unfollow: '사용자를 언팔로우했습니다',
    login: '로그인했습니다',
  }
  return actionMap[actionType] || actionType
}
