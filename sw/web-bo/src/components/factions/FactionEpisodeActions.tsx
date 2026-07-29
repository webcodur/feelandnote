'use client'

/**
 * 한 영상 편에 대한 조작 — 상태·편성·내보내기·이름 변경·복제·삭제.
 *
 * 예전에는 목록의 카드마다 이 단추들이 붙어 있었는데, 목록이 도감 테마 기준 표 하나로 합쳐지면서
 * 갈 곳을 잃었다. 그래서 조작 자체를 한 부품으로 묶어 두 자리에서 나눠 쓴다.
 *   - `bar`  편집기 상단 — 그 편을 열어 놓은 상태라 전부 보인다
 *   - `menu` 목록의 미연결 영상 줄 — 자리가 좁아 점 셋 메뉴로 접는다
 *
 * 상태값은 이 부품이 스스로 읽는다. 편집기는 대본만 들고 있어 편의 상태·편성을 모르고,
 * 그 값을 위에서부터 내려보내려면 화면 세 곳을 다 고쳐야 한다.
 */

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, FileDown, PenLine, Trash2 } from 'lucide-react'
import ActionDropdown from '@/components/ui/ActionDropdown'
import { useToast } from '@/contexts/ToastContext'
import {
  getFactionEpisodeMeta, duplicateFactionEpisode, renameFactionEpisode,
  deleteFactionEpisode, setFactionEpisodeStatus, setFactionEpisodeRegistered,
  type FactionEpisodeMeta, type FactionEpisodeStatus,
} from '@/actions/admin/factions/episodes'
import { exportFactionEpisode } from '@/actions/admin/factions/export'
import { folderToParam } from '@/lib/faction-edit-route'

export const FACTION_STATUS_OPTIONS: { value: FactionEpisodeStatus; label: string; dot: string }[] = [
  { value: 'ready', label: '내보내기 가능', dot: 'bg-green-500' },
  { value: 'blocked', label: '내보낼 수 없음', dot: 'bg-neutral-600' },
]

