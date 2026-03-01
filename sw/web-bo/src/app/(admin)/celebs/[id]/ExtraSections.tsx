'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import PersonaStatBars from '@/components/celeb/PersonaStatBars'
import DialogueSection from './DialogueSection'
import type { DialogueLines } from '@/actions/admin/dialogues'

function CardAccordion({ title, defaultOpen = false, summary, children }: {
  title: string
  defaultOpen?: boolean
  summary?: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full p-4 flex items-center justify-between hover:bg-white/5">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        <div className="flex items-center gap-3">
          {!open && summary}
          {open ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
        </div>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

function countDialogueLines(data: DialogueLines | null) {
  if (!data) return 0
  return Object.values(data).flat().filter((l) => l?.trim()).length
}

interface Persona {
  id: string
  nickname: string
  [key: string]: unknown
}

interface ExtraSectionsProps {
  persona: Persona | null
  dialogueLines: { lines: DialogueLines | null; lines_en: DialogueLines | null }
  speechTone?: string | null
  accountInfo: { id: string; claimed_by?: string | null; created_at: string }
}

export default function ExtraSections({ persona, dialogueLines, speechTone, accountInfo }: ExtraSectionsProps) {
  const dialogueCount = countDialogueLines(dialogueLines.lines)

  return (
    <>
      {/* Persona Stats */}
      {persona && (
        <CardAccordion title="페르소나 스탯">
          <PersonaStatBars
            personas={[persona as Parameters<typeof PersonaStatBars>[0]['personas'][number]]}
            showLegend={false}
            compact
          />
        </CardAccordion>
      )}

      {/* Dialogue Lines */}
      <CardAccordion
        title="고유 대사"
        summary={<span className="text-xs text-text-secondary">{dialogueCount}/21</span>}
      >
        <DialogueSection lines={dialogueLines.lines} linesEn={dialogueLines.lines_en} speechTone={speechTone} />
      </CardAccordion>

      {/* Account Info */}
      <CardAccordion
        title="계정 정보"
        summary={<span className="text-xs text-text-secondary font-mono">{accountInfo.id.slice(0, 8)}…</span>}
      >
        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoItem label="계정 ID" value={accountInfo.id} mono />
          <InfoItem label="인수 상태" value={accountInfo.claimed_by ? '인수됨' : '미인수'} />
          {accountInfo.claimed_by && <InfoItem label="인수자 ID" value={accountInfo.claimed_by} mono />}
          <InfoItem label="생성일" value={new Date(accountInfo.created_at).toLocaleString('ko-KR')} />
        </div>
      </CardAccordion>
    </>
  )
}

function InfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-text-secondary">{label}</span>
      <p className={`text-text-primary ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  )
}
