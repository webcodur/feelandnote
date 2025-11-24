import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../lib/api';
import { formatNumber } from '../lib/utils';
import { Users, BookOpen, FileText, TrendingUp } from 'lucide-react';

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats().then((res) => res.data),
  });

  const { data: activity } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => dashboardApi.getRecentActivity(10).then((res) => res.data),
  });

  const { data: popularContents } = useQuery({
    queryKey: ['popular-contents'],
    queryFn: () => dashboardApi.getPopularContents().then((res) => res.data),
  });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const statCards = [
    {
      name: '전체 사용자',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      name: '전체 콘텐츠',
      value: stats?.totalContents || 0,
      icon: BookOpen,
      color: 'text-green-600 bg-green-100',
    },
    {
      name: '보관함 항목',
      value: stats?.totalUserContents || 0,
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      name: '전체 기록',
      value: stats?.totalRecords || 0,
      icon: FileText,
      color: 'text-orange-600 bg-orange-100',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
        <p className="mt-2 text-gray-600">서비스 전체 현황을 한눈에 확인하세요</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {formatNumber(stat.value)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 기록 타입별 분포 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">기록 타입 분포</h2>
          <div className="space-y-3">
            {Object.entries(stats?.recordsDistribution || {}).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{type}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatNumber(count as number)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 사용자 콘텐츠 상태 분포 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">보관함 상태 분포</h2>
          <div className="space-y-3">
            {Object.entries(stats?.statusDistribution || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{status}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatNumber(count as number)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">최근 활동</h2>
        <div className="space-y-4">
          {/* 최근 가입 사용자 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">최근 가입 사용자</h3>
            <div className="space-y-2">
              {activity?.recentUsers?.slice(0, 3).map((user: any) => (
                <div key={user.id} className="text-sm text-gray-600">
                  {user.email} - {new Date(user.created_at).toLocaleDateString()}
                </div>
              ))}
            </div>
          </div>

          {/* 최근 추가된 콘텐츠 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">최근 추가된 콘텐츠</h3>
            <div className="space-y-2">
              {activity?.recentContents?.slice(0, 3).map((content: any) => (
                <div key={content.id} className="text-sm text-gray-600">
                  {content.title} ({content.type})
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 인기 콘텐츠 */}
      {popularContents && popularContents.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">인기 콘텐츠 TOP 10</h2>
          <div className="space-y-3">
            {popularContents.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-semibold text-gray-400">#{index + 1}</span>
                  <span className="text-sm text-gray-900">{item.content?.title || '제목 없음'}</span>
                </div>
                <span className="text-sm text-gray-600">{item.count}명</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
