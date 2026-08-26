import type { Metadata } from 'next'
import { Bell, Shield, Database, Palette, Server, HardDrive, FolderOpen } from 'lucide-react'

export const metadata: Metadata = {
  title: '설정',
}
import { getSupabaseStats } from '@/actions/admin/supabase-stats'

/**
 * 아직 만들지 않은 설정 화면들.
 *
 * 예전엔 각자 이동할 주소(href)를 달고 있었지만 그 주소에 화면이 없었고,
 * 카드 자체도 링크가 아니라 눌러도 아무 일이 없었다. 주소를 지우고 준비 중임을
 * 겉으로 드러낸다. 화면을 만들 때 여기에 링크를 다시 건다.
 */
const plannedSettingSections = [
  {
    title: '알림 설정',
    description: '이메일 및 푸시 알림 설정을 관리합니다',
    icon: Bell,
  },
  {
    title: '보안 설정',
    description: '비밀번호 및 2단계 인증을 관리합니다',
    icon: Shield,
  },
  {
    title: '데이터 관리',
    description: '백업 및 데이터 내보내기를 관리합니다',
    icon: Database,
  },
  {
    title: '테마 설정',
    description: '관리자 페이지 테마를 설정합니다',
    icon: Palette,
  },
]

export default async function SettingsPage() {
  const supabaseStats = await getSupabaseStats()

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">설정</h1>
        <p className="text-sm text-text-secondary mt-1">관리자 설정을 관리합니다</p>
      </div>

      {/* Settings Grid — 전부 준비 중이라 누를 수 없음을 겉으로 드러낸다 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {plannedSettingSections.map((section) => {
          const Icon = section.icon
          return (
            <div
              key={section.title}
              aria-disabled
              className="bg-bg-card border border-border border-dashed rounded-xl p-4 md:p-6 opacity-60"
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="p-2.5 md:p-3 rounded-lg bg-text-secondary/10">
                  <Icon className="w-5 h-5 md:w-6 md:h-6 text-text-secondary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base md:text-lg font-semibold text-text-secondary">
                      {section.title}
                    </h3>
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-text-secondary/10 text-text-secondary">
                      준비 중
                    </span>
                  </div>
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
