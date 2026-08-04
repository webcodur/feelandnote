import type { Metadata } from 'next'
import { Bell, Shield, Database, Palette, Server, HardDrive, FolderOpen, ExternalLink, Wifi } from 'lucide-react'

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

        {/* Egress (대역폭) 안내 */}
        <div className="mt-3 md:mt-4">
          <div className="bg-bg-secondary/50 border border-border rounded-lg p-3 md:p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wifi className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-text-primary">Egress (대역폭)</h3>
            </div>
            <div className="space-y-2 text-xs text-text-secondary">
              <p>Supabase API는 Egress 사용량 조회 API를 제공하지 않는다. 대시보드에서 직접 확인해야 한다.</p>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span>Free 플랜 한도</span>
                <span className="text-sm font-medium text-text-primary">5.5 GB / 월</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Pro 플랜 한도</span>
                <span className="text-sm font-medium text-text-primary">250 GB / 월</span>
              </div>
              <div className="pt-2 p-2 bg-amber-500/5 border border-amber-500/20 rounded text-amber-300 text-[11px]">
                ⚠️ 2026-03-18 Egress 초과 사고 (15.59GB/5.5GB). SSR 캐싱 미적용이 원인.
              </div>
            </div>
          </div>
        </div>

        {/* Supabase 대시보드 바로가기 */}
        <div className="mt-3 md:mt-4 flex flex-wrap gap-2">
          <a
            href="https://supabase.com/dashboard/project/wouqtpvfctednlffross"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-bg-secondary/50 border border-border rounded-lg text-xs text-text-secondary hover:text-accent hover:border-accent/50 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Supabase 대시보드
          </a>
          <a
            href="https://supabase.com/dashboard/project/wouqtpvfctednlffross/settings/billing/usage"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-bg-secondary/50 border border-border rounded-lg text-xs text-text-secondary hover:text-accent hover:border-accent/50 transition-colors"
          >
            <Wifi className="w-3.5 h-3.5" />
            Usage (Egress 확인)
          </a>
        </div>

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
            <h4 className="text-sm font-semibold text-text-primary mb-2">⚡ Vercel Hobby 운영 한도</h4>
            <div className="space-y-1.5 text-xs text-text-secondary">
              <p>• <strong>Fast Data Transfer</strong>: 100 GB / 최근 30일</p>
              <p>• <strong>Fast Origin Transfer</strong>: 10 GB / 최근 30일</p>
              <p>• <strong>Fluid Active CPU</strong>: 4시간 / 최근 30일</p>
              <p>• <strong>Function Invocations</strong>: 1,000,000회 / 최근 30일</p>
              <p>• <strong>Edge Requests</strong>: 1,000,000회 / 최근 30일</p>
              <div className="mt-2 rounded border border-red-400/25 bg-red-500/[0.06] p-2 text-[11px] text-red-300">
                2026-08-04 실측: Origin 10.12/10 GB, CPU 7시간 35분/4시간. 방문자 증가가 아니라
                공개 HTML의 동적 SSR·크롤러 반복 요청이 주원인이며, Hobby는 초과 시 프로젝트가 일시 중지될 수 있다.
              </div>
              <p className="pt-1 flex flex-wrap gap-x-3 gap-y-1">
                <a
                  href="https://vercel.com/dashboard/usage"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  Usage 확인 →
                </a>
                <a
                  href="https://vercel.com/docs/manage-cdn-usage"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  산정 기준 →
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
