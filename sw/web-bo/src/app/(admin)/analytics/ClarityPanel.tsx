import { clarityUrl, CLARITY_VIEWS, type ClarityView } from '@/lib/analytics/clarity-links'

const views: ClarityView[] = ['dead', 'rage', 'quick', 'errors', 'recordings', 'heatmaps']
const external = 'rounded-lg border border-border bg-bg-card p-3 hover:border-accent/60 hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

export default function ClarityPanel({ projectId }: { projectId: string | null }) {
  const dashboard = clarityUrl(projectId, 'dashboard')
  return <section aria-label="Clarity 행동 분석" className="rounded-xl border border-accent/25 bg-accent/[0.03] p-4 md:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="font-mono text-xs text-accent">MICROSOFT CLARITY</p>
        <h2 className="mt-1 text-base font-semibold">어디서 막히는지 실제 장면 보기</h2>
      </div>
      {dashboard && <a href={dashboard} target="_blank" rel="noopener noreferrer" className="rounded-lg px-3 py-2 text-sm text-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Clarity 대시보드 열기 ↗</a>}
    </div>
    {!dashboard && <p className="mt-3 text-sm text-text-secondary">Clarity 프로젝트 ID를 읽지 못했습니다. 사용자 웹의 기존 설정 또는 백오피스 NEXT_PUBLIC_CLARITY_PROJECT_ID를 확인해 주세요.</p>}
    {dashboard && <>
      <p className="mt-3 text-xs leading-relaxed text-text-secondary">아래 링크는 최근 3일의 Clarity 원본 필터 화면을 새 탭으로 엽니다. 위 GA 기간·유입 조건은 적용되지 않으며 Clarity에서 다시 좁힐 수 있습니다. 프로젝트 접근 권한이 있는 계정으로 로그인해야 합니다.</p>
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{views.map(view => <a key={view} href={clarityUrl(projectId, view)!} target="_blank" rel="noopener noreferrer" className={external}>
        <p className="text-sm font-medium text-text-primary">{CLARITY_VIEWS[view].label} <span className="text-accent">↗</span></p>
        <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{CLARITY_VIEWS[view].description}</p>
      </a>)}</div>
      <p className="mt-3 text-xs leading-relaxed text-text-secondary">이 신호는 불편 후보이며 불만족을 확정하지 않습니다. Clarity의 봇 분류는 GA의 의심 패턴과 다릅니다. 본문·입력값 마스킹을 유지하므로 재생 화면에서 글자는 가려질 수 있습니다. Clarity 수치의 자동 집계는 연결하지 않았으며 최신 값은 원본에서 확인합니다.</p>
    </>}
  </section>
}
