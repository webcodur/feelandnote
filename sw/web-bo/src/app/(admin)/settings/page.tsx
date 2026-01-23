import type { Metadata } from 'next'
import { Bell, Shield, Database, Palette, Server, HardDrive, FolderOpen } from 'lucide-react'

export const metadata: Metadata = {
  title: '설정',
}
import { getApiKeys } from '@/actions/admin/settings'
import { getSupabaseStats } from '@/actions/admin/supabase-stats'
import ApiKeyForm from './ApiKeyForm'

const settingSections = [
  {
    title: '알림 설정',
    description: '이메일 및 푸시 알림 설정을 관리합니다',
    icon: Bell,
    href: '/settings/notifications',
  },
  {
    title: '보안 설정',
    description: '비밀번호 및 2단계 인증을 관리합니다',
    icon: Shield,
    href: '/settings/security',
  },
  {
    title: '데이터 관리',
    description: '백업 및 데이터 내보내기를 관리합니다',
    icon: Database,
    href: '/settings/data',
  },
  {
    title: '테마 설정',
    description: '관리자 페이지 테마를 설정합니다',
    icon: Palette,
    href: '/settings/theme',
  },
]

export default async function SettingsPage() {
  const [apiKeys, supabaseStats] = await Promise.all([
    getApiKeys(),
    getSupabaseStats(),
  ])

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">설정</h1>
        <p className="text-sm text-text-secondary mt-1">관리자 설정을 관리합니다</p>
      </div>

      {/* API Keys */}
      <ApiKeyForm initialApiKey={apiKeys.geminiApiKey} />

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {settingSections.map((section) => {
          const Icon = section.icon
          return (
            <div
              key={section.title}
              className="bg-bg-card border border-border rounded-xl p-4 md:p-6 hover:border-accent/50 cursor-pointer"
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="p-2.5 md:p-3 rounded-lg bg-accent/10">
                  <Icon className="w-5 h-5 md:w-6 md:h-6 text-accent" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base md:text-lg font-semibold text-text-primary">
                    {section.title}
                  </h3>
                  <p className="text-xs md:text-sm text-text-secondary mt-1">
                    {section.description}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Supabase 운영 정보 */}
      <div className="bg-bg-card border border-border rounded-xl p-4 md:p-6">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <Server className="w-5 h-5 text-accent" />
          <h2 className="text-base md:text-lg font-semibold text-text-primary">Supabase 운영 정보</h2>
        </div>

        {/* 프로젝트 정보 */}
        <div className="space-y-3 mb-4 md:mb-6">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-text-secondary">프로젝트</span>
            <span className="text-sm text-text-primary font-medium">{supabaseStats.project.name}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-text-secondary">플랜</span>
            <span className="text-sm text-text-primary">{supabaseStats.project.plan}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-text-secondary">상태</span>
            <span className="text-sm text-green-400 font-medium">
              {supabaseStats.project.status === 'ACTIVE_HEALTHY' ? '정상' : supabaseStats.project.status}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-text-secondary">리전</span>
            <span className="text-sm text-text-primary">{supabaseStats.project.region}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-text-secondary">DB 버전</span>
            <span className="text-sm text-text-primary">PostgreSQL {supabaseStats.project.databaseVersion}</span>
          </div>
        </div>

        {/* DB & 스토리지 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {/* DB 사용량 */}
          <div className="bg-bg-secondary/50 border border-border rounded-lg p-3 md:p-4">
            <div className="flex items-center gap-2 mb-3">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-text-primary">데이터베이스</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-text-secondary">사용량</span>
                  <span className="text-sm font-medium text-text-primary">
                    {supabaseStats.database.sizeMB.toLocaleString()} / {supabaseStats.database.limitMB.toLocaleString()} MB
                  </span>
                </div>
                <div className="h-2 bg-bg-main rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.min((supabaseStats.database.sizeMB / supabaseStats.database.limitMB) * 100, 100)}%` }}
                  />
                </div>
                {supabaseStats.database.sizeMB / supabaseStats.database.limitMB > 0.8 && (
                  <p className="text-xs text-orange-400 mt-1">
                    용량의 {Math.round((supabaseStats.database.sizeMB / supabaseStats.database.limitMB) * 100)}% 사용 중
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-text-secondary">테이블 수</span>
                <span className="text-sm font-medium text-text-primary">{supabaseStats.database.tableCount}개</span>
              </div>
            </div>
          </div>

          {/* 스토리지 사용량 */}
          <div className="bg-bg-secondary/50 border border-border rounded-lg p-3 md:p-4">
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-text-primary">스토리지</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-text-secondary">전체 사용량</span>
                  <span className="text-sm font-medium text-text-primary">
                    {supabaseStats.storage.totalSizeMB.toLocaleString()} / {supabaseStats.storage.limitMB.toLocaleString()} MB
                  </span>
                </div>
                <div className="h-2 bg-bg-main rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${Math.min((supabaseStats.storage.totalSizeMB / supabaseStats.storage.limitMB) * 100, 100)}%` }}
                  />
                </div>
                {supabaseStats.storage.totalSizeMB / supabaseStats.storage.limitMB > 0.8 && (
                  <p className="text-xs text-orange-400 mt-1">
                    용량의 {Math.round((supabaseStats.storage.totalSizeMB / supabaseStats.storage.limitMB) * 100)}% 사용 중
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-text-secondary">버킷 수</span>
                <span className="text-sm font-medium text-text-primary">{supabaseStats.storage.buckets.length}개</span>
              </div>
            </div>
          </div>
        </div>

        {/* 버킷별 상세 정보 */}
        {supabaseStats.storage.buckets.length > 0 && (
          <div className="mt-3 md:mt-4">
            <h3 className="text-sm font-semibold text-text-primary mb-2">버킷별 사용량</h3>
            <div className="space-y-2">
              {supabaseStats.storage.buckets.map((bucket) => (
                <div key={bucket.name} className="flex items-center justify-between py-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-3.5 h-3.5 text-text-secondary" />
                    <span className="text-sm text-text-primary">{bucket.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary">{bucket.fileCount}개 파일</span>
                    <span className="text-sm font-medium text-text-primary">{bucket.sizeMB} MB</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 확장 안내 */}
        <div className="mt-4 space-y-3">
          {/* Supabase 용량 확장 */}
          <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg">
            <h4 className="text-sm font-semibold text-text-primary mb-2">💡 Supabase 용량 확장</h4>
            <div className="space-y-1.5 text-xs text-text-secondary">
              <p>• <strong>Pro 플랜</strong> (월 $25): DB 8GB, 스토리지 100GB</p>
              <p>• <strong>Team 플랜</strong> (월 $599): Pro + 팀 협업, SSO, 확장 가능</p>
              <p>• <strong>최대 확장</strong>: DB 60TB, 스토리지 무제한 (사용량 기반 과금)</p>
              <p className="pt-1">
                <a
                  href="https://supabase.com/pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  자세한 요금제 보기 →
                </a>
              </p>
            </div>
          </div>

          {/* Vercel 제한 안내 */}
          <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <h4 className="text-sm font-semibold text-text-primary mb-2">⚡ Vercel 무료 플랜 제한 (현재 사용 중)</h4>
            <div className="space-y-1.5 text-xs text-text-secondary">
              <p>• <strong>대역폭</strong>: 월 100GB (약 10만 방문자)</p>
              <p>• <strong>서버리스 함수</strong>: 월 15만 회 호출, 1,000시간 실행</p>
              <p>• <strong>실행 제한</strong>: 함수당 10초, 최대 50MB</p>
              <p className="pt-1 text-orange-400">
                ⚠️ 트래픽 증가 시 Vercel Pro (월 $20) 업그레이드 필요할 수 있음
              </p>
              <p className="pt-1">
                <a
                  href="https://vercel.com/pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  Vercel 요금제 보기 →
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-bg-card border border-border rounded-xl p-4 md:p-6">
        <h2 className="text-base md:text-lg font-semibold text-text-primary mb-3 md:mb-4">시스템 정보</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-text-secondary">버전</span>
            <span className="text-sm text-text-primary">v0.1.0</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm text-text-secondary">환경</span>
            <span className="text-sm text-text-primary">Development</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-text-secondary">최근 업데이트</span>
            <span className="text-sm text-text-primary">
              {new Date().toLocaleDateString('ko-KR')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
