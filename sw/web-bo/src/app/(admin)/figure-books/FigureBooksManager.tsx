'use client'

import { FIGURE_BOOK_RELATION_TYPES, FIGURE_BOOK_TERMS } from '@feelandnote/shared/constants/figure-book-terms'
import { useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BookMarked,
  Check,
  ExternalLink,
  Loader2,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react'
import {
  removeFigureBook,
  saveFigureBook,
  searchFigureBookCandidates,
  type FigureBookCharacterOption,
  type FigureBookAdminData,
  type FigureBookCharacterAssignment,
  type FigureBookContentSummary,
  type FigureBookRelationType,
} from '@/actions/admin/figure-books'
import FigureBookCharacterDescriptions from './FigureBookCharacterDescriptions'
import FigureBookEditions from './FigureBookEditions'

interface FigureBooksManagerProps {
  initialData: FigureBookAdminData
}

function buildRelationMap(
  assignments: FigureBookCharacterAssignment[],
): Record<string, FigureBookRelationType> {
  return Object.fromEntries(assignments.map((assignment) => [
    assignment.celebId,
    assignment.relationType,
  ]))
}

function SourceCover({
  source,
  size = 'normal',
}: {
  source: FigureBookContentSummary
  size?: 'normal' | 'small'
}) {
  const className = size === 'small' ? 'h-20 w-14' : 'h-28 w-20'

  return (
    <div className={`${className} relative shrink-0 overflow-hidden rounded-md border border-border bg-bg-secondary`}>
      {source.thumbnailUrl ? (
        <Image
          src={source.thumbnailUrl}
          alt=""
          fill
          sizes={size === 'small' ? '56px' : '80px'}
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-text-tertiary">
          <BookMarked size={size === 'small' ? 18 : 24} />
        </div>
      )}
    </div>
  )
}

function SourceMeta({ source }: { source: FigureBookContentSummary }) {
  return (
    <div className="min-w-0">
      <p className="line-clamp-2 font-semibold leading-snug text-text-primary">
        {source.title}
      </p>
      <p className="mt-1 truncate text-xs text-text-secondary">
        {source.creator || '창작자 미등록'}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[10px] text-text-tertiary">
        <span className="rounded border border-border px-1.5 py-0.5">{source.type}</span>
        {source.isbn && (
          <span className="rounded border border-border px-1.5 py-0.5">ISBN {source.isbn}</span>
        )}
        <span className="rounded border border-border px-1.5 py-0.5">기록 {source.recordCount}</span>
        {source.editionCount > 0 && (
          <span className="rounded border border-border px-1.5 py-0.5">판본 {source.editionCount}</span>
        )}
        {source.activeProductCount > 0 && (
          <span className="rounded border border-border px-1.5 py-0.5">활성 상품 {source.activeProductCount}</span>
        )}
      </div>
    </div>
  )
}

export default function FigureBooksManager({
  initialData,
}: FigureBooksManagerProps) {
  const router = useRouter()
  const { sources, characters } = initialData
  const [activeContentId, setActiveContentId] = useState(sources[0]?.id ?? '')
  const [selectedRelations, setSelectedRelations] = useState<Record<string, FigureBookRelationType>>(
    () => buildRelationMap(sources[0]?.assignments ?? []),
  )
  const [newRelationType, setNewRelationType] = useState<FigureBookRelationType>('appearance')
  const [characterQuery, setCharacterQuery] = useState('')
  const [contentQuery, setContentQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FigureBookContentSummary[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [isSearching, startSearching] = useTransition()
  const [isSaving, startSaving] = useTransition()

  const activeSource = sources.find((source) => source.id === activeContentId) ?? null

  const selectedCharacterIds = useMemo(
    () => Object.keys(selectedRelations),
    [selectedRelations],
  )
  const selectedSet = useMemo(
    () => new Set(selectedCharacterIds),
    [selectedCharacterIds],
  )
  const filteredCharacters = useMemo(() => {
    const query = characterQuery.trim().toLocaleLowerCase('ko')
    if (!query) return characters
    return characters.filter((character) => (
      character.nickname.toLocaleLowerCase('ko').includes(query)
      || character.nicknameEn?.toLocaleLowerCase('en').includes(query)
      || character.slug.toLocaleLowerCase('en').includes(query)
    ))
  }, [characterQuery, characters])
  const selectedAppearanceCount = selectedCharacterIds.filter(
    (celebId) => selectedRelations[celebId] === 'appearance',
  ).length
  const selectedRelatedCount = selectedCharacterIds.length - selectedAppearanceCount

  const handleContentSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    startSearching(async () => {
      try {
        const results = await searchFigureBookCandidates(contentQuery)
        setSearchResults(results)
        if (results.length === 0) {
          setMessage('검색 결과가 없습니다. 제목·창작자·ISBN을 확인하세요.')
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '콘텐츠 검색에 실패했습니다.')
      }
    })
  }

  const handleDesignate = (contentId: string) => {
    setMessage(null)
    startSaving(async () => {
      try {
        await saveFigureBook({ contentId, relations: [] })
        setActiveContentId(contentId)
        setSelectedRelations({})
        setMessage('인물 도서로 지정했습니다. 이제 등장·연관 인물을 연결하세요.')
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '인물 도서 지정에 실패했습니다.')
      }
    })
  }

  const handleSelectSource = (contentId: string) => {
    const source = sources.find((item) => item.id === contentId)
    setActiveContentId(contentId)
    setSelectedRelations(buildRelationMap(source?.assignments ?? []))
    setCharacterQuery('')
    setMessage(null)
  }

  const handleToggleCharacter = (character: FigureBookCharacterOption) => {
    setSelectedRelations((current) => {
      if (!(character.id in current)) {
        return { ...current, [character.id]: newRelationType }
      }
      const next = { ...current }
      delete next[character.id]
      return next
    })
  }

  const handleSetRelationType = (
    character: FigureBookCharacterOption,
    relationType: FigureBookRelationType,
  ) => {
    const previous = activeSource?.assignments.find(
      (assignment) => assignment.celebId === character.id,
    )
    if (
      relationType !== 'appearance'
      && previous?.relationType === 'appearance'
      && (previous.description || previous.descriptionEn)
      && !window.confirm('등장이 아닌 관계로 바꾸면 이 인물의 작품 속 등장 설명이 삭제됩니다. 계속할까요?')
    ) {
      return
    }
    setSelectedRelations((current) => ({
      ...current,
      [character.id]: relationType,
    }))
  }

  const handleSaveCharacters = () => {
    if (!activeSource) return
    setMessage(null)
    startSaving(async () => {
      try {
        const orderedIds = [
          ...activeSource.characterIds.filter((id) => selectedSet.has(id)),
          ...characters
            .map((character) => character.id)
            .filter((id) => selectedSet.has(id) && !activeSource.characterIds.includes(id)),
        ]
        await saveFigureBook({
          contentId: activeSource.id,
          relations: orderedIds.map((celebId) => ({
            celebId,
            relationType: selectedRelations[celebId],
          })),
        })
        const appearanceCount = orderedIds.filter(
          (celebId) => selectedRelations[celebId] === 'appearance',
        ).length
        setMessage(`등장 ${appearanceCount}명 · 연관 ${orderedIds.length - appearanceCount}명을 저장했습니다.`)
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '등장인물 저장에 실패했습니다.')
      }
    })
  }

  const handleRemove = () => {
    if (!activeSource) return
    if (!window.confirm(`《${activeSource.title}》의 인물 도서 지정을 해제할까요?\n연결된 등장·연관 관계도 함께 제거됩니다.`)) {
      return
    }

    setMessage(null)
    startSaving(async () => {
      try {
        await removeFigureBook(activeSource.id)
        setActiveContentId('')
        setMessage('인물 도서 지정을 해제했습니다.')
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '인물 도서 지정 해제에 실패했습니다.')
      }
    })
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-accent">
            <BookMarked size={18} />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em]">Figure book index</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">인물 도서 관리</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-secondary">
            작품에는 실제 등장 인물 또는 곧바로 납득되는 연관 인물을 연결합니다.
            ISBN 판본과 판매 상품은 작품 아래에 두며, 이 관계는 인물의 감상 기록과 구분합니다.
          </p>
        </div>
        <div className="flex gap-5 rounded-lg border border-border bg-bg-card px-4 py-3 text-center">
          <div>
            <p className="font-mono text-xl font-semibold text-text-primary">{sources.length}</p>
            <p className="text-[10px] text-text-tertiary">도서 작품</p>
          </div>
          <div className="w-px bg-border" />
          <div>
            <p className="font-mono text-xl font-semibold text-text-primary">
              {sources.reduce((count, source) => count + source.editionCount, 0)}
            </p>
            <p className="text-[10px] text-text-tertiary">판본</p>
          </div>
          <div className="w-px bg-border" />
          <div>
            <p className="font-mono text-xl font-semibold text-text-primary">{characters.length}</p>
            <p className="text-[10px] text-text-tertiary">전체 인물</p>
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-bg-card p-4">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-text-primary">기존 콘텐츠에서 인물 도서 지정</h2>
          <p className="mt-1 text-xs text-text-tertiary">
            BOOK 콘텐츠만 지정할 수 있습니다. 판본은 작품 아래에서, 검증한 판매 상품은 판본 아래에서 관리합니다.
          </p>
        </div>
        <form onSubmit={handleContentSearch} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <input
              value={contentQuery}
              onChange={(event) => setContentQuery(event.target.value)}
              placeholder="제목, 창작자 또는 ISBN"
              className="w-full rounded-lg border border-border bg-bg-secondary py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || contentQuery.trim().length < 2}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-accent/50 bg-accent/10 px-4 text-sm font-semibold text-accent hover:border-accent hover:bg-accent/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSearching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            검색
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="mt-4 grid gap-2 lg:grid-cols-2">
            {searchResults.map((result) => {
              const designated = sources.some((source) => source.id === result.id)
              return (
                <article
                  key={result.id}
                  className="flex gap-3 rounded-lg border border-border bg-bg-secondary/60 p-3"
                >
                  <SourceCover source={result} size="small" />
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                    <SourceMeta source={result} />
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => designated
                        ? handleSelectSource(result.id)
                        : handleDesignate(result.id)}
                      className="inline-flex w-fit items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent disabled:opacity-40"
                    >
                      {designated ? <Check size={13} /> : <BookMarked size={13} />}
                      {designated ? '관리 화면 열기' : '인물 도서로 지정'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {message && (
        <p className="rounded-lg border border-border bg-bg-secondary px-4 py-3 text-sm text-text-secondary">
          {message}
        </p>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-xl border border-border bg-bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">지정된 인물 도서</h2>
          </div>
          {sources.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-text-tertiary">
              아직 지정된 인물 도서가 없습니다.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {sources.map((source) => {
                const active = source.id === activeContentId
                return (
                  <button
                    type="button"
                    key={source.id}
                    onClick={() => handleSelectSource(source.id)}
                    className={`flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-accent/10 ${
                      active ? 'border-l-2 border-accent bg-accent/[0.07]' : 'border-l-2 border-transparent'
                    }`}
                  >
                    <SourceCover source={source} size="small" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-text-primary">{source.title}</p>
                      <p className="mt-1 text-xs text-text-secondary">{source.creator || '창작자 미등록'}</p>
                      <p className="mt-2 font-mono text-[10px] text-text-tertiary">
                        characters:{source.characterIds.length} · editions:{source.editionCount} · active-products:{source.activeProductCount}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </aside>

        <section className="min-w-0 rounded-xl border border-border bg-bg-card">
          {!activeSource ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <BookMarked size={28} className="mb-3 text-text-tertiary" />
              <p className="text-sm text-text-secondary">관리할 인물 도서를 선택하세요.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 border-b border-border p-4 md:flex-row">
                <SourceCover source={activeSource} />
                <div className="min-w-0 flex-1">
                  <SourceMeta source={activeSource} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/contents/${activeSource.id}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent"
                    >
                      콘텐츠 상세
                      <ExternalLink size={12} />
                    </Link>
                    <button
                      type="button"
                      onClick={handleRemove}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 rounded-md border border-red-400/30 px-2.5 py-1.5 text-xs font-semibold text-red-300 hover:border-red-400 hover:bg-red-400/10 disabled:opacity-40"
                    >
                      <Trash2 size={12} />
                      지정 해제
                    </button>
                  </div>
                </div>
              </div>

              <FigureBookEditions
                key={`${activeSource.id}-${activeSource.updatedAt}`}
                contentId={activeSource.id}
                sourceTitle={activeSource.title}
                editions={activeSource.editions}
              />

              <div className="p-4">
                <div className="mb-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-text-primary">인물 관계</h2>
                      <p className="mt-1 text-xs text-text-tertiary">
                        등장은 작품에 실제로 나오는 인물, 연관은 제목과 주제만 봐도 관계가 분명한 인물입니다.
                      </p>
                    </div>
                    <div className="relative">
                      <Search
                        size={14}
                        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
                      />
                      <input
                        value={characterQuery}
                        onChange={(event) => setCharacterQuery(event.target.value)}
                        placeholder="이름·영문명·slug 검색"
                        className="w-full rounded-lg border border-border bg-bg-secondary py-2 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none md:w-56"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-bg-secondary/50 p-2.5">
                    <div className="flex items-center gap-1" role="group" aria-label="새 연결의 관계 유형">
                      <span className="mr-1 text-xs text-text-tertiary">새 선택:</span>
                      {FIGURE_BOOK_RELATION_TYPES.map((relationType) => (
                        <button
                          key={relationType}
                          type="button"
                          aria-pressed={newRelationType === relationType}
                          onClick={() => setNewRelationType(relationType)}
                          className={`min-h-8 rounded-md border px-2.5 text-xs font-bold ${
                            newRelationType === relationType
                              ? 'border-accent bg-accent text-bg-primary'
                              : 'border-border bg-bg-card text-text-secondary hover:border-accent hover:text-accent'
                          }`}
                        >
                          {FIGURE_BOOK_TERMS.section[relationType].ko}
                        </button>
                      ))}
                    </div>
                    <span className="whitespace-nowrap font-mono text-xs text-accent">
                      등장 {selectedAppearanceCount} · 연관 {selectedRelatedCount}
                    </span>
                  </div>
                </div>

                <div className="grid max-h-[640px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 2xl:grid-cols-3">
                  {filteredCharacters.map((character) => {
                    const selected = selectedSet.has(character.id)
                    const relationType = selectedRelations[character.id]
                    return (
                      <article
                        key={character.id}
                        className={`overflow-hidden rounded-lg border ${
                          selected
                            ? 'border-accent bg-accent/10'
                            : 'border-border bg-bg-secondary/50 hover:border-accent/60 hover:bg-accent/[0.06]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleCharacter(character)}
                          aria-pressed={selected}
                          className="flex w-full items-center gap-3 p-2.5 text-left active:scale-[0.99]"
                        >
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border bg-bg-secondary">
                            {character.avatarUrl ? (
                              <Image
                                src={character.avatarUrl}
                                alt=""
                                fill
                                sizes="44px"
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-text-tertiary">
                                <UserRound size={17} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-text-primary">{character.nickname}</p>
                            <p className="truncate text-[10px] text-text-tertiary">{character.slug}</p>
                          </div>
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                            selected ? 'border-accent bg-accent text-bg-primary' : 'border-border'
                          }`}>
                            {selected ? <Check size={13} strokeWidth={3} /> : null}
                          </span>
                        </button>

                        {selected ? (
                          <div className="grid grid-cols-3 border-t border-accent/25 p-1.5" role="group" aria-label={`${character.nickname} 관계 유형`}>
                            {FIGURE_BOOK_RELATION_TYPES.map((option) => (
                              <button
                                key={option}
                                type="button"
                                aria-pressed={relationType === option}
                                onClick={() => handleSetRelationType(character, option)}
                                className={`min-h-8 rounded px-2 text-xs font-bold ${
                                  relationType === option
                                    ? 'bg-accent/20 text-accent'
                                    : 'text-text-tertiary hover:bg-accent/10 hover:text-accent'
                                }`}
                              >
                                {FIGURE_BOOK_TERMS.relationType[option].ko}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    )
                  })}
                </div>

                <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-text-tertiary">
                    등장이 아닌 관계로 저장하면 작품 속 등장 설명은 DB에서 NULL로 지워지고 다시 입력할 수 없습니다.
                  </p>
                  <button
                    type="button"
                    onClick={handleSaveCharacters}
                    disabled={isSaving}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-accent bg-accent px-4 text-sm font-bold text-bg-primary hover:bg-accent/80 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    등장·연관 관계 저장
                  </button>
                </div>
              </div>

              <FigureBookCharacterDescriptions
                contentId={activeSource.id}
                sourceTitle={activeSource.title}
                hasEnglishAmazon={activeSource.hasEnglishAmazon}
                assignments={activeSource.assignments}
                characters={characters}
              />
            </>
          )}
        </section>
      </div>
    </div>
  )
}
