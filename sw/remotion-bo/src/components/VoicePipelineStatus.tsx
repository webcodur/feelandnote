'use client'

/**
 * VoicePipelineStatus — 음성 파이프라인 위험지역 + 잠재 용의자 패널
 *
 * 데이터: GET /api/{series}/voice/pipeline-status/{name}
 *   그 API 가 어떤 규칙으로 issues 를 채우는지는 해당 route.ts 상단 주석 참조.
 *
 * 표시 규칙:
 *   - confirmed (빨강 테두리, "확정" 라벨)  : 영상 깨짐 확정 — 위에서부터 우선 처리
 *   - suspect   (주황 테두리, "용의자" 라벨) : 체감 어긋남 가능 — 체크만 권장
 *   - 헤더 색: confirmed 0건이면 주황, 1건 이상이면 빨강
 *   - 그룹 카운트 "S 0+3 / A 1+12 / C 0+5" = confirmed+suspect
 *
 * 상호작용:
 *   - 항목 클릭 → onJumpToSegment(key) 호출 → 상위(ScenarioView)가 expandedKey 설정 → 모달 오픈
 *   - "용의자 표시" 체크박스 해제 → suspect 숨김, confirmed 만
 *   - 새로고침 버튼 또는 reloadSignal 변경 시 재조회
 *
 * 갱신 루프:
 *   ScenarioView 가 expandedKey === null 이 될 때마다 reloadSignal++ → 모달 닫으면 자동 재조회 →
 *   사용자가 처리한 항목은 다음 응답에서 빠져서 패널에서 즉시 사라진다.
 *
 * 카운트가 유난히 많이 보이는 경우 (특히 suspect):
 *   tts.replace 맵에 연도·단위가 많이 등록된 에피소드는 "치환 키 포함" 조건에 걸리는
 *   토막가 자연스럽게 많아진다. 확정(빨강)이 아닌 이상 먼저 손볼 필요는 없다.
 */
import { useEffect, useState, useCallback } from 'react'

type Severity = 'confirmed' | 'suspect'

type Issue = {
  group: 'synthesis' | 'alignment' | 'composition'
  severity: Severity
  kind: string
  key?: string
  segIdx?: number
  text?: string
  detail?: string
}

type Counts = { confirmed: number; suspect: number }
type Status = {
  summary: {
    synthesis: Counts
    alignment: Counts
    composition: Counts
  }
  issues: Issue[]
}

type Props = {
  series: string
  name: string
  onJumpToSegment: (key: string) => void
  reloadSignal?: number
}

const GROUP_LABELS: Record<Issue['group'], string> = {
  synthesis: 'Synthesis (발화 규칙)',
  alignment: 'Alignment (시간 정렬)',
  composition: 'Composition (의미 분할)',
}

const KIND_LABELS: Record<string, string> = {
  'tts-replace-missing': '치환 누락',
  'negative-duration': '음수 duration',
  'compressed': '극단 찌부',
  'replacement-suspect': '치환 구간 의심',
  'hold-overflow': 'hold 위험',
  'sub-missing': 'sub 미분할',
  'sub-broken': '불변식 위반',
}

