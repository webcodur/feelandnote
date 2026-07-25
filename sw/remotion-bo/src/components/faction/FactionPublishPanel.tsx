'use client'

import { useCallback, useEffect, useState } from 'react'
import { Upload, Eye, Loader } from '@feelandnote/shared/bo/icons'
import type { FactionGroup } from '@/lib/faction-types'
import type {
  FactionSyncStatus,
  FactionSyncGroupStatus,
  FactionSyncPersonStatus,
  FactionSyncPublishRequest,
  FactionSyncPublishResponse,
  FactionSyncResultItem,
} from '@/lib/faction-sync/types'

// #region 결과 로그 항목 — 그룹 1회 호출(미리보기 또는 출간)의 응답 기록
type LogEntry = {
  id: string
  at: number
  groupIndex: number
  groupName: string
  dryRun: boolean
  ok: boolean
  error?: string
  response?: FactionSyncPublishResponse
}
// #endregion

const BTN = 'flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50'
const BTN_DEFAULT = `${BTN} border-border bg-bg-card text-text-secondary hover:bg-bg-hover`
const BTN_ACCENT = `${BTN} border-accent bg-accent text-bg-main hover:bg-accent-hover`
const BTN_SMALL = 'flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50'
const BTN_SMALL_DEFAULT = `${BTN_SMALL} border-border bg-bg-card text-text-secondary hover:bg-bg-hover`
const BTN_SMALL_ACCENT = `${BTN_SMALL} border-accent bg-accent text-bg-main hover:bg-accent-hover`

const RESULT_STATUS_LABEL: Record<string, string> = {
  created: '생성됨',
  updated: '갱신됨',
  skipped: '건너뜀',
  blocked: '막힘',
}

const RESULT_STATUS_CLASS: Record<string, string> = {
  created: 'bg-accent/20 text-accent',
  updated: 'bg-accent/10 text-accent',
  skipped: 'bg-bg-main text-text-dim',
  blocked: 'bg-danger/20 text-danger-text',
}

/** 출간 범위 — 이번 패널은 항상 전 범위를 켠 채 호출한다(부분 범위 선택 UI는 범위 밖) */
const FULL_SCOPE: FactionSyncPublishRequest['scope'] = {
  tag: true,
  assignments: true,
  descs: true,
  personImages: true,
  teamImages: true,
}

/** 인물 한 명의 프로필 연결 여부 — 'linked'만 연결로 본다 */
function isLinked(p: FactionSyncPersonStatus): boolean {
  return p.profile === 'linked'
}

/** 세력 한 행의 인물 집계 — 연결 / 미연결(프로필 없음·키 없음) / 미배정(연결됐지만 이번 세력에 아직 안 묶임) */
function peopleCounts(people: FactionSyncPersonStatus[]) {
  const linked = people.filter(isLinked).length
  const unlinked = people.length - linked
  const unassigned = people.filter(p => isLinked(p) && !p.assigned).length
  return { linked, unlinked, unassigned }
}

/** 개인샷 진행도 — synced(로컬·DB 일치)된 인원 / 전체 인원 */
function soloShotProgress(people: FactionSyncPersonStatus[]) {
  const synced = people.filter(p => p.soloShot === 'synced').length
  return { synced, total: people.length }
}

/** 결과 한 줄 이름 — 인물 항목은 인물 이름, 세력 항목은 종류 이름으로 보여준다 */
function itemLabel(it: FactionSyncResultItem): string {
  if (it.person) return it.person
  return it.kind === 'tag' ? '세력 태그' : it.kind === 'teamShots' ? '그룹샷' : it.kind === 'revalidate' ? '웹 캐시' : it.group
}

