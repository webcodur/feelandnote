'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Check, Loader2, Save } from 'lucide-react'
import {
  saveFigureBookCharacterDescription,
  type FigureBookCharacterOption,
  type FigureBookCharacterAssignment,
} from '@/actions/admin/figure-books'

interface DescriptionDraft {
  description: string
  descriptionEn: string
}

interface FigureBookCharacterDescriptionsProps {
  contentId: string
  sourceTitle: string
  hasEnglishAmazon: boolean
  assignments: FigureBookCharacterAssignment[]
  characters: FigureBookCharacterOption[]
}

function buildDrafts(
  assignments: FigureBookCharacterAssignment[],
): Record<string, DescriptionDraft> {
  return Object.fromEntries(assignments.map((assignment) => [
    assignment.celebId,
    {
      description: assignment.description ?? '',
      descriptionEn: assignment.descriptionEn ?? '',
    },
  ]))
}

export default function FigureBookCharacterDescriptions({
  contentId,
  sourceTitle,
  hasEnglishAmazon,
  assignments,
  characters,
}: FigureBookCharacterDescriptionsProps) {
  const characterById = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters],
  )
  const appearanceAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.relationType === 'appearance'),
    [assignments],
  )
  const relatedCount = assignments.length - appearanceAssignments.length
  const [drafts, setDrafts] = useState(() => buildDrafts(appearanceAssignments))
  const [savingCelebId, setSavingCelebId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    celebId: string
    kind: 'success' | 'error'
    message: string
  } | null>(null)
  const [isSaving, startSaving] = useTransition()

  useEffect(() => {
    setDrafts(buildDrafts(appearanceAssignments))
    setFeedback(null)
  }, [appearanceAssignments, contentId])

  const updateDraft = (
    celebId: string,
    field: keyof DescriptionDraft,
    value: string,
  ) => {
    setDrafts((current) => ({
      ...current,
      [celebId]: {
        ...(current[celebId] ?? { description: '', descriptionEn: '' }),
        [field]: value,
      },
    }))
  }

  const handleSave = (assignment: FigureBookCharacterAssignment) => {
    const draft = drafts[assignment.celebId] ?? {
      description: assignment.description ?? '',
      descriptionEn: assignment.descriptionEn ?? '',
    }
    setSavingCelebId(assignment.celebId)
    setFeedback(null)
    startSaving(async () => {
      try {
        await saveFigureBookCharacterDescription({
          contentId,
          celebId: assignment.celebId,
          description: draft.description,
          descriptionEn: draft.descriptionEn,
        })
        setFeedback({
          celebId: assignment.celebId,
          kind: 'success',
          message: '등장 설명을 저장했습니다.',
        })
      } catch (error) {
        setFeedback({
          celebId: assignment.celebId,
          kind: 'error',
          message: error instanceof Error ? error.message : '등장 설명 저장에 실패했습니다.',
        })
      } finally {
        setSavingCelebId(null)
      }
    })
  }

  return (
    <div className="border-t border-border p-4">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-text-primary">인물별 등장 설명</h2>
        <p className="mt-1 text-xs leading-relaxed text-text-tertiary">
          《{sourceTitle}》 본문에서 확인되는 역할·사건·결말만 씁니다. 다른 원전의 일화나 작품 전체 소개를 섞지 않습니다.
          영어 설명은 같은 작품의 실제 영문판과 Amazon 링크를 등록한 뒤에만 작성합니다.
          {relatedCount > 0 ? ` 연관 관계 ${relatedCount}명은 등장 설명 입력 대상에서 제외됩니다.` : ''}
        </p>
      </div>

      {appearanceAssignments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-text-tertiary">
          등장 관계가 없습니다. 연관·창작 관계에는 작품 속 등장 설명을 작성할 수 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {appearanceAssignments.map((assignment) => {
            const character = characterById.get(assignment.celebId)
            const draft = drafts[assignment.celebId] ?? {
              description: assignment.description ?? '',
              descriptionEn: assignment.descriptionEn ?? '',
            }
            const isCurrentSaving = isSaving && savingCelebId === assignment.celebId
            const currentFeedback = feedback?.celebId === assignment.celebId
              ? feedback
              : null

            return (
              <article
                key={assignment.celebId}
                className="rounded-lg border border-border bg-bg-secondary/40 p-3"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {character?.nickname ?? assignment.celebId}
                    </p>
                    <p className="font-mono text-[10px] text-text-tertiary">
                      {character?.slug ?? assignment.celebId}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs ${
                    currentFeedback?.kind === 'error' ? 'text-red-300' : 'text-text-tertiary'
                  }`}>
                    {currentFeedback?.kind === 'success' ? <Check size={13} /> : null}
                    {currentFeedback?.message ?? `order:${assignment.sortOrder}`}
                  </span>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
                      한국어 등장 설명
                    </span>
                    <textarea
                      value={draft.description}
                      onChange={(event) => updateDraft(
                        assignment.celebId,
                        'description',
                        event.target.value,
                      )}
                      rows={6}
                      placeholder="이 작품에서 인물이 누구이며 어떤 사건에 관여하고 어떻게 끝나는지 씁니다."
                      className="w-full resize-y rounded-lg border border-border bg-bg-card px-3 py-2.5 text-sm leading-relaxed text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
                      English appearance description
                    </span>
                    <textarea
                      value={draft.descriptionEn}
                      disabled={!hasEnglishAmazon}
                      onChange={(event) => updateDraft(
                        assignment.celebId,
                        'descriptionEn',
                        event.target.value,
                      )}
                      rows={6}
                      placeholder={hasEnglishAmazon
                        ? "Describe only the character's role, actions, and outcome in this work."
                        : "Register the English edition and its Amazon link first."}
                      className="w-full resize-y rounded-lg border border-border bg-bg-card px-3 py-2.5 text-sm leading-relaxed text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-45"
                    />
                  </label>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleSave(assignment)}
                    disabled={isSaving}
                    className="inline-flex min-h-9 items-center gap-2 rounded-md border border-accent/60 bg-accent/10 px-3 text-xs font-bold text-accent hover:border-accent hover:bg-accent/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isCurrentSaving
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Save size={14} />}
                    설명 저장
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
