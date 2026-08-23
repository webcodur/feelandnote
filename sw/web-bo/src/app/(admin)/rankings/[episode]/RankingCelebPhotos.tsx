'use client'

import { useCallback, useState } from 'react'
import { ImageIcon, Star } from 'lucide-react'
import { RANKING_IMAGE_DND, imageSrc } from '@feelandnote/shared/bo/media'
import CelebSearchBar, { type CelebSearchItem } from '@/components/celeb/CelebSearchBar'
import PersistedCelebAvatarEditor from '@/components/celeb/avatar/PersistedCelebAvatarEditor'
import PersistedCelebPortraitEditor from '@/components/celeb/portrait/PersistedCelebPortraitEditor'
import { FactionImageFileButton } from '@/components/factions/FactionEditor/FactionPeoplePanel/FactionImageFileButton'
import { RANKING_SERIES } from '@/lib/ranking-paths'
import type { RankingCelebProfile } from '@/lib/ranking-celeb'

export function uniqueRankingNames(names: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const name of names) {
    const n = name.trim()
    if (!n || seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out
}

export function RankingPersonShot({
  folder,
  name,
  profile,
  themeMembers = [],
  onProfilePatch,
  onLink,
}: {
  folder: string
  name: string
  profile?: RankingCelebProfile
  themeMembers?: RankingCelebProfile[]
  onProfilePatch: (nickname: string, patch: Partial<RankingCelebProfile>) => void
  onLink: (name: string, item: CelebSearchItem) => void
}) {
  const loadPoolFile = useCallback(async (path: string) => {
    if (!/\.(?:png|jpe?g|webp|gif)$/i.test(path)) throw new Error('이미지 파일만 놓을 수 있다')
    const src = imageSrc(RANKING_SERIES, folder, path)
    if (!src) throw new Error('이미지 경로가 비어 있다')
    const res = await fetch(src)
    if (!res.ok) throw new Error(`사진 목록을 읽지 못했다 (${res.status})`)
    const blob = await res.blob()
    return new File([blob], path.split('/').pop() || 'ranking-image', { type: blob.type || 'image/jpeg' })
  }, [folder])

  return (
    <PersonCard
      name={name}
      profile={profile}
      themeMembers={themeMembers}
      loadPoolFile={loadPoolFile}
      onProfilePatch={onProfilePatch}
      onLink={onLink}
    />
  )
}

function PersonCard({
  name, profile, themeMembers, loadPoolFile, onProfilePatch, onLink,
}: {
  name: string
  profile?: RankingCelebProfile
  themeMembers: RankingCelebProfile[]
  loadPoolFile: (path: string) => Promise<File>
  onProfilePatch: (nickname: string, patch: Partial<RankingCelebProfile>) => void
  onLink: (name: string, item: CelebSearchItem) => void
}) {
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [portraitFile, setPortraitFile] = useState<File | null>(null)
  if (!profile) {
    return (
      <article className="rounded-lg border border-dashed border-border bg-bg-secondary p-3">
        <p className="text-sm font-semibold text-text-primary">{name}</p>
        <p className="mt-1 text-xs text-text-secondary">테마에 없다. 테마에서 고르거나 셀럽을 찾아 연결한다.</p>
        {themeMembers.length ? (
          <select
            defaultValue=""
            onChange={e => {
              const person = themeMembers.find(p => p.id === e.target.value)
              e.currentTarget.value = ''
              if (!person) return
              onLink(name, { slug: person.slug, nickname: person.nickname })
            }}
            className="mt-2 w-full rounded border border-border bg-bg-card px-2 py-1.5 text-xs text-text-primary"
          >
            <option value="" disabled>테마에서 연결</option>
            {themeMembers.map(p => (
              <option key={p.id} value={p.id}>{p.nickname}</option>
            ))}
          </select>
        ) : null}
        <div className="mt-2">
          <CelebSearchBar
            initialQuery={name}
            placeholder="셀럽 이름 검색"
            clearOnSelect
            maxResults={6}
            onSelect={item => onLink(name, item)}
          />
        </div>
      </article>
    )
  }

  return (
    <article className="flex gap-3 rounded-lg border border-border bg-bg-secondary p-3">
      <figure className="w-28 shrink-0">
        <figcaption className="mb-1 text-center text-xs font-semibold text-text-secondary">아바타</figcaption>
        <PersistedCelebAvatarEditor
          celebId={profile.id}
          avatarUrl={profile.avatarUrl}
          name={profile.nickname}
          refreshAfterSave={false}
          incomingFile={avatarFile}
          onIncomingDone={() => setAvatarFile(null)}
          externalDropType={RANKING_IMAGE_DND}
          onExternalDrop={async path => setAvatarFile(await loadPoolFile(path))}
          onSaved={url => onProfilePatch(profile.nickname, { avatarUrl: url })}
          className="h-28 w-28 rounded-xl data-[dragging=true]:ring-2 data-[dragging=true]:ring-accent"
          previewClassName="h-28 w-28 rounded-xl border border-border hover:border-accent"
          empty={<Star className="h-7 w-7 text-accent" />}
        />
        <FactionImageFileButton label={profile.avatarUrl ? '교체' : '등록'} onPick={setAvatarFile} />
      </figure>
      <figure className="w-[5.5rem] shrink-0">
        <figcaption className="mb-1 text-center text-xs font-semibold text-text-secondary">대표 사진</figcaption>
        <PersistedCelebPortraitEditor
          celebId={profile.id}
          portraitUrl={profile.portraitUrl}
          name={profile.nickname}
          refreshAfterSave={false}
          incomingFile={portraitFile}
          onIncomingDone={() => setPortraitFile(null)}
          externalDropType={RANKING_IMAGE_DND}
          onExternalDrop={async path => setPortraitFile(await loadPoolFile(path))}
          onSaved={url => onProfilePatch(profile.nickname, { portraitUrl: url })}
          compact
          className="group/portrait relative h-28 w-[5.5rem] overflow-hidden rounded-xl border border-border bg-bg-card hover:border-accent data-[dragging=true]:ring-2 data-[dragging=true]:ring-accent"
          empty={<ImageIcon className="h-7 w-7 text-text-secondary" />}
        />
        <FactionImageFileButton label={profile.portraitUrl ? '교체' : '등록'} onPick={setPortraitFile} />
      </figure>
      <div className="min-w-0 pt-5">
        <p className="truncate text-sm font-semibold text-text-primary">{name}</p>
        <p className="mt-1 text-xs text-text-secondary">
          {profile.factionImageUrl ? '화면에 개인화보' : profile.portraitUrl ? '화면에 대표 사진' : '대표 사진을 등록하면 화면에 나간다'}
        </p>
        {profile.publicationStatus && profile.publicationStatus !== 'active' ? (
          <p className="mt-1 text-xs text-warning-text">{profile.publicationStatus}</p>
        ) : null}
      </div>
    </article>
  )
}