function formatAt(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function FactionPublishPanel({
  series,
  name,
  groups,
  onChangeTagSlug,
  ensureSaved,
}: {
  series: string
  name: string
  /** 현재 화면(미저장분 포함)의 세력 배열 — tagSlug 입력값의 원천 */
  groups: FactionGroup[]
  /** tagSlug 인라인 편집 반영 — 실제 저장은 FactionEditor의 기존 저장 경로(Ctrl+S 등)를 따른다 */
  onChangeTagSlug: (groupIndex: number, tagSlug: string) => void
  /** 출간 API는 디스크의 에피소드 데이터를 읽는다 — 호출 전 미저장분을 먼저 저장 */
  ensureSaved: () => Promise<void>
}) {
  const [status, setStatus] = useState<FactionSyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [force, setForce] = useState(false)
  const [busyGroup, setBusyGroup] = useState<number | null>(null)
  const [allProgress, setAllProgress] = useState<{ done: number; total: number } | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/faction/db-sync/status?episode=${encodeURIComponent(name)}`)
      const data = await res.json().catch(() => null)
      if (!res.ok || !data) {
        setLoadError((data && data.error) || res.statusText || '진단 조회 실패')
        setStatus(null)
        return
      }
      setStatus(data as FactionSyncStatus)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e))
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [name])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  // 세력 1개 미리보기/출간 — dryRun=true면 계산만, false면 실제 반영
  const publishOne = useCallback(async (groupIndex: number, groupName: string, dryRun: boolean): Promise<boolean> => {
    setBusyGroup(groupIndex)
    let ok = false
    try {
      await ensureSaved()
      const body: FactionSyncPublishRequest = {
        episode: name,
        groupIndex,
        scope: FULL_SCOPE,
        dryRun,
        force,
      }
      const res = await fetch('/api/faction/db-sync/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      ok = res.ok
      setLogs(prev => [{
        id: `${Date.now()}-${groupIndex}`,
        at: Date.now(),
        groupIndex,
        groupName,
        dryRun,
        ok: res.ok,
        error: res.ok ? undefined : ((data && data.error) || res.statusText),
        response: res.ok ? (data as FactionSyncPublishResponse) : undefined,
      }, ...prev])
      if (res.ok && !dryRun) await fetchStatus()
    } catch (e) {
      setLogs(prev => [{
        id: `${Date.now()}-${groupIndex}`,
        at: Date.now(),
        groupIndex,
        groupName,
        dryRun,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      }, ...prev])
    } finally {
      setBusyGroup(null)
    }
    return ok
  }, [name, force, ensureSaved, fetchStatus])

  // 전체 출간 — 세력을 순서대로 하나씩 호출한다(동시 호출 금지, 진행 표시)
  const publishAll = useCallback(async () => {
    if (!status) return
    if (!confirm(`세력 ${status.groups.length}개를 순서대로 모두 출간합니다. 계속할까요?`)) return
    setAllProgress({ done: 0, total: status.groups.length })
    for (let i = 0; i < status.groups.length; i++) {
      const g = status.groups[i]
      await publishOne(g.index, g.name, false)
      setAllProgress({ done: i + 1, total: status.groups.length })
    }
    setAllProgress(null)
  }, [status, publishOne])

  if (loading && !status) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-card/40 p-4 text-sm text-text-dim">
        <Loader size={15} /> 진단 조회 중...
      </div>
    )
  }

  if (loadError || !status) {
    return (
      <div className="space-y-2 rounded-lg border border-danger-text/40 bg-danger/20 p-4">
        <p className="text-sm font-semibold text-danger-text">진단 조회 실패: {loadError ?? '알 수 없는 오류'}</p>
        <button onClick={fetchStatus} className={BTN_DEFAULT}>다시 시도</button>
      </div>
    )
  }

  // 전체 세력을 통틀어 프로필 미연결인 인물 — DB 계정 자체가 없는 인물 명단
  const allUnlinked = status.groups.flatMap(g =>
    (g.people ?? []).filter(p => !isLinked(p)).map(p => ({ groupName: g.name, person: p })),
  )

  return (
    <div className="space-y-4 rounded-lg border border-border bg-bg-card/40 p-4">
      {/* 상단 요약 + 전역 액션 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-secondary">
          출간 가능 인물 <span className="font-bold text-accent">{status.summary?.publishable ?? '-'}</span>
          {' · '}
          미연결 인물 <span className="font-bold text-danger-text">{status.summary?.blocked ?? '-'}</span>
        </span>

        <label className="ml-2 flex items-center gap-1.5 text-xs text-text-dim" title="DB에서 다듬은 소개문을 로컬 값으로 덮어씀">
          <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} className="accent-accent" />
          force(덮어쓰기)
        </label>

        <div className="ml-auto flex items-center gap-2">
          {allProgress && (
            <span className="text-xs text-text-dim">{allProgress.done}/{allProgress.total} 세력 처리 중...</span>
          )}
          <button onClick={fetchStatus} disabled={busyGroup !== null || !!allProgress} className={BTN_DEFAULT}>
            새로고침
          </button>
          <button
            onClick={publishAll}
            disabled={busyGroup !== null || !!allProgress || status.groups.length === 0}
            className={BTN_ACCENT}
          >
            {allProgress ? <Loader size={15} /> : <Upload size={15} />} 전체 출간
          </button>
        </div>
      </div>

      {force && (
        <div className="rounded-md border border-danger-text/40 bg-danger/20 px-3 py-2 text-xs text-danger-text">
          force 켬 — DB에서 사람이 다듬은 소개문(short_desc·long_desc)도 로컬 값으로 덮어씁니다.
        </div>
      )}

      {/* 미연결(프로필 없음) 인물 전체 명단 */}
      {allUnlinked.length > 0 && (
        <div className="rounded-md border border-warning-text/40 bg-warning/10 px-3 py-2">
          <p className="text-xs font-semibold text-warning-text">
            미연결 인물 {allUnlinked.length}명 — DB에 프로필이 없어 이번 출간에서 제외됩니다. web-bo <span className="font-mono">/celebs/new</span>에서 먼저 등록하세요.
          </p>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-text-secondary">
            {allUnlinked.map(({ groupName, person }, idx) => (
              <li key={idx}>{person.name} <span className="text-text-dim">({groupName})</span></li>
            ))}
          </ul>
        </div>
      )}

      {/* 세력별 행 */}
      <div className="space-y-2">
        {status.groups.map(g => (
          <GroupRow
            key={g.index}
            groupStatus={g}
            localGroup={groups[g.index]}
            busy={busyGroup === g.index}
            disabled={busyGroup !== null || !!allProgress}
            onChangeTagSlug={onChangeTagSlug}
            onPreview={() => publishOne(g.index, g.name, true)}
            onPublish={() => {
              if (!confirm(`"${g.name}" 세력을 DB에 출간합니다. 계속할까요?`)) return
              publishOne(g.index, g.name, false)
            }}
          />
        ))}
        {status.groups.length === 0 && <p className="text-sm text-text-dim">진단된 세력이 없습니다.</p>}
      </div>

      {/* 결과 로그 */}
      {logs.length > 0 && (
        <div className="space-y-2 rounded-md border border-border bg-bg-main/30 p-3">
          <div className="text-sm font-bold text-text-primary">결과 로그</div>
          <div className="space-y-2">
            {logs.map(log => <LogRow key={log.id} log={log} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// 세력 1행 — tagSlug 편집 + 태그/인물/이미지 진단 + 미리보기·출간 버튼
function GroupRow({
  groupStatus, localGroup, busy, disabled, onChangeTagSlug, onPreview, onPublish,
}: {
  groupStatus: FactionSyncGroupStatus
  localGroup: FactionGroup | undefined
  busy: boolean
  disabled: boolean
  onChangeTagSlug: (groupIndex: number, tagSlug: string) => void
  onPreview: () => void
  onPublish: () => void
}) {
  const g = groupStatus
  const { linked, unlinked, unassigned } = peopleCounts(g.people ?? [])
  const solo = soloShotProgress(g.people ?? [])
  const fillableDesc = (g.people ?? []).filter(p => p.desc === 'fillable').length
  const currentSlug = localGroup?.tagSlug ?? ''
  const canPublish = !!(currentSlug || g.suggestedSlug)

  return (
    <div className="space-y-1.5 rounded-md border border-border bg-bg-main/30 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 max-w-[10rem] flex-1 truncate text-sm font-bold text-text-primary" title={g.name}>{g.name}</span>

        {/* tagSlug 인라인 편집 — 비어 있으면 제안값을 자리표시로만 보여준다 */}
        <input
          value={currentSlug}
          onChange={e => onChangeTagSlug(g.index, e.target.value)}
          placeholder={g.suggestedSlug}
          className="w-40 rounded-md border border-border bg-bg-card px-2 py-1 font-mono text-xs focus:border-accent focus:outline-none"
          title="celeb_tags.slug — 비우면 저장 시 제안값을 써야 출간할 수 있다"
        />

        {/* 태그 상태 칩 */}
        {g.tag?.exists ? (
          <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">DB 존재{g.tag.name ? ` · ${g.tag.name}` : ''}</span>
        ) : (
          <span className="rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-semibold text-warning-text">신규 생성</span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={onPreview} disabled={disabled || !canPublish} className={BTN_SMALL_DEFAULT} title="변경 예정 내역만 계산(실제 반영 없음)">
            {busy ? <Loader size={13} /> : <Eye size={13} />} 미리보기
          </button>
          <button onClick={onPublish} disabled={disabled || !canPublish} className={BTN_SMALL_ACCENT} title="이 세력만 DB에 반영">
            {busy ? <Loader size={13} /> : <Upload size={13} />} 출간
          </button>
        </div>
      </div>

      {!canPublish && (
        <p className="text-[11px] text-danger-text">tagSlug가 없고 제안값도 비어 있어 출간할 수 없습니다.</p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-secondary">
        <span title="DB 프로필과 연결된 인물 / 프로필이 없어 제외되는 인물">
          인물 연결 <span className="font-semibold text-text-primary">{linked}</span> · 미연결 <span className="font-semibold text-danger-text">{unlinked}</span> · 미배정 <span className="font-semibold text-warning-text">{unassigned}</span>
        </span>
        <span title="개인샷이 로컬·DB 양쪽에 이미 일치하는 인원 / 전체 인원">
          개인샷 <span className="font-semibold text-text-primary">{solo.synced}/{solo.total}</span>
        </span>
        <span title="로컬 단체사진과 DB에 이미 반영된 단체사진 수">
          그룹샷 <span className="font-semibold text-text-primary">{g.teamShots?.matched ?? 0}/{g.teamShots?.local ?? 0}</span>
          {/* 여러 세력이 한 태그를 나눠 쓰면 도감에 실리는 단체사진은 세력들 합계다 */}
          {g.teamShots && g.teamShots.tagTotal !== g.teamShots.local && (
            <span className="text-text-dim" title="같은 연결 키를 쓰는 세력들을 합쳐 도감에 실리는 단체사진 수">
              {' '}(합계 {g.teamShots.tagTotal}장)
            </span>
          )}
        </span>
        <span title="DB에 소개문이 없어 로컬 값으로 채울 수 있는 인물 수(채움 전용 — 이미 있는 값은 덮지 않음)">
          채움 가능 desc <span className="font-semibold text-text-primary">{fillableDesc}</span>
        </span>
      </div>
    </div>
  )
}

// 결과 로그 1건 — created/updated/skipped/blocked 목록 + 안내
function LogRow({ log }: { log: LogEntry }) {
  const r = log.response
  const grouped = (r?.items ?? []).reduce<Record<string, FactionSyncResultItem[]>>((acc, item) => {
    (acc[item.action] ??= []).push(item)
    return acc
  }, {})
  // 프로필이 없어 제외된 인물 — 배정 단계에서 막힌 항목이 그 명단이다
  const unresolved = (r?.items ?? []).filter(
    it => it.kind === 'assignment' && it.action === 'blocked' && (it.reason === 'profile-missing' || it.reason === 'unkeyed'),
  )

  return (
    <div className="space-y-1.5 rounded-md border border-border bg-bg-card/40 p-2.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-text-primary">{log.groupName}</span>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${log.dryRun ? 'bg-bg-main text-text-dim' : 'bg-accent/20 text-accent'}`}>
          {log.dryRun ? '미리보기' : '출간'}
        </span>
        <span className="text-[10px] text-text-dim">{formatAt(log.at)}</span>
        {!log.ok && <span className="text-[10px] font-semibold text-danger-text">실패: {log.error}</span>}
      </div>

      {r && (
        <>
          {(['created', 'updated', 'skipped', 'blocked'] as const).map(st => {
            const items = grouped[st]
            if (!items?.length) return null
            return (
              <div key={st} className="flex flex-wrap items-start gap-1.5 text-[11px]">
                <span className={`shrink-0 rounded px-1.5 py-0.5 font-semibold ${RESULT_STATUS_CLASS[st]}`}>
                  {RESULT_STATUS_LABEL[st]} {items.length}
                </span>
                <span className="min-w-0 flex-1 text-text-secondary">
                  {items.map((it, i) => (
                    <span key={i} className="mr-2 inline-block">
                      {itemLabel(it)}{it.reason ? ` (${it.reason})` : ''}
                    </span>
                  ))}
                </span>
              </div>
            )
          })}

          {!!r.constantHint?.length && (
            <p className="text-[11px] text-warning-text">
              sw/web/src/constants/factionGroups.ts에 다음 slug 추가 필요: {r.constantHint.join(', ')}
            </p>
          )}

          {unresolved.length > 0 && (
            <p className="text-[11px] text-danger-text">
              미연결 인물 {unresolved.length}명 — web-bo /celebs/new에서 등록: {unresolved.map(it => it.person).join(', ')}
            </p>
          )}

          {!!r.warnings?.length && (
            <p className="text-[11px] text-warning-text">
              웹 캐시 무효화 경고: {r.warnings.join(' / ')}
            </p>
          )}
        </>
      )}
    </div>
  )
}
