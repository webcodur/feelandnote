'use client'

import type { EditLang } from '@feelandnote/shared/bo/editor'
import type { FactionPerson } from '@/lib/faction-types'
import { CoverPickerButton } from './CoverPickerButton/CoverPickerButton'
import { FactionAssignedPersonEpithetVoice } from './FactionAssignedPersonEpithetVoice'

const inputClass = 'w-full rounded-md border border-border bg-bg-main px-2.5 py-2 text-xs text-text-primary focus:border-accent focus:outline-none'

function linesValue(lines: string[] | undefined): string {
  return (lines ?? []).join('\n')
}

function parseLines(value: string): string[] | undefined {
  const lines = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  return lines.length ? lines : undefined
}

/**
 * 할당된 대사에서 그 인물의 장면 기본값을 고친다.
 *
 * 독립 인물 카드를 다시 만들지 않고, 해당 인물이 실제로 말하는 컷 안에 이름·직함·수식어·
 * 기본 화보와 노출 범위를 둔다. 컷의 본문·화면·음성 오버라이드는 바깥 FactionSceneBeatRow가 소유한다.
 */
export function FactionAssignedPersonSettings({
  person,
  editLang,
  series,
  episodeName,
  epithetVoiceFile,
  onChange,
}: {
  person: FactionPerson
  editLang: EditLang
  series: string
  episodeName: string
  epithetVoiceFile?: string
  onChange: (next: FactionPerson) => void
}) {
  const lineCount = Math.max(person.lines?.length ?? 0, person.linesEn?.length ?? 0)
  const summary = [
    lineCount > 0 ? `직함 ${lineCount}줄` : '직함 없음',
    person.epithet || person.epithetEn ? '수식어 있음' : '수식어 없음',
    person.image ? '기본 화보 있음' : '기본 화보 없음',
  ].join(' · ')

  return (
    <details data-faction-assigned-person-settings="true" className="group/person rounded-md border border-border/70 bg-bg-main/25">
      <summary className="flex min-h-10 cursor-pointer list-none flex-wrap items-center gap-2 rounded-md px-3 py-2 hover:bg-bg-hover group-open/person:rounded-b-none">
        <span className="text-[11px] font-black text-text-secondary">인물 기본값</span>
        <span className="rounded-md border border-border bg-bg-secondary px-2 py-0.5 text-xs font-bold text-text-primary">{editLang === 'en' ? person.nameEn ?? person.name : person.name}</span>
        <span className="min-w-0 flex-1 truncate text-[10px] text-text-dim">{summary}</span>
        {person.longformOnly ? <span className="rounded border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">롱폼 전용</span> : null}
        {person.disabled ? <span className="rounded border border-danger/40 bg-danger/10 px-1.5 py-0.5 text-[10px] font-bold text-danger-text">영상 제외</span> : null}
        <span className="text-xs text-text-tertiary group-open/person:rotate-180" aria-hidden="true">⌄</span>
      </summary>

      <div className="grid justify-start gap-4 border-t border-border/60 bg-bg-main/20 p-3 lg:grid-cols-[11rem_minmax(0,56rem)]">
        <div className="space-y-2 border-r border-border/60 pr-3">
          <CoverPickerButton
            value={person.image}
            onChange={image => onChange({ ...person, image, ...(!image ? { imageCrop: undefined, zoomFocus: undefined } : {}) })}
            crop={person.imageCrop}
            onCropChange={imageCrop => onChange({ ...person, imageCrop })}
            zoomFocus={person.zoomFocus}
            onZoomFocusChange={zoomFocus => onChange({ ...person, zoomFocus })}
            cropFit="cover"
            series={series}
            episodeName={episodeName}
            className="h-28 w-44"
            label="인물 기본 화보"
            emptyText="기본 화보 선택"
          />
          <p className="text-[10px] leading-relaxed text-text-dim">이 인물의 모든 할당 대사가 상속합니다. 컷 사진을 따로 고르면 그 컷만 우선합니다.</p>
        </div>

        <div className="min-w-0 space-y-2.5">
          <div className="text-[10px] font-black text-text-secondary">인물 정보 · 모든 할당 컷에 적용</div>
          <div className={`grid gap-2 ${editLang === 'both' ? 'xl:grid-cols-2' : ''}`}>
            {editLang !== 'en' ? (
              <div className="space-y-2">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-text-dim">표시 이름</span>
                  <input value={person.name} onChange={event => onChange({ ...person, name: event.target.value })} className={inputClass} aria-label={`${person.name || '인물'} 한국어 표시 이름`} />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-text-dim">직함·이력 <span className="font-normal">(한 줄에 하나)</span></span>
                  <textarea rows={3} value={linesValue(person.lines)} onChange={event => onChange({ ...person, lines: parseLines(event.target.value) })} className={`${inputClass} resize-y`} placeholder={'이타카의 왕\n트로이 전쟁의 영웅'} />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-text-dim">수식어</span>
                  <textarea rows={2} value={person.epithet ?? ''} onChange={event => onChange({ ...person, epithet: event.target.value || undefined })} className={`${inputClass} resize-y`} placeholder="대사 전에 표시하거나 낭독할 인물 소개" />
                </label>
              </div>
            ) : null}

            {editLang !== 'ko' ? (
              <div className="space-y-2">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-text-dim">English name</span>
                  <input value={person.nameEn ?? ''} onChange={event => onChange({ ...person, nameEn: event.target.value || undefined })} className={inputClass} aria-label={`${person.name || 'person'} English display name`} />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-text-dim">English credits <span className="font-normal">(one per line)</span></span>
                  <textarea rows={3} value={linesValue(person.linesEn)} onChange={event => onChange({ ...person, linesEn: parseLines(event.target.value) })} className={`${inputClass} resize-y`} placeholder={'King of Ithaca\nHero of the Trojan War'} />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold text-text-dim">English epithet</span>
                  <textarea rows={2} value={person.epithetEn ?? ''} onChange={event => onChange({ ...person, epithetEn: event.target.value || undefined })} className={`${inputClass} resize-y`} placeholder="Identity line shown or narrated before dialogue" />
                </label>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-2">
            <span className="text-[10px] font-bold text-text-dim">노출 범위</span>
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary">
              <input type="checkbox" checked={!!person.longformOnly} onChange={event => onChange({ ...person, longformOnly: event.target.checked || undefined })} className="accent-accent" />
              롱폼 전용
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary">
              <input type="checkbox" checked={!!person.disabled} onChange={event => onChange({ ...person, disabled: event.target.checked || undefined })} className="accent-accent" />
              영상에서 제외
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary" title="서비스 도감에서 실존 인물이 아닌 신화·전설·허구 인물로 판정합니다">
              <input type="checkbox" checked={!!person.mythical} onChange={event => onChange({ ...person, mythical: event.target.checked || undefined })} className="accent-accent" />
              신화·허구 인물
            </label>
          </div>
        </div>
      </div>
      {epithetVoiceFile ? (
        <FactionAssignedPersonEpithetVoice
          person={person}
          voiceFile={epithetVoiceFile}
          series={series}
          episodeName={episodeName}
          editLang={editLang}
          onChange={onChange}
        />
      ) : null}
    </details>
  )
}