export default function FactionEpisodeActions({
  folder,
  variant,
  factionLocal,
  initialMeta,
}: {
  folder: string
  /** `bar`=편집기 상단 전체 조작줄, `menu`=목록 줄 끝의 점 셋 메뉴 */
  variant: 'bar' | 'menu'
  /** 렌더 저장소가 같은 컴퓨터에 있는가. 안 주면 스스로 읽은 값을 쓴다 */
  factionLocal?: boolean
  /** 이미 알고 있으면 넘긴다 — 없으면 스스로 읽는다 */
  initialMeta?: FactionEpisodeMeta
}) {
  const router = useRouter()
  const { showToast } = useToast()
  const [pending, startTransition] = useTransition()
  const [meta, setMeta] = useState<FactionEpisodeMeta | null>(initialMeta ?? null)
  const canExport = factionLocal ?? meta?.factionLocal ?? false

  useEffect(() => {
    if (initialMeta || variant !== 'bar') return
    let alive = true
    getFactionEpisodeMeta(folder)
      .then(m => { if (alive) setMeta(m) })
      .catch(() => { /* 편집기 본체를 막지 않는다 — 조작줄만 비어 보인다 */ })
    return () => { alive = false }
  }, [folder, initialMeta, variant])

  /** 서버 작업 한 번 — 실패는 그대로 보여준다(조용한 실패 금지) */
  const run = (label: string, fn: () => Promise<string | void>, after?: () => void) => {
    startTransition(async () => {
      try {
        const msg = await fn()
        showToast('success', msg || `${label} 완료`)
        if (after) after()
        else router.refresh()
      } catch (e) {
        showToast('error', `${label} 실패 — ${e instanceof Error ? e.message : String(e)}`)
      }
    })
  }

  const exportOne = () => run('내보내기', async () => {
    const r = await exportFactionEpisode(folder)
    if (!r.written) throw new Error(`${r.reason}${r.diffs?.length ? ` (차이 ${r.diffs.length}곳)` : ''}`)
    return `${folder} 파일을 새로 썼습니다 — ${r.reason}`
  })

  const renameOne = () => {
    const dst = window.prompt(
      '새 폴더명 — 사진·음원 폴더도 함께 옮깁니다:',
      folder,
    )
    if (!dst || dst === folder) return
    run('이름 변경', async () => {
      const r = await renameFactionEpisode(folder, dst)
      return `${r.folder} 로 바꿨습니다${r.assetsMoved ? ' (사진·음원 폴더도 옮김)' : ''}`
    }, () => router.push(`/factions/${folderToParam(dst)}`))
  }

  const duplicate = () => {
    const dst = window.prompt(`"${folder}" 복제본의 새 폴더명:`, `${folder}-copy`)
    if (!dst) return
    run('복제', async () => {
      const r = await duplicateFactionEpisode(folder, dst)
      return `${r.folder} 로 복제했습니다${r.imagesCopied ? ' (사진 포함)' : ''}`
    })
  }

  const removeOne = () => {
    if (!window.confirm(`"${folder}" 을 목록에서 지웁니다.\n사진과 음원 파일은 그대로 남습니다. 계속할까요?`)) return
    const typed = window.prompt(`확인을 위해 폴더명을 그대로 입력하세요: ${folder}`)
    if (typed === null) return
    run('삭제', async () => {
      const r = await deleteFactionEpisode(folder, typed)
      return r.assetsKept
        ? `${r.deleted} 을 지웠습니다. 사진·음원은 남겨 뒀습니다`
        : `${r.deleted} 을 지웠습니다`
    }, () => router.push('/factions'))
  }

  // #region 점 셋 메뉴 — 목록 줄 끝
  if (variant === 'menu') {
    return (
      <ActionDropdown
        items={[
          ...(canExport ? [{ key: 'export', label: '렌더용 파일 쓰기', icon: FileDown, onClick: exportOne, disabled: pending }] : []),
          { key: 'rename', label: '이름 바꾸기', icon: PenLine, onClick: renameOne, disabled: pending },
          { key: 'duplicate', label: '복제', icon: Copy, onClick: duplicate, disabled: pending },
          { key: 'delete', label: '지우기', icon: Trash2, variant: 'danger' as const, onClick: removeOne, disabled: pending },
        ]}
      />
    )
  }
  // #endregion

  // #region 편집기 상단 조작줄
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${FACTION_STATUS_OPTIONS.find(o => o.value === meta?.status)?.dot ?? 'bg-gray-400'}`} />
        <select
          value={meta?.status ?? 'blocked'}
          disabled={pending || !meta}
          onChange={e => {
            const next = e.target.value as FactionEpisodeStatus
            setMeta(m => (m ? { ...m, status: next } : m))
            run('상태 변경', () => setFactionEpisodeStatus(folder, next).then(() => undefined))
          }}
          className="rounded border border-border bg-bg-card px-2 py-1 text-xs text-text-secondary hover:text-text-primary disabled:opacity-50"
        >
          {FACTION_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </span>

      <label className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary">
        <input
          type="checkbox"
          checked={meta?.registered ?? false}
          disabled={pending || !meta}
          onChange={e => {
            const next = e.target.checked
            setMeta(m => (m ? { ...m, registered: next } : m))
            run('편성 변경', () => setFactionEpisodeRegistered(folder, next).then(() => undefined))
          }}
        />
        {meta?.registered ? `렌더 편성 ${meta.sortOrder}` : '렌더 편성 제외'}
      </label>

      <span className="flex items-center gap-1">
        {canExport && (
          <IconButton onClick={exportOne} disabled={pending} title="렌더용 파일 다시 쓰기">
            <FileDown className="h-4 w-4" />
          </IconButton>
        )}
        <IconButton onClick={renameOne} disabled={pending} title="폴더명 바꾸기 (사진·음원 폴더도 함께 옮김)">
          <PenLine className="h-4 w-4" />
        </IconButton>
        <IconButton onClick={duplicate} disabled={pending} title="복제">
          <Copy className="h-4 w-4" />
        </IconButton>
        <IconButton onClick={removeOne} disabled={pending} title="목록에서 지우기 (사진·음원은 남습니다)" danger>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </span>
    </div>
  )
  // #endregion
}

function IconButton({
  onClick, disabled, title, danger, children,
}: {
  onClick: () => void
  disabled?: boolean
  title: string
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-md border border-border bg-bg-card p-1.5 disabled:opacity-40 ${
        danger ? 'text-red-400 hover:bg-red-500 hover:text-white' : 'text-text-secondary hover:text-accent'
      }`}
    >
      {children}
    </button>
  )
}
