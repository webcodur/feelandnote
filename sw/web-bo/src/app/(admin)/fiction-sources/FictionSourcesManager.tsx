'use client'

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
  removeFictionSource,
  saveFictionSource,
  searchFictionSourceCandidates,
  type FictionCharacterOption,
  type FictionSourceAdminData,
  type FictionSourceContentSummary,
} from '@/actions/admin/fiction-sources'

interface FictionSourcesManagerProps {
  initialData: FictionSourceAdminData
}

function SourceCover({
  source,
  size = 'normal',
}: {
  source: FictionSourceContentSummary
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

function SourceMeta({ source }: { source: FictionSourceContentSummary }) {
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
      </div>
    </div>
  )
}

export default function FictionSourcesManager({
  initialData,
}: FictionSourcesManagerProps) {
  const router = useRouter()
  const { sources, characters } = initialData
  const [activeContentId, setActiveContentId] = useState(sources[0]?.id ?? '')
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>(
    sources[0]?.characterIds ?? [],
  )
  const [characterQuery, setCharacterQuery] = useState('')
  const [contentQuery, setContentQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FictionSourceContentSummary[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [isSearching, startSearching] = useTransition()
  const [isSaving, startSaving] = useTransition()

  const activeSource = sources.find((source) => source.id === activeContentId) ?? null

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

  const handleContentSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    startSearching(async () => {
      try {
        const results = await searchFictionSourceCandidates(contentQuery)
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
        await saveFictionSource({ contentId, celebIds: [] })
        setActiveContentId(contentId)
        setSelectedCharacterIds([])
        setMessage('대표 원전으로 지정했습니다. 이제 등장인물을 연결하세요.')
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '대표 원전 지정에 실패했습니다.')
      }
    })
  }

  const handleSelectSource = (contentId: string) => {
    const source = sources.find((item) => item.id === contentId)
    setActiveContentId(contentId)
    setSelectedCharacterIds(source?.characterIds ?? [])
    setCharacterQuery('')
    setMessage(null)
  }

  const handleToggleCharacter = (character: FictionCharacterOption) => {
    setSelectedCharacterIds((current) => (
      current.includes(character.id)
        ? current.filter((id) => id !== character.id)
        : [...current, character.id]
    ))
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
        await saveFictionSource({
          contentId: activeSource.id,
          celebIds: orderedIds,
        })
        setMessage(`등장인물 ${orderedIds.length}명을 저장했습니다.`)
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '등장인물 저장에 실패했습니다.')
      }
    })
  }

  const handleRemove = () => {
    if (!activeSource) return
    if (!window.confirm(`《${activeSource.title}》의 대표 원전 지정을 해제할까요?\n연결된 인물 관계도 함께 제거됩니다.`)) {
      return
    }

    setMessage(null)
    startSaving(async () => {
      try {
        await removeFictionSource(activeSource.id)
        setActiveContentId('')
        setMessage('대표 원전 지정을 해제했습니다.')
        router.refresh()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : '대표 원전 지정 해제에 실패했습니다.')
      }
    })
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-accent">
            <BookMarked size={18} />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em]">Fiction source index</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">픽션 원전 관리</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-secondary">
            기존 콘텐츠 하나를 작품의 대표 원전으로 지정하고 등장인물을 연결합니다.
            이 관계는 인물의 감상 기록이 아닙니다.
          </p>
        </div>
        <div className="flex gap-5 rounded-lg border border-border bg-bg-card px-4 py-3 text-center">
          <div>
            <p className="font-mono text-xl font-semibold text-text-primary">{sources.length}</p>
            <p className="text-[10px] text-text-tertiary">대표 원전</p>
          </div>
          <div className="w-px bg-border" />
          <div>
            <p className="font-mono text-xl font-semibold text-text-primary">{characters.length}</p>
            <p className="text-[10px] text-text-tertiary">픽션 인물</p>
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-bg-card p-4">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-text-primary">기존 콘텐츠에서 대표 원전 지정</h2>
          <p className="mt-1 text-xs text-text-tertiary">
            새 콘텐츠를 만들지 않습니다. 이미 등록된 판본 가운데 서비스에서 연결할 한 건을 고릅니다.
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
                      {designated ? '관리 화면 열기' : '대표로 지정'}
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
            <h2 className="text-sm font-semibold text-text-primary">지정된 대표 원전</h2>
          </div>
          {sources.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-text-tertiary">
              아직 지정된 원전이 없습니다.
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
                        characters:{source.characterIds.length}
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
              <p className="text-sm text-text-secondary">관리할 대표 원전을 선택하세요.</p>
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

              <div className="p-4">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-text-primary">등장인물 연결</h2>
                    <p className="mt-1 text-xs text-text-tertiary">
                      작품 본문에 실제로 등장하는 인물만 선택합니다.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search
                        size={14}
                        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
                      />
                      <input
                        value={characterQuery}
                        onChange={(event) => setCharacterQuery(event.target.value)}
                        placeholder="인물 검색"
                        className="w-48 rounded-lg border border-border bg-bg-secondary py-2 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                      />
                    </div>
                    <span className="whitespace-nowrap font-mono text-xs text-accent">
                      {selectedCharacterIds.length}명 선택
                    </span>
                  </div>
                </div>

                <div className="grid max-h-[560px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 2xl:grid-cols-3">
                  {filteredCharacters.map((character) => {
                    const selected = selectedSet.has(character.id)
                    return (
                      <button
                        type="button"
                        key={character.id}
                        onClick={() => handleToggleCharacter(character)}
                        aria-pressed={selected}
                        className={`flex items-center gap-3 rounded-lg border p-2.5 text-left active:scale-[0.99] ${
                          selected
                            ? 'border-accent bg-accent/10'
                            : 'border-border bg-bg-secondary/50 hover:border-accent/60 hover:bg-accent/[0.06]'
                        }`}
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
                          {selected && <Check size={13} strokeWidth={3} />}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-4 flex justify-end border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={handleSaveCharacters}
                    disabled={isSaving}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-accent bg-accent px-4 text-sm font-bold text-bg-primary hover:bg-accent/80 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    인물 연결 저장
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
