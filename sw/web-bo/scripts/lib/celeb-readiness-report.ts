import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

type CoverageSummary = {
  averagePercentage: number
  bands: Record<string, number>
  domains: Record<string, { complete: number; applicable: number; percentage: number }>
}

type Breakdown = {
  scope: number
  ready: number
  readyPercentage: number
  coverage: CoverageSummary
}

type ReadinessHtmlReport = {
  measuredAt: string
  scope: number
  ready: number
  readyPercentage: number
  readinessByTier: Record<string, Breakdown>
  readinessByPublicationStatus: Record<string, Breakdown>
  coverage: CoverageSummary
  contentResearch: {
    rawUnconfirmed: number
    targets: number
    excludedByPublicationStatus: number
  }
  linkAudit: {
    mode: 'skipped' | 'checked'
    checked: number
    passed: number
    failed: number
    failureStatusCounts: Record<string, number>
  }
  gapCounts: Record<string, number>
  rows: unknown[]
}

const DOMAIN_ORDER = ['basic', 'influence', 'spectrum', 'speech', 'content', 'source']
const DOMAIN_LABELS: Record<string, string> = {
  basic: '기본정보',
  influence: '영향력',
  spectrum: '스펙트럼',
  speech: '발화·대사',
  content: '콘텐츠',
  source: '대표 원전',
}
const DOMAIN_DEFINITIONS: Record<string, string> = {
  basic: '이름·slug·직업·칭호·소개(KO/EN)·국적·성별·생년·아바타.',
  influence: '정치·전략·기술·사회·경제·문화·초역사 7축 점수·축별 설명(KO/EN)·총점.',
  spectrum: '능력·내덕·외덕·성향 16속성별 점수·사유(KO/EN) + 근거(KO/EN).',
  speech: '대사 행 + 명언 + 정해진 7개 상황별 대사(KO/EN).',
  content: 'full은 연결 콘텐츠(도서·영상·게임·음악)가 상태 완료·리뷰(KO/EN)·출처 URL·KO/EN 로케일 메타(BOOK은 ISBN)를 갖춘 상태. light는 콘텐츠 0건이되 "조사 후 없음"이 확정된 상태도 완비로 친다.',
  source: 'fiction 인물이 등장하는 원작품(소설·신화·전설 등)이 최소 1건 연결되어 있고, 그 원전 콘텐츠의 KO/EN 로케일 메타가 완비된 상태. "이 인물이 어느 작품에서 왔는지"를 가리키는 연결이며 fiction 티어에만 적용한다.',
}
const BAND_ORDER = ['100', '80-99', '60-79', '40-59', '20-39', '0-19']
const BAND_LABELS: Record<string, string> = {
  '100': '100% 완비',
  '80-99': '80–99%',
  '60-79': '60–79%',
  '40-59': '40–59%',
  '20-39': '20–39%',
  '0-19': '0–19%',
}

const number = (value: number): string => new Intl.NumberFormat('ko-KR').format(value)
const percent = (value: number): string => `${value.toFixed(1)}%`
const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char] ?? char)

function gapLabel(gap: string): string {
  const labels: Record<string, string> = {
    'content:thumbnail_url': '콘텐츠 표지 누락',
    'content:isbn': 'BOOK ISBN 누락',
    'spectrum:row': '스펙트럼 행 전체 누락',
    'content:creator': '콘텐츠 저자·제작자 누락',
    'basic:avatar_url': '아바타 누락',
    'basic:birth_date': '생년 누락',
    'content:empty_not_confirmed': 'light 콘텐츠 0건·미확정 (전체 상태)',
    'speech:tone': 'speech tone 누락',
    'influence:row': '영향력 행 전체 누락',
    'speech:dialogue_row': '대사 행 전체 누락',
    'content:row': '콘텐츠 locale 행 누락',
    'speech:quote': '한국어 명언 누락',
    'i18n:quote_en': '영문 명언 누락',
    'fiction:source_missing': 'fiction 대표 원전 연결 누락',
    'basic:bio_en': '영문 소개 누락',
    'basic:gender': '성별 누락',
    'basic:nationality': '국적 누락',
    'content:status': '콘텐츠 완료 상태 결손',
  }
  if (labels[gap]) return labels[gap]
  const http = gap.match(/^content:source_http\((.+)\)$/)
  if (http) return `출처 링크 HTTP ${http[1]}`
  return gap.replace(/_/g, ' ')
}

