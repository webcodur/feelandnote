import { Bell, Database, Palette, Shield } from 'lucide-react'

const plannedSettingSections = [
  { title: '알림 설정', description: '이메일 및 푸시 알림 설정', icon: Bell },
  { title: '보안 설정', description: '비밀번호 및 2단계 인증', icon: Shield },
  { title: '데이터 관리', description: '백업 및 데이터 내보내기', icon: Database },
  { title: '테마 설정', description: '관리자 페이지 테마', icon: Palette },
]

export function PlannedSettings() {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-text-primary">그 밖의 설정</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {plannedSettingSections.map(({ title, description, icon: Icon }) => (
          <div
            key={title}
            aria-disabled
            className="rounded-xl border border-dashed border-border bg-bg-card p-4 opacity-60"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-bg-secondary p-2.5">
                <Icon className="h-5 w-5 text-text-secondary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-text-secondary">{title}</h3>
                  <span className="rounded bg-bg-secondary px-1.5 py-0.5 text-sm text-text-secondary">준비 중</span>
                </div>
                <p className="mt-1 text-sm text-text-secondary">{description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
