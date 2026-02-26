'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Star, Check, X, Loader2, MessageSquare } from 'lucide-react'
import {
  updateSpeechTone,
  saveCelebDialogues,
  type CelebDialogueItem,
  type DialogueLines,
} from '@/actions/admin/dialogues'
import { getCelebProfessionLabel } from '@/constants/celebCategories'
import { useToast } from '@/contexts/ToastContext'
import Pagination from '@/components/ui/Pagination'

const SPEECH_TONES = ['loyal', 'composed', 'bold', 'humble', 'gentle', 'free'] as const
const TONE_LABELS: Record<string, string> = {
  loyal: '충의',
  composed: '침착',
  bold: '당돌',
  humble: '겸양',
  gentle: '온화',
  free: '호방',
}

const DIALOGUE_TYPES = ['select', 'deploy', 'battle_win', 'battle_draw', 'battle_lose', 'clash_attack'] as const
const TYPE_LABELS: Record<string, string> = {
  select: '선택 시',
  deploy: '출전 시',
  battle_win: '승리',
  battle_draw: '무승부',
  battle_lose: '패배',
  clash_attack: '공격',
}

const EMPTY_LINES: DialogueLines = {
  select: ['', '', ''],
  deploy: ['', '', ''],
  battle_win: ['', '', ''],
  battle_draw: ['', '', ''],
  battle_lose: ['', '', ''],
  clash_attack: ['', '', ''],
}

interface Props {
  celebs: CelebDialogueItem[]
  page: number
  total: number
  limit: number
}

export default function DialogueEditor({ celebs, page, total, limit }: Props) {
  const { showToast } = useToast()
  const [tones, setTones] = useState<Record<string, string>>(() =>
    celebs.reduce((acc, c) => ({ ...acc, [c.id]: c.speech_tone || 'free' }), {}),
  )
  const [savingTone, setSavingTone] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLines, setEditLines] = useState<DialogueLines>(EMPTY_LINES)
  const [savingLines, setSavingLines] = useState(false)

  // speech_tone 변경
  async function handleToneChange(celebId: string, tone: string) {
    setSavingTone(celebId)
    try {
      await updateSpeechTone(celebId, tone)
      setTones((prev) => ({ ...prev, [celebId]: tone }))
      showToast('success', '말투가 변경되었습니다.')
    } catch {
      showToast('error', '말투 변경에 실패했습니다.')
    } finally {
      setSavingTone(null)
    }
  }

  // 대사 편집 모달 열기
  function openEdit(celeb: CelebDialogueItem) {
    setEditingId(celeb.id)
    setEditLines(celeb.dialogue_lines ? structuredClone(celeb.dialogue_lines) : structuredClone(EMPTY_LINES))
  }

  function closeEdit() {
    setEditingId(null)
    setEditLines(EMPTY_LINES)
  }

  function updateLine(type: string, index: number, value: string) {
    setEditLines((prev) => {
      const next = { ...prev }
      const arr = [...next[type as keyof DialogueLines]] as [string, string, string]
      arr[index] = value
      next[type as keyof DialogueLines] = arr
      return next
    })
  }

  async function saveLines() {
    if (!editingId) return
    setSavingLines(true)
    try {
      await saveCelebDialogues(editingId, editLines)
      showToast('success', '대사가 저장되었습니다.')
      closeEdit()
    } catch {
      showToast('error', '대사 저장에 실패했습니다.')
    } finally {
      setSavingLines(false)
    }
  }

  const editingCeleb = editingId ? celebs.find((c) => c.id === editingId) : null
  const totalPages = Math.ceil(total / limit)

  // 대사 개수 계산
  function countLines(lines: DialogueLines | null): number {
    if (!lines) return 0
    return Object.values(lines).flat().filter((l) => l && l.trim().length > 0).length
  }

  return (
    <div className="space-y-4">
      <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-bg-secondary border-b border-border">
            <tr>
              <th className="text-start px-4 py-3 text-sm font-medium text-text-secondary w-[180px]">셀럽</th>
              <th className="text-start px-4 py-3 text-sm font-medium text-text-secondary w-[140px]">말투</th>
              <th className="text-start px-4 py-3 text-sm font-medium text-text-secondary w-[160px]">대사 상태</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-text-secondary w-[80px]">편집</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {celebs.map((celeb) => {
              const lineCount = countLines(celeb.dialogue_lines)
              return (
                <tr key={celeb.id} className="hover:bg-bg-secondary/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center overflow-hidden shrink-0">
                        {celeb.avatar_url ? (
                          <Image src={celeb.avatar_url} alt="" fill unoptimized className="object-cover" />
                        ) : (
                          <Star className="w-4 h-4 text-yellow-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{celeb.nickname || '이름 없음'}</p>
                        <p className="text-xs text-text-secondary">{getCelebProfessionLabel(celeb.profession)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={tones[celeb.id] || 'free'}
                      onChange={(e) => handleToneChange(celeb.id, e.target.value)}
                      disabled={savingTone === celeb.id}
                      className="bg-bg-secondary border border-border rounded-lg px-2 py-1 text-sm text-text-primary disabled:opacity-50"
                    >
                      {SPEECH_TONES.map((t) => (
                        <option key={t} value={t}>{TONE_LABELS[t]} ({t})</option>
                      ))}
                    </select>
                    {savingTone === celeb.id && <Loader2 className="inline w-3 h-3 ml-1 animate-spin text-accent" />}
                  </td>
                  <td className="px-4 py-3">
                    {lineCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                        고유 대사 {lineCount}/18
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/5 text-text-secondary border border-border">
                        공통 대사 사용 중
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => openEdit(celeb)}
                      className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-accent/10"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} baseHref="/celebs/dialogues" />

      {/* 대사 편집 모달 */}
      {editingCeleb && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={closeEdit}>
          <div className="bg-bg-card border border-border rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="sticky top-0 bg-bg-card border-b border-border px-6 py-4 flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center overflow-hidden shrink-0">
                {editingCeleb.avatar_url ? (
                  <Image src={editingCeleb.avatar_url} alt="" fill unoptimized className="object-cover" />
                ) : (
                  <Star className="w-5 h-5 text-yellow-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary">{editingCeleb.nickname}</p>
                <p className="text-xs text-text-secondary">말투: {TONE_LABELS[tones[editingCeleb.id] || 'free']}</p>
              </div>
              <button type="button" onClick={closeEdit} className="p-1.5 rounded-lg hover:bg-bg-secondary text-text-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 대사 입력 필드 */}
            <div className="px-6 py-4 space-y-5">
              {DIALOGUE_TYPES.map((type) => (
                <div key={type}>
                  <h3 className="text-sm font-medium text-text-primary mb-2">{TYPE_LABELS[type]}</h3>
                  <div className="space-y-1.5">
                    {[0, 1, 2].map((i) => (
                      <input
                        key={i}
                        type="text"
                        value={editLines[type][i]}
                        onChange={(e) => updateLine(type, i, e.target.value)}
                        placeholder={`${TYPE_LABELS[type]} 변형 ${i + 1}`}
                        className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 푸터 */}
            <div className="sticky bottom-0 bg-bg-card border-t border-border px-6 py-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-secondary"
              >
                취소
              </button>
              <button
                type="button"
                onClick={saveLines}
                disabled={savingLines}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 disabled:opacity-50"
              >
                {savingLines ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