function renderDomains(report: ReadinessHtmlReport): string {
  return DOMAIN_ORDER.flatMap((domain) => {
    const item = report.coverage.domains[domain]
    if (!item) return []
    return [`
      <div class="bar-row">
        <div class="bar-title">${escapeHtml(DOMAIN_LABELS[domain])}</div>
        <div class="bar-track" aria-label="${escapeHtml(DOMAIN_LABELS[domain])} ${percent(item.percentage)}">
          <span style="width:${item.percentage}%"></span>
        </div>
        <div class="bar-value"><strong>${percent(item.percentage)}</strong><small>${number(item.complete)} / ${number(item.applicable)}</small></div>
      </div>
      <p class="bar-def">${escapeHtml(DOMAIN_DEFINITIONS[domain])}</p>`]
  }).join('')
}

function renderBands(report: ReadinessHtmlReport): string {
  return BAND_ORDER.map((band) => {
    const count = report.coverage.bands[band] ?? 0
    const ratio = report.scope > 0 ? (count / report.scope) * 100 : 0
    return `
      <div class="bar-row band-row">
        <div class="bar-title">${escapeHtml(BAND_LABELS[band])}</div>
        <div class="bar-track band-track"><span style="width:${ratio}%"></span></div>
        <div class="bar-value"><strong>${number(count)}명</strong><small>${percent(ratio)}</small></div>
      </div>`
  }).join('')
}

function renderBreakdown(source: Record<string, Breakdown>, order: string[]): string {
  return order.flatMap((key) => {
    const item = source[key]
    if (!item) return []
    return [`
      <tr>
        <th scope="row">${escapeHtml(key)}</th>
        <td>${number(item.scope)}</td>
        <td>${number(item.ready)}</td>
        <td><strong>${percent(item.readyPercentage)}</strong></td>
        <td>${percent(item.coverage.averagePercentage)}</td>
      </tr>`]
  }).join('')
}

function renderGaps(report: ReadinessHtmlReport): string {
  const entries = Object.entries(report.gapCounts).slice(0, 14)
  const max = Math.max(...entries.map(([, count]) => count), 1)
  return entries.map(([gap, count], index) => `
    <div class="gap-row">
      <span class="gap-rank">${String(index + 1).padStart(2, '0')}</span>
      <span class="gap-name">${escapeHtml(gapLabel(gap))}</span>
      <span class="gap-line"><i style="width:${(count / max) * 100}%"></i></span>
      <strong class="gap-count">${number(count)}명</strong>
    </div>`).join('')
}

