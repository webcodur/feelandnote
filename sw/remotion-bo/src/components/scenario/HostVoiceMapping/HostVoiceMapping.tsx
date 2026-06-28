'use client'

import type { SaveScope } from './types'
import { SAVE_SCOPE_LABEL } from './constants'
import { useHostVoiceMapping } from './useHostVoiceMapping'

/**
 * host ELE 보이스 매핑 펼침 영역 — HostSpeakerRow 의 본문.
 *
 * 책임:
 *  - ElevenLabs 보이스 목록 fetch + 검색 + 미리듣기.
 *  - DB(profiles.voice_id_ko/en) 현재값 표시 + 불일치 경고.
 *  - 저장 범위(에피소드/DB/둘 다) 선택 후 적용.
 *
 * 부모(HostSpeakerRow) 가 episode 갱신 · 저장을 직접 처리하지 않고 콜백으로 위임.
 */
export function HostVoiceMapping({
  slug, locale, currentEleId, dirty, onApply, showDbMirror = true,
}: {
  slug: string
  locale: 'ko' | 'en'
  /** 현재 에피소드 host.elevenlabsVoiceId */
  currentEleId: string
  /** 다른 미저장 변경 잔존 여부 — 안내 문구 표시용 */
  dirty: boolean
  /** 보이스 적용 — 저장 범위에 따라 부모가 episode/DB 저장 수행. 결과 메시지를 반환. */
  onApply: (voiceId: string, scope: SaveScope) => Promise<{ ok: boolean; message: string }>
  /**
   * 인물 DB(profiles.voice_id_*) 와의 동기화 UI 노출 여부.
   * - true(기본): host 행에서 DB 현황 · 저장 범위 토글 표시.
   * - false: 추가 화자 행은 DB 와 무관하므로 숨기고 에피소드 JSON 에만 적용.
   */
  showDbMirror?: boolean
}) {
  const {
    voicesError, voicesLoading, dbError, filter, setFilter, scope, setScope,
    applying, saveStatus, previewingId, currentDbId, filtered, playPreview,
    handleApply, currentEleName, currentDbName,
  } = useHostVoiceMapping({ slug, locale, currentEleId, onApply, showDbMirror })

  return (
    <div className="relative border border-purple-400 bg-bg-card rounded-lg p-3.5 space-y-3 shadow-md">
      {/* 현황 — host 는 에피소드/DB 2칸, 추가 화자는 에피소드 1칸만 */}
      <div className={`grid gap-2 text-sm font-bold ${showDbMirror ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div className="bg-bg-main rounded px-2 py-1.5 border border-border">
          <div className="text-text-dim mb-0.5 font-bold">현재 보이스 ({locale})</div>
          <div className="font-mono text-text-secondary truncate font-black">
            {currentEleName ?? (currentEleId || '—')}
          </div>
          {currentEleName && (
            <div className="text-text-dim font-mono text-sm font-bold truncate font-bold">{currentEleId}</div>
          )}
        </div>
        {showDbMirror && (
          <div className="bg-bg-main rounded px-2 py-1.5 border border-border">
            <div className="text-text-dim mb-0.5 font-bold">DB voice_id_{locale}</div>
            <div className="font-mono text-text-secondary truncate font-black">
              {dbError ? <span className="text-red-600 font-bold">{dbError}</span> : (currentDbName ?? (currentDbId || '—'))}
            </div>
            {currentDbName && (
              <div className="text-text-dim font-mono text-sm font-bold truncate font-bold">{currentDbId}</div>
            )}
          </div>
        )}
      </div>

      {/* 저장 범위 — host 전용. 추가 화자는 에피소드 JSON 고정. */}
      {showDbMirror && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-text-secondary font-bold">저장 범위:</span>
          {(['episode', 'db', 'both'] as SaveScope[]).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`px-2 py-0.5 rounded text-sm font-bold border ${
                scope === s
                  ? 'bg-purple-100 text-purple-900 border-purple-500 border-2 font-black shadow-xs'
                  : 'bg-bg-main border-slate-300 text-text-dim hover:text-text-secondary hover:border-slate-500'
              }`}
            >
              {SAVE_SCOPE_LABEL[s]}
            </button>
          ))}
        </div>
      )}

      <input
        type="text"
        placeholder="이름 · ID · 라벨로 검색"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        className="w-full bg-bg-main border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-accent text-text-primary placeholder:text-text-dim/60 font-medium"
      />

      {/* 보이스 목록 */}
      <div className="max-h-72 overflow-y-auto border border-border rounded">
        {voicesLoading && <div className="px-3 py-4 text-sm font-bold text-text-dim font-bold">목록 불러오는 중…</div>}
        {voicesError && <div className="px-3 py-4 text-sm font-bold text-red-600 font-bold">목록 실패: {voicesError}</div>}
        {!voicesLoading && !voicesError && filtered.length === 0 && (
          <div className="px-3 py-4 text-sm font-bold text-text-dim font-bold">결과 없음</div>
        )}
        {filtered.map(v => {
          const isCurrent = v.voice_id === currentEleId
          const isDb = v.voice_id === currentDbId
          const isPlaying = previewingId === v.voice_id
          const lang = v.labels?.language ?? v.labels?.accent ?? null
          return (
            <div
              key={v.voice_id}
              className={`flex items-center gap-2 px-2.5 py-1.5 text-sm font-bold border-b border-border/40 last:border-b-0 ${
                isCurrent ? 'bg-purple-100/50 border border-purple-300 rounded-sm' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => playPreview(v)}
                disabled={!v.preview_url}
                className={`w-6 h-6 flex items-center justify-center rounded text-sm font-bold ${
                  v.preview_url
                    ? 'bg-bg-main border border-slate-400 hover:border-purple-600 hover:bg-purple-50 text-text-primary font-bold'
                    : 'bg-bg-main border border-slate-300 opacity-20 cursor-not-allowed text-text-dim'
                }`}
                title={v.preview_url ? '미리듣기' : '미리듣기 없음'}
              >
                {isPlaying ? '❚❚' : '▶'}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-text-primary truncate">{v.name}</span>
                  {v.account && (
                    <span className={`text-sm font-bold px-1 rounded-sm ${
                      v.account.id === 'default' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-800'
                    }`} title={`ElevenLabs 계정: ${v.account.label}`}>{v.account.label}</span>
                  )}
                  {lang && <span className="text-sm font-bold text-text-dim font-semibold">[{lang}]</span>}
                  {v.category && <span className="text-sm font-bold text-text-dim font-semibold">({v.category})</span>}
                  {isCurrent && <span className="text-sm font-bold text-purple-800 font-extrabold bg-purple-100 px-1 rounded-sm">현재</span>}
                  {isDb && !isCurrent && <span className="text-sm font-bold text-blue-800 font-extrabold bg-blue-100 px-1 rounded-sm">DB</span>}
                </div>
                <div className="font-mono text-sm font-bold text-text-dim truncate font-bold">{v.voice_id}</div>
              </div>
              <button
                type="button"
                disabled={applying || isCurrent}
                onClick={() => handleApply(v.voice_id)}
                className={`px-2 py-0.5 rounded text-sm font-bold font-extrabold ${
                  isCurrent
                    ? 'bg-bg-main border border-slate-300 text-slate-400 cursor-default'
                    : 'bg-purple-100 text-purple-900 border border-purple-400 hover:bg-purple-200/80 disabled:opacity-50'
                }`}
              >
                {isCurrent ? '사용 중' : '적용'}
              </button>
            </div>
          )
        })}
      </div>

      {dirty && (
        <p className="text-sm font-bold text-amber-800 font-extrabold bg-amber-50 border border-amber-300 rounded p-1.5">
          에피소드에 다른 미저장 변경이 남아 있습니다. 적용 시 전체 JSON 이 함께 저장됩니다.
        </p>
      )}
      {saveStatus && (
        <p className="text-sm font-bold text-text-primary font-bold bg-slate-100 border border-slate-300 rounded px-2 py-1">{saveStatus}</p>
      )}
    </div>
  )
}
