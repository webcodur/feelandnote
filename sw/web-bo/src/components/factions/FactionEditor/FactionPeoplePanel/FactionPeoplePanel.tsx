'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { imageSrc } from '@feelandnote/shared/bo/media-src'
import {
  loadFactionPeopleProfiles,
  type FactionPersonProfile,
} from '@/actions/admin/factions/people'
import type { FactionGroup } from '@/lib/faction-types'
import { collectFactionCast } from './cast'
import { FactionPersonProfileCard } from './FactionPersonProfileCard'
import { FactionPeopleToolbar, type ImageFilter } from './FactionPeopleToolbar'

type LoadState = 'loading' | 'ready' | 'error'

export default function FactionPeoplePanel({
  groups,
  series,
  episodeName,
}: {
  groups: FactionGroup[]
  series: string
  episodeName: string
}) {
  const cast = useMemo(() => collectFactionCast(groups), [groups])
  const celebIds = useMemo(
    () => cast.flatMap(person => person.celebId ? [person.celebId] : []),
    [cast],
  )
  const [profiles, setProfiles] = useState<FactionPersonProfile[]>([])
  const [missingIds, setMissingIds] = useState<string[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [filter, setFilter] = useState<ImageFilter>('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoadState('loading')
    setLoadError('')
    loadFactionPeopleProfiles(celebIds)
      .then(result => {
        if (cancelled) return
        setProfiles(result.profiles)
        setMissingIds(result.missingIds)
        setLoadState('ready')
      })
      .catch(error => {
        if (cancelled) return
        setLoadError(error instanceof Error ? error.message : String(error))
        setLoadState('error')
      })
    return () => { cancelled = true }
  }, [celebIds, reloadKey])

  const profileById = useMemo(() => new Map(profiles.map(profile => [profile.id, profile])), [profiles])
  const missingIdSet = useMemo(() => new Set(missingIds), [missingIds])

  const counts = useMemo(() => {
    let avatar = 0
    let portrait = 0
    let complete = 0
    let unlinked = 0
    for (const person of cast) {
      const profile = person.celebId ? profileById.get(person.celebId) : undefined
      if (!profile) {
        unlinked += 1
        continue
      }
      if (!profile.avatarUrl) avatar += 1
      if (!profile.portraitUrl) portrait += 1
      if (profile.avatarUrl && profile.portraitUrl) complete += 1
    }
    return { all: cast.length, avatar, portrait, complete, unlinked }
  }, [cast, profileById])

  const filtered = useMemo(() => {
    const token = query.trim().toLocaleLowerCase('ko-KR')
    return cast.filter(person => {
      const profile = person.celebId ? profileById.get(person.celebId) : undefined
      const unlinked = !person.celebId || !profile || missingIdSet.has(person.celebId)
      const matches = filter === 'all'
        || (filter === 'unlinked' && unlinked)
        || (filter === 'missing' && (unlinked || !profile?.avatarUrl || !profile?.portraitUrl))
        || (filter === 'avatar' && !!profile && !profile.avatarUrl)
        || (filter === 'portrait' && !!profile && !profile.portraitUrl)
        || (filter === 'complete' && !!profile?.avatarUrl && !!profile.portraitUrl)
      if (!matches) return false
      if (!token) return true
      return [
        profile?.nickname,
        profile?.slug,
        person.name,
        person.slug,
        person.role,
        ...person.groupNames,
      ].filter(Boolean).join(' ').toLocaleLowerCase('ko-KR').includes(token)
    })
  }, [cast, filter, missingIdSet, profileById, query])

  const loadPoolFile = useCallback(async (path: string): Promise<File> => {
    if (!/\.(?:png|jpe?g|webp|gif)$/i.test(path)) {
      throw new Error('아바타와 대표 사진에는 이미지 파일만 놓을 수 있습니다.')
    }
    const src = imageSrc(series, episodeName, path)
    if (!src) throw new Error('이미지 경로가 비어 있습니다.')
    const response = await fetch(src)
    if (!response.ok) throw new Error(`이미지 풀 사진을 읽지 못했습니다. (${response.status})`)
    const blob = await response.blob()
    if (!blob.type.startsWith('image/')) throw new Error('아바타와 대표 사진에는 이미지 파일만 놓을 수 있습니다.')
    return new File([blob], path.split('/').pop() || 'faction-image', { type: blob.type })
  }, [episodeName, series])

  const patchProfile = (id: string, patch: Pick<FactionPersonProfile, 'avatarUrl'> | Pick<FactionPersonProfile, 'portraitUrl'>) => {
    setProfiles(current => current.map(profile => profile.id === id ? { ...profile, ...patch } : profile))
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-accent/40 bg-accent/5 p-4">
        <h2 className="text-base font-bold text-text-primary">이 편 전체 인물 사진</h2>
        <p className="mt-1 text-sm text-text-secondary">
          오른쪽 이미지 풀에서 사진을 끌어 아바타나 대표 사진 칸에 놓으세요. 놓는 즉시 자르기·위치 조정 창이 열리고, 완료하면 셀럽 프로필에 바로 저장됩니다.
        </p>
        <p className="mt-1 text-xs text-text-dim">영상 개인샷은 바뀌지 않습니다. 같은 인물이 여러 세력에 등장해도 여기에는 한 번만 표시됩니다.</p>
      </section>

      <FactionPeopleToolbar
        counts={counts}
        filter={filter}
        query={query}
        onFilter={setFilter}
        onQuery={setQuery}
      />

      {loadState === 'loading' ? (
        <div className="rounded-xl border border-border bg-bg-card px-4 py-16 text-center text-sm text-text-secondary">인물 프로필 사진을 불러오는 중입니다…</div>
      ) : loadState === 'error' ? (
        <div className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-12 text-center">
          <p className="text-sm font-semibold text-danger-text">프로필 사진을 불러오지 못했습니다.</p>
          <p className="mt-1 text-xs text-text-secondary">{loadError}</p>
          <button type="button" onClick={() => setReloadKey(key => key + 1)} className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-xs font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-accent">
            <RefreshCw className="h-3.5 w-3.5" /> 다시 불러오기
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card px-4 py-16 text-center text-sm text-text-secondary">조건에 맞는 등장인물이 없습니다.</div>
      ) : (
        <>
          <p className="text-sm text-text-secondary">{filtered.length}명 표시 · 대본의 첫 등장 순서</p>
          <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
            {filtered.map((person, index) => {
              const profile = person.celebId ? profileById.get(person.celebId) : undefined
              return (
                <FactionPersonProfileCard
                  key={person.key}
                  cast={person}
                  profile={profile}
                  priority={index < 4}
                  loadPoolFile={loadPoolFile}
                  onImageChange={patch => {
                    if (profile) patchProfile(profile.id, patch)
                  }}
                />
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