type KindHelp = { what: string; why: string; fix: string }
const KIND_HELP: Record<string, KindHelp> = {
  'tts-replace-missing': {
    what: '본문에 "1865년", "3만명"처럼 숫자+한글 단위가 등장하는데 ep.tts.replace 맵에 발음이 등록되어 있지 않습니다.',
    why: 'TTS가 "일팔육오 년", "삼만명" 같은 기계적 발음을 낼 수 있습니다.',
    fix: 'ko.json의 tts.replace 객체에 { "1865년": "천팔백육십오년" } 형태로 등록하고 voice:tts를 다시 돌립니다.',
  },
  'negative-duration': {
    what: 'voiceTimings의 해당 토막가 end < start 입니다 (duration이 음수).',
    why: 'Whisper 정렬이 꼬인 결과입니다. 자막과 오디오가 완전히 어긋납니다.',
    fix: 'VoiceTimingEditor에서 해당 구간을 열어 시작/끝을 수동 보정하거나 voice-sync를 재실행합니다.',
  },
  'compressed': {
    what: '5자 이상인 토막인데, duration이 "음절당 130ms × 50%" 미만으로 비정상적으로 짧습니다.',
    why: '자막이 오디오보다 먼저 사라지거나, 실제 발화 범위를 훨씬 짧게 잡고 있습니다.',
    fix: 'VoiceTimingEditor에서 end를 뒤로 늘리거나 앞뒤 토막 경계를 재정렬합니다.',
  },
  'replacement-suspect': {
    what: '토막 text에 tts.replace 키(예: "1865년")가 포함되어 있습니다. 숫자가 많은 에피소드는 대부분 여기 잡힙니다.',
    why: 'Whisper는 "치환된 발음"(천팔백육십오년)을 듣고 시간을 잡는데, 자막 text는 원본("1865년")이라 시작/끝 타이밍이 살짝 어긋날 수 있습니다.',
    fix: '확정이 아닙니다. 재생해보고 실제로 자막-오디오가 어긋날 때만 손봅니다.',
  },
  'hold-overflow': {
    what: '이 토막와 다음 토막 사이 gap이 0.3초 이상 0.5초 미만입니다.',
    why: 'Typewriter 컴포넌트가 이 구간에서 앞 자막을 붙잡았다가 늦게 꺼뜨리는 시각 버그를 일으키는 범위입니다.',
    fix: 'gap을 0.3초 미만으로 줄이거나 0.5초 이상으로 벌립니다. VoiceTimingEditor에서 경계 조정.',
  },
  'sub-missing': {
    what: 'text가 30자를 넘는데 sub(의미 단위 분할 배열)가 없습니다.',
    why: '자막이 한 줄로 길게 떠서 가독성이 떨어집니다.',
    fix: 'VoiceTimingEditor에서 의미 단위로 sub를 쪼개거나 voice-sync의 chunk 단계를 다시 돌립니다.',
  },
  'sub-broken': {
    what: 'seg.sub 배열을 " "로 join한 결과가 seg.text와 다릅니다.',
    why: '불변식 위반입니다. 자막 렌더가 text/sub 중 어느 쪽 기준이냐에 따라 표시가 어긋납니다.',
    fix: 'sub 배열을 text와 일치하도록 재분할하거나 sub를 지우고 자동 재생성합니다.',
  },
}

