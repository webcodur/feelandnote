'use client'

import { useState, type ReactNode } from 'react'
import { Users } from 'lucide-react'
import { Film, ImageIcon, Mic, Search, Upload } from '@feelandnote/shared/bo/icons'
import type { FactionScript } from '@/lib/faction-types'
import { FactionCopyButton } from '../../shared/FactionCopyButton'
import { FactionNameCopyButton } from '../../shared/FactionNameCopyButton'
import { FactionVoiceModal, type FactionVoiceOptions } from '../FactionVoiceModal'

type ToolButtonProps = {
  children: ReactNode
  icon?: ReactNode
  active?: boolean
  disabled?: boolean
  title?: string
  onClick: () => void
}

function ToolButton({ children, icon, active, disabled, title, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active == null ? undefined : active}
      className={`flex h-8 items-center justify-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        active
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-border bg-bg-main text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-text-primary'
      }`}
    >
      {icon}{children}
    </button>
  )
}

function ToolGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex min-w-0 items-center gap-1.5 border-r border-border pr-3 last:border-r-0 last:pr-0">
      <span className="mr-0.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5 [&>button]:h-8 [&>button]:whitespace-nowrap">{children}</div>
    </div>
  )
}

type Props = {
  script: FactionScript
  peopleImagesActive: boolean
  poolActive: boolean
  youtubeActive: boolean
  publishActive: boolean
  cardsActive: boolean
  syncing: boolean
  rendering: boolean
  onTogglePeopleImages: () => void
  onTogglePool: () => void
  onGenerateVoice: (options: FactionVoiceOptions) => Promise<void>
  onNormalizeVoice: () => void
  onOpenQuoteMode: () => void
  onSyncVoice: () => void
  onRender: () => void
  onToggleYouTube: () => void
  onTogglePublish: () => void
  onToggleCards: () => void
}

export function FactionToolDock({
  script, peopleImagesActive, poolActive,
  youtubeActive, publishActive, cardsActive, syncing, rendering, onTogglePeopleImages,
  onTogglePool, onGenerateVoice, onNormalizeVoice, onOpenQuoteMode,
  onSyncVoice, onRender, onToggleYouTube, onTogglePublish, onToggleCards,
}: Props) {
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)

  return (
    <>
      <section aria-label="작업 도구" className="flex flex-wrap items-start gap-x-3 gap-y-2 border border-border bg-bg-card px-2 py-2 shadow-sm">
        <span className="flex h-8 shrink-0 items-center rounded-md bg-accent px-2.5 text-xs font-black tracking-tight text-bg-main">작업</span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
          <ToolGroup label="자료">
            <FactionNameCopyButton script={script} />
            <FactionCopyButton script={script} />
            <ToolButton icon={<Users size={15} />} active={peopleImagesActive} onClick={onTogglePeopleImages} title="전체 인물 사진 관리">인물 사진</ToolButton>
            <ToolButton icon={<ImageIcon size={15} />} active={poolActive} onClick={onTogglePool} title="이미지 풀 열기 · Ctrl+Q">이미지 풀</ToolButton>
          </ToolGroup>

          <ToolGroup label="검수">
            <ToolButton icon={<Search size={15} />} active={publishActive} onClick={onTogglePublish} title="본서비스 반영 상태 진단">반영 진단</ToolButton>
            <ToolButton active={cardsActive} onClick={onToggleCards}>카드·도감</ToolButton>
          </ToolGroup>

          <ToolGroup label="음성">
            <ToolButton icon={<Mic size={15} />} onClick={() => setVoiceModalOpen(true)}>음성 생성</ToolButton>
            <ToolButton onClick={onNormalizeVoice} title="모든 음성을 같은 음량으로 균일화">음량 균일화</ToolButton>
            <ToolButton onClick={onOpenQuoteMode}>대사 단계</ToolButton>
            <ToolButton disabled={syncing} onClick={onSyncVoice}>{syncing ? '맞추는 중…' : '길이 맞추기'}</ToolButton>
          </ToolGroup>

          <ToolGroup label="출력">
            <ToolButton icon={<Film size={15} />} disabled={rendering} onClick={onRender}>{rendering ? '시작 중…' : '렌더'}</ToolButton>
            <ToolButton icon={<Upload size={15} />} active={youtubeActive} onClick={onToggleYouTube}>유튜브</ToolButton>
          </ToolGroup>
        </div>
      </section>

      {voiceModalOpen && (
        <FactionVoiceModal
          onClose={() => setVoiceModalOpen(false)}
          onGenerate={onGenerateVoice}
        />
      )}
    </>
  )
}
