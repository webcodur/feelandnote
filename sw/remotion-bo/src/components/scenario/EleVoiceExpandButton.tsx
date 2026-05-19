'use client'

/**
 * ELE 보이스 펼침 버튼 — 현재 보이스 ID 표시 + 펼침 안내.
 *
 * 펼침 본문(보이스 목록 · 미리듣기 · DB 동기화)은 부모가 직접 그린다.
 * 인물 본인 줄과 일반 화자 줄에서 같이 사용한다.
 */
export function EleVoiceExpandButton({
  voiceId,
  open,
  onToggle,
  title = '펼쳐서 보이스 목록',
}: {
  voiceId: string
  open: boolean
  onToggle: () => void
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={title}
      className="bg-bg-card border border-border/40 rounded px-2 py-1 font-mono text-left cursor-pointer hover:border-purple-500/40 truncate flex items-center gap-2"
    >
      <span className="text-purple-300 truncate flex-1">{voiceId || '(보이스 미설정)'}</span>
      <span className="text-text-dim text-[11px] shrink-0">{open ? '▼' : '▶'}</span>
    </button>
  )
}
