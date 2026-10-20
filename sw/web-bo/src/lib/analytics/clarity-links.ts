export const CLARITY_VIEWS = {
  dashboard: { path: 'dashboard', label: 'Clarity 대시보드', description: '봇 분류, 활성 시간, 스크롤, 행동 신호를 원본에서 확인합니다.' },
  dead: { path: 'impressions', filter: ['deadClickCount', '1'], label: '눌러도 반응 없는 장면', description: '클릭 뒤 화면 변화나 이동이 감지되지 않은 세션입니다. 버튼 고장·느린 응답·잘못된 클릭 기대를 살펴봅니다.' },
  rage: { path: 'impressions', filter: ['rageClickCount', '1'], label: '빠르게 반복 클릭한 장면', description: '좁은 영역을 연달아 누른 세션입니다. 반응을 기다리거나 조작에 막혔는지 확인합니다.' },
  quick: { path: 'impressions', filter: ['QuickbackClickPresent', '1'], label: '빠르게 되돌아온 장면', description: '이동 후 짧은 시간에 돌아온 세션입니다. 원하는 정보가 없었는지, 정상 탐색이었는지 장면을 보고 판단합니다.' },
  errors: { path: 'impressions', filter: ['ScriptErrorText', 'scriptErrorEventCount'], label: '브라우저 오류가 난 장면', description: 'JavaScript 오류와 함께 기록된 세션입니다. 실제 조작 실패가 있었는지 확인하며, 오류 개수를 장애 건수로 단정하지 않습니다.' },
  recordings: { path: 'impressions', label: '방문 흐름 전체 보기', description: '진입 페이지부터 클릭·스크롤·다음 페이지·종료까지 실제 세션을 재생합니다.' },
  heatmaps: { path: 'heatmaps', label: '클릭·스크롤 히트맵', description: '어디를 누르고 어느 위치까지 내려보는지 페이지별로 확인합니다.' },
} as const

export type ClarityView = keyof typeof CLARITY_VIEWS

export function clarityUrl(projectId: string | null, view: ClarityView, event?: string): string | null {
  if (!projectId || !/^[a-z0-9]+$/.test(projectId)) return null
  const definition = CLARITY_VIEWS[view]
  const url = new URL(`https://clarity.microsoft.com/projects/view/${projectId}/${definition.path}`)
  url.searchParams.set('date', 'Last 3 days')
  if ('filter' in definition) url.searchParams.set(definition.filter[0], definition.filter[1])
  if (event) url.searchParams.set('smartEvents', event)
  return url.toString()
}
