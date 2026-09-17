'use client'

import { AlertCircle, CheckCircle2, Music, UploadCloud } from 'lucide-react'
import { syncMythMusic, type MythMusicCatalog } from '@/actions/admin/myth-music'
import { MYTH_CARD, MYTH_BUTTON } from './styles'

const statusLabel = {
  ready: '반영 대기',
  linked: '서비스 연결됨',
  unmatched: '신화명 확인 필요',
  'myth-missing': 'DB 신화 없음',
} as const

function statusClass(status: keyof typeof statusLabel) {
  return status === 'linked' ? 'text-green-400' : status === 'ready' ? 'text-accent' : 'text-warning-text'
}

export default function MythMusicPanel({ catalog, onSynced }: { catalog: MythMusicCatalog; onSynced: () => void }) {
  const ready = catalog.entries.filter((entry) => entry.status === 'ready')
  const linked = catalog.entries.filter((entry) => entry.status === 'linked')
  const unresolved = catalog.entries.filter((entry) => entry.status === 'unmatched' || entry.status === 'myth-missing')
  const canSync = catalog.folderExists && catalog.r2Ready && ready.length > 0

  const apply = async () => {
    if (!canSync) return
    if (!confirm('준비된 신화 테마곡 ' + ready.length + '곡을 서비스에 반영할까요?')) return
    const result = await syncMythMusic()
    alert(result.message)
    onSynced()
  }

  return (
    <section className={MYTH_CARD}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Music size={17} className="shrink-0 text-accent" aria-hidden />
          <h2 className="text-lg font-bold text-text-primary">신화 테마 음악</h2>
        </div>
        <button
          type="button"
          onClick={apply}
          disabled={!canSync}
          className={MYTH_BUTTON + ' inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-40'}
        >
          <UploadCloud size={15} aria-hidden />
          {ready.length > 0 ? String(ready.length) + '곡 서비스에 반영' : '반영할 곡 없음'}
        </button>
      </div>

      <p className="mt-2 break-all text-xs text-text-tertiary">{catalog.folder}</p>
      {!catalog.folderExists && (
        <p className="mt-3 flex items-center gap-2 text-sm text-warning-text">
          <AlertCircle size={15} aria-hidden /> 준비 폴더를 찾을 수 없습니다.
        </p>
      )}
      {!catalog.r2Ready && (
        <p className="mt-3 flex items-center gap-2 text-sm text-warning-text">
          <AlertCircle size={15} aria-hidden /> R2 환경변수가 없어 서비스 반영을 실행할 수 없습니다.
        </p>
      )}

      <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
        {catalog.entries.map((entry) => (
          <li key={entry.file} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate font-medium text-text-primary">{entry.file}</span>
            <span className="text-text-secondary">{entry.mythName ?? entry.targetName ?? '연결할 신화 없음'}</span>
            <span className={'inline-flex items-center gap-1 text-xs ' + statusClass(entry.status)}>
              {entry.status === 'linked' ? <CheckCircle2 size={13} aria-hidden /> : <AlertCircle size={13} aria-hidden />}
              {statusLabel[entry.status]}
            </span>
            {entry.current && entry.current.file !== entry.file && (
              <span className="w-full text-xs text-text-tertiary">현재 연결: {entry.current.file}</span>
            )}
          </li>
        ))}
        {catalog.entries.length === 0 && (
          <li className="px-3 py-4 text-sm text-text-tertiary">mp3 파일이 없습니다.</li>
        )}
      </ul>

      <p className="mt-3 text-xs text-text-tertiary">
        준비 {ready.length}곡 · 연결됨 {linked.length}곡
        {unresolved.length > 0 && <> · 확인 필요 {unresolved.length}곡</>}
      </p>
    </section>
  )
}