export function VoicePipelineStatus({ series, name, onJumpToSegment, reloadSignal }: Props) {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(true)
  const [showSuspect, setShowSuspect] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const [openHelpKind, setOpenHelpKind] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/${series}/voice/pipeline-status/${name}`)
      if (res.ok) setStatus(await res.json())
    } finally {
      setLoading(false)
    }
  }, [series, name])

  useEffect(() => { reload() }, [reload, reloadSignal])

  if (!status) {
    return (
      <div className="rounded border border-border bg-bg-card px-3 py-2 text-[11px] text-text-secondary">
        파이프라인 상태 로드 중...
      </div>
    )
  }

  const totalConfirmed = status.summary.synthesis.confirmed + status.summary.alignment.confirmed + status.summary.composition.confirmed
  const totalSuspect = status.summary.synthesis.suspect + status.summary.alignment.suspect + status.summary.composition.suspect
  const total = totalConfirmed + totalSuspect

  if (total === 0) {
    return (
      <div className="rounded border border-emerald-700/40 bg-emerald-950/20 px-3 py-2 text-[11px] text-emerald-300">
        ✓ 파이프라인 위험지역·용의자 없음 — 모든 단계 정상
      </div>
    )
  }

  const filtered = showSuspect ? status.issues : status.issues.filter(i => i.severity === 'confirmed')
  const grouped: Record<Issue['group'], Issue[]> = { synthesis: [], alignment: [], composition: [] }
  for (const i of filtered) grouped[i.group].push(i)

  const headerColor = totalConfirmed > 0 ? 'border-red-700/50 bg-red-950/15' : 'border-amber-700/40 bg-amber-950/10'
  const headerLabel = totalConfirmed > 0 ? `위험지역 ${totalConfirmed}건` : '위험지역 없음'

  return (
    <div className={`rounded border ${headerColor}`}>
      <div className="flex items-center gap-3 px-3 py-2 cursor-pointer select-none" onClick={() => setCollapsed(c => !c)}>
        <span className="text-[10px] text-text-secondary">{collapsed ? '▶' : '▼'}</span>
        <span className={`text-xs font-semibold ${totalConfirmed > 0 ? 'text-red-300' : 'text-amber-300'}`}>
          {headerLabel}
        </span>
        <span className="text-[10px] text-text-secondary">
          잠재 용의자 {totalSuspect}건 · S {status.summary.synthesis.confirmed}+{status.summary.synthesis.suspect} / A {status.summary.alignment.confirmed}+{status.summary.alignment.suspect} / C {status.summary.composition.confirmed}+{status.summary.composition.suspect}
        </span>
        <label className="ml-auto flex items-center gap-1 text-[10px] text-text-secondary cursor-pointer" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={showSuspect} onChange={e => setShowSuspect(e.target.checked)} className="cursor-pointer" />
          용의자 표시
        </label>
        <button
          onClick={(e) => { e.stopPropagation(); setShowHelp(s => !s) }}
          className={`px-2 py-0.5 rounded text-[10px] border ${showHelp ? 'bg-bg-hover border-amber-600/50 text-amber-300' : 'bg-bg-card border-border text-text-secondary hover:bg-bg-hover'}`}
          title="각 규칙이 무엇을 의미하는지 설명"
        >
          ? 도움말
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); reload() }}
          disabled={loading}
          className="px-2 py-0.5 rounded text-[10px] bg-bg-card border border-border hover:bg-bg-hover text-text-secondary disabled:opacity-50"
        >
          {loading ? '갱신 중...' : '↻ 새로고침'}
        </button>
      </div>

      {showHelp && !collapsed && (
        <div className="border-t border-current/20 bg-bg-main/40 px-3 py-2 space-y-2 text-[11px]">
          <div className="text-[10px] text-text-dim">7개 규칙이 검사하는 내용입니다. 클릭하면 상세가 펼쳐집니다.</div>
          {Object.entries(KIND_HELP).map(([kind, help]) => {
            const open = openHelpKind === kind
            const label = KIND_LABELS[kind] ?? kind
            return (
              <div key={kind} className="border border-border/40 rounded bg-bg-card/60">
                <button
                  onClick={() => setOpenHelpKind(open ? null : kind)}
                  className="w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-bg-hover"
                >
                  <span className="text-[10px] text-text-secondary">{open ? '▼' : '▶'}</span>
                  <span className="font-mono text-amber-300 shrink-0">{label}</span>
                  <span className="text-text-dim text-[10px] font-mono">{kind}</span>
                </button>
                {open && (
                  <div className="px-3 py-2 space-y-1.5 border-t border-border/40 text-text-secondary">
                    <div><span className="text-text-dim font-semibold mr-1">무엇:</span>{help.what}</div>
                    <div><span className="text-text-dim font-semibold mr-1">왜 문제:</span>{help.why}</div>
                    <div><span className="text-emerald-400 font-semibold mr-1">해결:</span>{help.fix}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!collapsed && (
        <div className="border-t border-current/20 p-3 space-y-3">
          {(['synthesis', 'alignment', 'composition'] as const).map(g => {
            if (grouped[g].length === 0) return null
            return (
              <div key={g}>
                <div className="text-[10px] font-semibold mb-1 flex items-center gap-2">
                  <span className="text-amber-300">{GROUP_LABELS[g]}</span>
                  <span className="text-text-secondary">— {grouped[g].length}건</span>
                </div>
                <div className="space-y-1">
                  {grouped[g].map((it, idx) => {
                    const isConfirmed = it.severity === 'confirmed'
                    const sevColor = isConfirmed ? 'text-red-400 border-l-red-500' : 'text-amber-400 border-l-amber-600'
                    const help = KIND_HELP[it.kind]
                    const helpTitle = help ? `[${KIND_LABELS[it.kind] ?? it.kind}]\n무엇: ${help.what}\n왜 문제: ${help.why}\n해결: ${help.fix}` : (KIND_LABELS[it.kind] ?? it.kind)
                    return (
                      <div
                        key={`${g}-${idx}`}
                        className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] bg-bg-main border border-border/40 border-l-2 ${sevColor.split(' ').slice(1).join(' ')} ${it.key ? 'cursor-pointer hover:bg-bg-hover' : ''}`}
                        onClick={() => it.key && onJumpToSegment(it.key)}
                        title={it.text}
                      >
                        <span className={`font-mono shrink-0 text-[10px] uppercase tracking-wide ${isConfirmed ? 'text-red-400' : 'text-amber-500'}`}>
                          {isConfirmed ? '확정' : '용의자'}
                        </span>
                        <span className={`font-mono shrink-0 ${sevColor.split(' ')[0]}`}>{KIND_LABELS[it.kind] ?? it.kind}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowHelp(true); setOpenHelpKind(it.kind) }}
                          className="shrink-0 text-[10px] w-4 h-4 rounded-full bg-bg-card border border-border text-text-dim hover:text-amber-300 hover:border-amber-600/50 flex items-center justify-center"
                          title={helpTitle}
                        >?</button>
                        {it.key && (
                          <span className="text-text-secondary font-mono shrink-0">[{it.key}{it.segIdx != null ? `:${it.segIdx}` : ''}]</span>
                        )}
                        <span className="text-text-primary truncate flex-1">{it.text}</span>
                        {it.detail && <span className="text-text-dim shrink-0 text-[10px]">{it.detail}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
