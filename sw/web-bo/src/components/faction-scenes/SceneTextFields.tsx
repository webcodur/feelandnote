'use client'

import type { FactionSceneEnding, FactionTeamImage } from '@feelandnote/shared/lib/faction-team-image'
import type { FactionMember } from '@/actions/admin/factions/entries'
import { SCENE_INPUT } from './styles'

export function SceneTextFields({ image, patch, members }: { image: FactionTeamImage; patch: (patch: Partial<FactionTeamImage>) => void; members: FactionMember[] }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        {(['ko', 'en'] as const).map(locale => {
          const title = locale === 'ko' ? 'label' : 'labelEn'
          const caption = locale === 'ko' ? 'caption' : 'captionEn'
          return <div key={locale} className="space-y-3">
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary">{locale === 'ko' ? '한국어' : 'ENGLISH'}</h3>
            <label className="block space-y-1.5"><span className="text-xs text-text-secondary">{locale === 'ko' ? '제목' : 'English title'}</span><input value={image[title] ?? ''} onChange={e => patch({ [title]: e.target.value })} className={SCENE_INPUT} /></label>
            <label className="block space-y-1.5"><span className="text-xs text-text-secondary">{locale === 'ko' ? '장면 해설' : 'English caption'}</span><textarea rows={7} value={image[caption] ?? ''} onChange={e => patch({ [caption]: e.target.value })} className={`${SCENE_INPUT} resize-y leading-6`} /></label>
          </div>
        })}
      </div>
      <details className="rounded-lg border border-border p-3">
        <summary className="cursor-pointer text-sm text-text-secondary hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">등장인물 · {image.celebIds?.length ?? 0}명 선택</summary>
        <div className="mt-3 flex max-h-52 flex-wrap gap-1.5 overflow-y-auto">
          {members.map(member => {
            const selected = image.celebIds?.includes(member.celeb_id)
            return <button type="button" key={member.celeb_id} aria-pressed={!!selected} onClick={() => patch({ celebIds: selected ? image.celebIds?.filter(id => id !== member.celeb_id) : [...(image.celebIds ?? []), member.celeb_id] })}
              className={`rounded-full border px-2.5 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent ${selected ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary hover:border-accent hover:text-accent'}`}>{member.celeb?.nickname ?? member.celeb_id}</button>
          })}
          {!members.length && <span className="text-xs text-text-tertiary">등록된 구성원이 없습니다.</span>}
        </div>
      </details>
    </div>
  )
}

export function SceneEndingFields({ ending, onChange }: { ending: FactionSceneEnding; onChange: (ending: FactionSceneEnding) => void }) {
  return <div className="grid gap-4 md:grid-cols-2">
    {(['ko', 'en'] as const).map(locale => {
      const title = locale === 'ko' ? 'title' : 'titleEn'
      const text = locale === 'ko' ? 'text' : 'textEn'
      return <div key={locale} className="space-y-3">
        <label className="block space-y-1.5"><span className="text-xs text-text-secondary">{locale === 'ko' ? '엔딩 제목' : 'English ending title'}</span><input value={ending[title] ?? ''} onChange={e => onChange({ ...ending, [title]: e.target.value })} className={SCENE_INPUT} /></label>
        <label className="block space-y-1.5"><span className="text-xs text-text-secondary">{locale === 'ko' ? '후속 이야기' : 'English ending text'}</span><textarea rows={5} value={ending[text] ?? ''} onChange={e => onChange({ ...ending, [text]: e.target.value })} className={`${SCENE_INPUT} resize-y leading-6`} /></label>
      </div>
    })}
  </div>
}
