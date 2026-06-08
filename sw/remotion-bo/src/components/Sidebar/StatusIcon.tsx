import type { EpisodeStatus } from './types'

export function StatusIcon({ status, hasVoice }: { status: EpisodeStatus; hasVoice: boolean }) {
  if (status === 'done') return <span className="text-green-400 text-[10px]">▲</span>
  if (hasVoice) return <span className="text-success-text text-[10px]">●</span>
  if (status === 'todo') return <span className="text-amber-400 text-[10px]">◇</span>
  return <span className="text-text-dim text-[10px]">○</span>
}
