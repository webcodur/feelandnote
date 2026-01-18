import { Bell, Shield, Database, Palette } from 'lucide-react'
import { getApiKeys } from '@/actions/admin/settings'
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
  const apiKeys = await getApiKeys()

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
