'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ImageIcon, Star } from 'lucide-react'
import { FACTION_IMAGE_DND } from '@feelandnote/shared/bo/media'
import type { FactionPersonProfile } from '@/actions/admin/factions/people'
import PersistedCelebAvatarEditor from '@/components/celeb/avatar/PersistedCelebAvatarEditor'
import PersistedCelebPortraitEditor from '@/components/celeb/portrait/PersistedCelebPortraitEditor'
import type { FactionCastEntry } from './cast'
import { FactionImageFileButton } from './FactionImageFileButton'

type ImagePatch = Pick<FactionPersonProfile, 'avatarUrl'> | Pick<FactionPersonProfile, 'portraitUrl'>

export function FactionPersonProfileCard({
  cast,
  profile,
  priority,
  loadPoolFile,
  onImageChange,
}: {
  cast: FactionCastEntry
  profile?: FactionPersonProfile
  priority: boolean
  loadPoolFile: (path: string) => Promise<File>
  onImageChange: (patch: ImagePatch) => void
}) {
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [portraitFile, setPortraitFile] = useState<File | null>(null)
  const name = profile?.nickname || cast.name
  const slug = profile?.slug || cast.slug
  const detailHref = slug ? `/celebs/${slug}` : null
  const unavailable = !cast.celebId || !profile

  return (
    <article
      className="rounded-xl border border-border bg-bg-card p-4 hover:border-accent"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '250px' }}
    >
      <header className="mb-4 flex min-w-0 items-start justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          {detailHref ? (
            <Link href={detailHref} className="inline-flex max-w-full items-center gap-1 text-base font-bold text-text-primary hover:text-accent">
              <span className="truncate">{name}</span>
              <ArrowUpRight className="h-4 w-4 shrink-0" />
            </Link>
          ) : (
            <h3 className="truncate text-base font-bold text-text-primary">{name}</h3>
          )}
          <p className="mt-0.5 truncate text-xs text-text-secondary">
            {profile?.title || profile?.profession || cast.role || slug || '등장인물'}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {cast.excluded && <Badge warn>영상 제외</Badge>}
          {cast.appearances > 1 && <Badge>{cast.appearances}회 등장</Badge>}
          {profile?.publicationStatus && profile.publicationStatus !== 'active' && (
            <Badge warn>{profile.publicationStatus}</Badge>
          )}
        </div>
      </header>

      {unavailable ? (
        <div className="rounded-lg border border-dashed border-warning/50 bg-warning/5 px-4 py-10 text-center">
          <p className="text-sm font-semibold text-warning-text">
            {cast.celebId ? '연결된 셀럽 프로필을 찾지 못했습니다.' : '셀럽 DB에 연결되지 않은 인물입니다.'}
          </p>
          <p className="mt-1 text-xs text-text-secondary">정비 화면에서 인물을 셀럽 검색으로 다시 연결한 뒤 사진을 등록하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[7rem_5.5rem_minmax(0,1fr)] items-start gap-3">
          <figure className="min-w-0">
            <figcaption className="mb-1.5 text-center text-xs font-semibold text-text-secondary">아바타</figcaption>
            <PersistedCelebAvatarEditor
              celebId={profile.id}
              avatarUrl={profile.avatarUrl}
              name={name}
              refreshAfterSave={false}
              loadImmediately={priority}
              highPriority={priority}
              incomingFile={avatarFile}
              onIncomingDone={() => setAvatarFile(null)}
              externalDropType={FACTION_IMAGE_DND}
              onExternalDrop={async path => setAvatarFile(await loadPoolFile(path))}
              onSaved={url => onImageChange({ avatarUrl: url })}
              className="h-28 w-28 shrink-0 rounded-xl data-[dragging=true]:ring-2 data-[dragging=true]:ring-accent"
              previewClassName="h-28 w-28 rounded-xl border border-border hover:border-accent"
              empty={<Star className="h-7 w-7 text-accent" />}
            />
            <FactionImageFileButton
              label={profile.avatarUrl ? '아바타 교체' : '아바타 등록'}
              onPick={setAvatarFile}
            />
          </figure>

          <figure className="min-w-0">
            <figcaption className="mb-1.5 text-center text-xs font-semibold text-text-secondary">대표 사진</figcaption>
            <PersistedCelebPortraitEditor
              celebId={profile.id}
              portraitUrl={profile.portraitUrl}
              name={name}
              refreshAfterSave={false}
              loadImmediately={priority}
              highPriority={priority}
              incomingFile={portraitFile}
              onIncomingDone={() => setPortraitFile(null)}
              externalDropType={FACTION_IMAGE_DND}
              onExternalDrop={async path => setPortraitFile(await loadPoolFile(path))}
              onSaved={url => onImageChange({ portraitUrl: url })}
              compact
              className="group/portrait relative h-28 w-[5.5rem] shrink-0 overflow-hidden rounded-xl border border-border bg-bg-secondary hover:border-accent data-[dragging=true]:border-accent data-[dragging=true]:bg-accent/10 data-[dragging=true]:ring-2 data-[dragging=true]:ring-accent/30"
              empty={<ImageIcon className="h-7 w-7 text-text-secondary" />}
            />
            <FactionImageFileButton
              label={profile.portraitUrl ? '사진 교체' : '사진 등록'}
              onPick={setPortraitFile}
            />
          </figure>

          <div className="min-w-0 ps-1">
            <p className="text-xs font-semibold text-text-secondary">이 편의 소속 세력</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {cast.groupNames.map(groupName => <Badge key={groupName}>{groupName}</Badge>)}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-text-secondary">
              오른쪽 이미지 풀에서 사진을 끌어 원하는 칸에 놓으세요. 자르기·위치 조정 후 바로 저장됩니다.
            </p>
          </div>
        </div>
      )}
    </article>
  )
}

function Badge({ children, warn = false }: { children: React.ReactNode; warn?: boolean }) {
  return (
    <span className={`rounded-md border px-2 py-1 text-xs ${warn
      ? 'border-warning/40 bg-warning/10 text-warning-text'
      : 'border-border bg-bg-secondary text-text-secondary'}`}
    >
      {children}
    </span>
  )
}