function renderHtml(report: ReadinessHtmlReport, fonts: { regular: string; bold: string }): string {
  const incomplete = report.scope - report.ready
  const active = report.readinessByPublicationStatus.active ?? {
    scope: 0, ready: 0, readyPercentage: 0, coverage: { averagePercentage: 0, bands: {}, domains: {} },
  }
  const activeIncomplete = active.scope - active.ready
  const eightyPlus = (report.coverage.bands['100'] ?? 0) + (report.coverage.bands['80-99'] ?? 0)
  const eightyPlusPct = report.scope > 0 ? (eightyPlus / report.scope) * 100 : 0
  const zeroToNineteen = report.coverage.bands['0-19'] ?? 0
  const weakestDomain = DOMAIN_ORDER
    .flatMap((domain) => report.coverage.domains[domain] ? [{ domain, ...report.coverage.domains[domain] }] : [])
    .sort((a, b) => a.percentage - b.percentage)[0]
  const measuredAt = new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'full', timeStyle: 'medium', timeZone: 'Asia/Seoul',
  }).format(new Date(report.measuredAt))
  const linkMode = report.linkAudit.mode === 'checked'
    ? `출처 링크 ${number(report.linkAudit.checked)}개 포함`
    : 'DB 구조 기준 · 외부 링크 미검사'

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Feel & Note — 전체 인물 데이터 결손 통계</title>
  <style>
    @font-face { font-family: "ReportMaru"; src: url(data:font/otf;base64,${fonts.regular}) format("opentype"); font-weight: 400; font-display: block; }
    @font-face { font-family: "ReportMaru"; src: url(data:font/otf;base64,${fonts.bold}) format("opentype"); font-weight: 700 900; font-display: block; }
    :root {
      --paper: #f1eee5; --card: #faf8f1; --ink: #171a16; --muted: #66695f; --line: #c9c2b3;
      --forest: #21483a; --forest-soft: #dce7df; --brick: #a4412f; --brick-soft: #f1ddd6;
      --ochre: #9a7426; --ochre-soft: #eee3c8; --blue: #31576d; --shadow: 0 15px 42px rgba(47, 42, 31, .08);
      --font: "ReportMaru", Georgia, serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; color: var(--ink); font-family: var(--font); background-color: var(--paper);
      background-image: repeating-linear-gradient(0deg, rgba(28,32,26,.018) 0, rgba(28,32,26,.018) 1px, transparent 1px, transparent 5px);
    }
    .shell { width: min(1320px, calc(100% - 48px)); margin: 0 auto; }
    header.masthead { display: grid; grid-template-columns: 1fr auto; gap: 28px; align-items: end; padding: 42px 0 28px; border-bottom: 2px solid var(--ink); }
    .eyebrow { margin: 0 0 9px; color: var(--brick); font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
    h1 { margin: 0; font-size: clamp(38px, 5.5vw, 70px); line-height: .98; letter-spacing: -.06em; }
    .subtitle { margin: 10px 0 0; color: var(--muted); font-size: 14px; }
    .stamp { text-align: right; color: var(--muted); font-size: 11px; line-height: 1.7; }
    .mode { display: inline-block; margin-bottom: 7px; padding: 7px 10px; border: 1px solid var(--forest); background: var(--forest-soft); color: var(--forest); font-weight: 800; }
    main { padding: 28px 0 64px; }
    .section-label { margin: 0 0 11px; color: var(--muted); font-size: 10px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
    .metrics { display: grid; grid-template-columns: 1.25fr repeat(3, 1fr); border: 1px solid #8b8579; background: rgba(250,248,241,.72); box-shadow: var(--shadow); }
    .metric { min-height: 164px; padding: 22px; border-right: 1px solid var(--line); }
    .metric:last-child { border-right: 0; }
    .metric.primary { background: var(--forest); color: #f7f3e9; }
    .metric-label { display: block; margin-bottom: 25px; font-size: 11px; font-weight: 800; }
    .metric-value { display: block; font-size: clamp(38px, 4vw, 62px); line-height: .9; letter-spacing: -.055em; }
    .metric-note { display: block; margin-top: 14px; color: var(--muted); font-size: 11px; }
    .primary .metric-note { color: rgba(247,243,233,.72); }
    .briefs { display: grid; grid-template-columns: repeat(4, 1fr); margin: 18px 0 22px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
    .brief { padding: 16px 20px; border-right: 1px solid var(--line); }
    .brief:last-child { border-right: 0; }
    .brief strong { display: block; margin-bottom: 4px; font-size: 20px; }
    .brief span { color: var(--muted); font-size: 11px; }
    .grid-two { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
    .panel { border: 1px solid var(--line); background: rgba(250,248,241,.76); box-shadow: 0 7px 22px rgba(47,42,31,.045); }
    .panel-head { display: flex; justify-content: space-between; gap: 16px; align-items: baseline; padding: 18px 21px 13px; border-bottom: 1px solid var(--line); }
    .panel-head h2 { margin: 0; font-size: 24px; letter-spacing: -.035em; }
    .panel-head small { color: var(--muted); font-size: 10px; }
    .bar-list { padding: 8px 21px 15px; }
    .bar-row { display: grid; grid-template-columns: 98px 1fr 82px; gap: 13px; align-items: center; padding: 11px 0; border-bottom: 1px dotted var(--line); }
    .domain-list .bar-row { border-bottom-color: transparent; }
    .domain-list .bar-row:last-of-type { border-bottom-color: var(--line); }
    .bar-def { margin: 0 0 11px; padding-left: 111px; color: var(--muted); font-size: 10px; line-height: 1.6; }
    .domain-list .bar-row + .bar-def { margin-top: -4px; }
    .bar-row:last-child { border-bottom: 0; }
    .bar-title { font-size: 12px; font-weight: 800; }
    .bar-track { height: 9px; overflow: hidden; background: #e7e1d5; }
    .bar-track span { display: block; height: 100%; background: var(--forest); }
    .band-track span { background: var(--blue); }
    .bar-value { text-align: right; }
    .bar-value strong, .bar-value small { display: block; }
    .bar-value strong { font-size: 12px; }
    .bar-value small { margin-top: 2px; color: var(--muted); font-size: 9px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 11px 18px; border-bottom: 1px solid var(--line); text-align: right; font-size: 11px; }
    thead th { color: var(--muted); font-size: 9px; letter-spacing: .05em; }
    th:first-child, td:first-child { text-align: left; }
    tbody tr:last-child th, tbody tr:last-child td { border-bottom: 0; }
    tbody th { font-size: 12px; }
    .gap-panel { margin-top: 20px; }
    .gap-list { padding: 7px 21px 15px; }
    .gap-row { display: grid; grid-template-columns: 30px minmax(180px, 1fr) 1.4fr 70px; gap: 12px; align-items: center; padding: 9px 0; border-bottom: 1px dotted var(--line); }
    .gap-row:last-child { border-bottom: 0; }
    .gap-rank { color: var(--muted); font-size: 9px; }
    .gap-name { font-size: 11px; font-weight: 700; }
    .gap-line { height: 5px; background: var(--brick-soft); }
    .gap-line i { display: block; height: 100%; background: var(--brick); }
    .gap-count { color: var(--brick); text-align: right; font-size: 11px; }
    .interpretation { display: grid; grid-template-columns: auto 1fr; gap: 18px; margin-top: 20px; padding: 18px 21px; border-left: 6px solid var(--ochre); background: var(--ochre-soft); }
    .interpretation strong { font-size: 12px; }
    .interpretation p { margin: 0; font-size: 11px; line-height: 1.75; }
    footer { padding: 22px 0 38px; border-top: 1px solid #8b8579; color: var(--muted); font-size: 10px; line-height: 1.7; }
    @media (max-width: 850px) {
      .metrics { grid-template-columns: 1fr 1fr; }
      .metric { border-bottom: 1px solid var(--line); }
      .metric:nth-child(2) { border-right: 0; }
      .metric:nth-child(3), .metric:nth-child(4) { border-bottom: 0; }
      .grid-two { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      .shell { width: calc(100% - 24px); }
      header.masthead { grid-template-columns: 1fr; padding-top: 24px; }
      .stamp { text-align: left; }
      .metrics, .briefs { grid-template-columns: 1fr; }
      .metric { min-height: 135px; border-right: 0; border-bottom: 1px solid var(--line) !important; }
      .metric:last-child { border-bottom: 0 !important; }
      .brief { border-right: 0; border-bottom: 1px solid var(--line); }
      .brief:last-child { border-bottom: 0; }
      .bar-row { grid-template-columns: 78px 1fr 70px; gap: 9px; }
      .panel-head { align-items: flex-start; flex-direction: column; }
      .gap-row { grid-template-columns: 24px minmax(0, 1fr) 58px; }
      .gap-line { display: none; }
      .interpretation { grid-template-columns: 1fr; }
      .bar-def { padding-left: 87px; }
      .table-wrap { overflow-x: auto; }
      table { min-width: 520px; }
    }
    @media print { body { background: white; } .shell { width: 100%; } .panel, .metrics { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="shell">
    <header class="masthead">
      <div>
        <p class="eyebrow">Feel &amp; Note · Statistical Audit</p>
        <h1>전체 인물 데이터<br>결손 통계</h1>
        <p class="subtitle">개인별 명부 없이, 서비스 등록 인원의 필수 데이터 보유 상태만 집계했습니다.</p>
      </div>
      <div class="stamp"><span class="mode">${escapeHtml(linkMode)}</span><br>측정 · ${escapeHtml(measuredAt)}</div>
    </header>

    <main>
      <p class="section-label">01 / 전체 요약</p>
      <section class="metrics" aria-label="전체 통계">
        <article class="metric primary"><span class="metric-label">엄격 완비율</span><strong class="metric-value">${percent(report.readyPercentage)}</strong><span class="metric-note">${number(report.ready)}명 완비 · ${number(incomplete)}명 결손</span></article>
        <article class="metric"><span class="metric-label">전체 등록 인원</span><strong class="metric-value">${number(report.scope)}</strong><span class="metric-note">active · inactive 합계</span></article>
        <article class="metric"><span class="metric-label">영역 평균 보유율</span><strong class="metric-value">${percent(report.coverage.averagePercentage)}</strong><span class="metric-note">인물별 적용영역 동일 가중치</span></article>
        <article class="metric"><span class="metric-label">공개 중 결손</span><strong class="metric-value">${number(activeIncomplete)}</strong><span class="metric-note">active ${number(active.scope)}명 중 현행 기준 미완비</span></article>
      </section>

      <section class="briefs" aria-label="핵심 해석">
        <div class="brief"><strong>${number(report.contentResearch.targets)}명</strong><span>실제 콘텐츠 조사 대상 · 전체 미확정 ${number(report.contentResearch.rawUnconfirmed)}명 중 상태 제외 ${number(report.contentResearch.excludedByPublicationStatus)}명</span></div>
        <div class="brief"><strong>${number(eightyPlus)}명 · ${percent(eightyPlusPct)}</strong><span>필수영역 보유율 80% 이상</span></div>
        <div class="brief"><strong>${number(zeroToNineteen)}명</strong><span>필수영역 보유율 20% 미만</span></div>
        <div class="brief"><strong>${escapeHtml(DOMAIN_LABELS[weakestDomain.domain])} ${percent(weakestDomain.percentage)}</strong><span>현재 가장 낮은 필수영역 완비율</span></div>
      </section>

      <div class="grid-two">
        <section class="panel"><header class="panel-head"><h2>영역별 완비율</h2><small>완비 / 적용 대상</small></header><div class="bar-list domain-list">${renderDomains(report)}</div></section>
        <section class="panel"><header class="panel-head"><h2>인물 완성도 분포</h2><small>전체 ${number(report.scope)}명</small></header><div class="bar-list">${renderBands(report)}</div></section>
      </div>

      <div class="grid-two">
        <section class="panel"><header class="panel-head"><h2>티어별</h2><small>필수조건 차등 적용</small></header><div class="table-wrap"><table><thead><tr><th>티어</th><th>전체</th><th>완비</th><th>완비율</th><th>평균 보유율</th></tr></thead><tbody>${renderBreakdown(report.readinessByTier, ['full', 'light', 'fiction'])}</tbody></table></div></section>
        <section class="panel"><header class="panel-head"><h2>공개 상태별</h2><small>publication_status</small></header><div class="table-wrap"><table><thead><tr><th>상태</th><th>전체</th><th>완비</th><th>완비율</th><th>평균 보유율</th></tr></thead><tbody>${renderBreakdown(report.readinessByPublicationStatus, ['active', 'inactive', 'deleted'])}</tbody></table></div></section>
      </div>

      <section class="panel gap-panel"><header class="panel-head"><h2>주요 결손 항목</h2><small>한 인물의 중복 결손 포함</small></header><div class="gap-list">${renderGaps(report)}</div></section>

      <aside class="interpretation"><strong>한 줄 판정</strong><p>전체 인물은 평균적으로 필수영역의 ${percent(report.coverage.averagePercentage)}를 갖췄지만, 모든 조건을 통과한 인물은 ${percent(report.readyPercentage)}입니다. 가장 큰 병목은 ${escapeHtml(DOMAIN_LABELS[weakestDomain.domain])} 영역이며, 공개 중인 active 인물도 ${number(activeIncomplete)}명이 현행 기준에서 하나 이상의 결손을 갖습니다.</p></aside>
    </main>

    <footer><strong>판정 범위:</strong> 필수 필드와 데이터 구조의 보유 여부입니다. 내용의 사실성·문체 품질을 사람 눈으로 검증했다는 뜻은 아닙니다. full/light는 기본정보·영향력·스펙트럼·발화·콘텐츠 5영역, fiction은 기본정보·대표 원전 2영역을 동일 가중치로 계산합니다. 콘텐츠 조사 대상은 코드 SSoT에 따라 light이면서 active 또는 inactive인 인물만 셉니다.</footer>
  </div>
</body>
</html>`
}

export async function writeCelebReadinessHtml(report: ReadinessHtmlReport, outputPath: string): Promise<void> {
  const fontRoot = path.resolve(process.cwd(), '../remotion/public/fonts')
  const [regular, bold] = await Promise.all([
    readFile(path.join(fontRoot, 'MaruBuri-Regular.otf'), 'base64'),
    readFile(path.join(fontRoot, 'MaruBuri-Bold.otf'), 'base64'),
  ])
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, renderHtml(report, { regular, bold }), 'utf8')
}
