'use client'

import { useState } from 'react'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { ChevronDown, ChevronUp, Eye, EyeOff, ImageIcon, Trash2 } from '@feelandnote/shared/bo/icons'
import { FACTION_IMAGE_DND, ImagePicker, MediaThumb, useImageDrop } from '@feelandnote/shared/bo/media'
import type { FactionGroup } from '@/lib/faction-types'
import { imageSrc } from '../../shared/timing'
import { FactionHeaderSequence } from './FactionHeaderSequence'

type Props = {
  group: FactionGroup
  groupIndex: number
  series: string
  episodeName: string
  editLang: EditLang
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  onChange: (next: FactionGroup) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onJumpCluster: (clusterIndex: number) => void
}

function foregroundFor(background: string) {
  const color = background.replace('#', '')
  if (color.length < 6) return 'rgba(255,255,255,0.78)'
  const red = parseInt(color.slice(0, 2), 16)
  const green = parseInt(color.slice(2, 4), 16)
  const blue = parseInt(color.slice(4, 6), 16)
  return 0.299 * red + 0.587 * green + 0.114 * blue > 150
    ? 'rgba(0,0,0,0.62)'
    : 'rgba(255,255,255,0.78)'
}

export function FactionGroupHeader({
  group, groupIndex, series, episodeName, editLang, expanded, onExpandedChange, onChange,
  onDelete, onMoveUp, onMoveDown, onJumpCluster,
}: Props) {
  const [logoOpen, setLogoOpen] = useState(false)
  const [logoImgOpen, setLogoImgOpen] = useState(false)
  const color = group.color ?? '#92400e'
  const onColorDim = foregroundFor(color)
  const disabled = !!group.disabled
  const logoVidSrc = imageSrc(series, episodeName, group.logoVid)
  const logoImgSrc = imageSrc(series, episodeName, group.logoImg)
  const { dragOver: logoDragOver, dropProps: logoDropProps } = useImageDrop(FACTION_IMAGE_DND, path => onChange({ ...group, logoVid: path }))
  const { dragOver: logoImgDragOver, dropProps: logoImgDropProps } = useImageDrop(FACTION_IMAGE_DND, path => onChange({ ...group, logoImg: path }))

  return (
    <>
      <header className="relative z-10 select-none rounded-t-lg p-2.5" style={{ backgroundColor: color }}>
        <div className="flex h-48 min-w-0 w-full items-stretch gap-2 overflow-x-auto scrollbar-hide">
          <section
            data-faction-group-identity="true"
            className="flex h-full w-[26rem] shrink-0 overflow-hidden rounded-md border bg-black/15 shadow-inner"
            style={{ borderColor: onColorDim }}
          >
            <button
              type="button"
              onClick={() => onExpandedChange(!expanded)}
              aria-expanded={expanded}
              aria-controls={`faction-group-body-${groupIndex}`}
              aria-label={`${groupIndex + 1}번 세력 ${expanded ? '접기' : '펼치기'}`}
              data-faction-group-accordion="true"
              className="flex w-12 shrink-0 flex-col items-center justify-center gap-1 border-r border-black/25 bg-black/20 font-mono hover:bg-black/40 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white"
              style={{ color: onColorDim }}
              title={expanded ? '세력 접기' : '세력 펼치기'}
            >
              <span className="text-[8px] font-black tracking-[0.16em] opacity-65">세력</span>
              <span className="text-xl font-black tabular-nums">#{groupIndex + 1}</span>
              <ChevronDown size={15} className={`transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`} />
            </button>

            <div className="grid min-w-0 flex-1 grid-cols-[11rem_minmax(0,1fr)] grid-rows-[5.5rem_minmax(0,1fr)] gap-2 border-l border-black/20 p-2">
              <div className={`grid grid-cols-2 gap-1.5 ${disabled ? 'opacity-40 saturate-50' : ''}`} aria-label="세력 로고">
                <button
                  type="button"
                  onClick={event => { event.stopPropagation(); setLogoOpen(true) }}
                  {...logoDropProps}
                  className={`group relative aspect-square w-full overflow-hidden rounded-md border bg-bg-card/30 p-0.5 ${logoDragOver ? 'ring-2 ring-accent' : 'hover:bg-black/20 hover:brightness-110 hover:shadow-sm'}`}
                  style={{ borderColor: logoDragOver ? undefined : onColorDim }}
                  title="클릭: 로고 영상 선택(영상 타이틀 카드 배경, 우선) · 풀에서 끌어다 놓기: 연결"
                >
                  {logoVidSrc ? <MediaThumb src={logoVidSrc} alt="" showExt fit="contain" className="h-full w-full" /> : (
                    <div style={{ color: onColorDim }} className="flex h-full flex-col items-center justify-center">
                      <ImageIcon size={24} className="opacity-70 group-hover:opacity-100" />
                      <span className="mt-1 text-[10px] font-bold opacity-70 group-hover:opacity-100">로고 영상</span>
                    </div>
                  )}
                  {logoDragOver ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-accent/30 text-[10px] font-bold text-white">연결</div> : null}
                </button>

                <button
                  type="button"
                  onClick={event => { event.stopPropagation(); setLogoImgOpen(true) }}
                  {...logoImgDropProps}
                  className={`group relative aspect-square w-full overflow-hidden rounded-md border bg-bg-card/30 p-0.5 ${logoImgDragOver ? 'ring-2 ring-accent' : 'hover:bg-black/20 hover:brightness-110 hover:shadow-sm'}`}
                  style={{ borderColor: logoImgDragOver ? undefined : onColorDim }}
                  title="클릭: 로고 이미지 선택(카드뉴스 표지·소속 배지, 로고 영상 없으면 타이틀 카드도) · 풀에서 끌어다 놓기: 연결"
                >
                  {logoImgSrc ? <MediaThumb src={logoImgSrc} alt="" showExt fit="contain" className="h-full w-full" /> : (
                    <div style={{ color: onColorDim }} className="flex h-full flex-col items-center justify-center">
                      <ImageIcon size={24} className="opacity-70 group-hover:opacity-100" />
                      <span className="mt-1 text-[10px] font-bold opacity-70 group-hover:opacity-100">로고 이미지</span>
                    </div>
                  )}
                  {logoImgDragOver ? <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-accent/30 text-[10px] font-bold text-white">연결</div> : null}
                </button>
              </div>

              <div className="flex min-w-0 flex-col items-end justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  {disabled ? <span className="shrink-0 rounded border border-danger/40 bg-danger/20 px-2 py-0.5 text-[10px] font-semibold text-danger-text">영상 제외</span> : null}
                  {group.longformOnly && !disabled ? <span className="shrink-0 rounded border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">롱폼 전용</span> : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => onChange({ ...group, disabled: disabled ? undefined : true })} aria-pressed={disabled} className={`flex h-7.5 w-7.5 items-center justify-center rounded-md border ${disabled ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-main/70 text-text-secondary hover:bg-bg-hover'}`} title={disabled ? '이 세력을 다시 영상에 포함' : '이 세력을 영상에서 제외 (데이터는 보존)'}>{disabled ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                  <button type="button" onClick={onMoveUp} className="flex h-7.5 w-7.5 items-center justify-center rounded-md border border-border bg-bg-main/70 text-text-secondary hover:bg-bg-hover" title="세력 위로 이동" aria-label="세력 위로 이동"><ChevronUp size={14} /></button>
                  <button type="button" onClick={onMoveDown} className="flex h-7.5 w-7.5 items-center justify-center rounded-md border border-border bg-bg-main/70 text-text-secondary hover:bg-bg-hover" title="세력 아래로 이동" aria-label="세력 아래로 이동"><ChevronDown size={14} /></button>
                  <span className="mx-0.5 h-4.5 w-px bg-black/25" aria-hidden="true" />
                  <button type="button" onClick={onDelete} className="flex h-7.5 w-7.5 items-center justify-center rounded-md border border-danger/50 bg-black/10 text-danger-text hover:bg-danger/20" title="세력 삭제" aria-label="세력 삭제"><Trash2 size={14} /></button>
                </div>
              </div>

              <div className={`col-span-2 grid min-h-0 gap-1 ${editLang === 'both' ? 'grid-rows-2' : 'grid-rows-1'} ${disabled ? 'opacity-40 saturate-50' : ''}`} data-faction-group-title="true">
                {editLang !== 'en' ? <textarea rows={2} placeholder={'첫 줄=명칭, 둘째 줄부터=설명(세력색)'} value={group.name} onChange={event => onChange({ ...group, name: event.target.value })} className="h-full min-h-0 w-full resize-none rounded-md border border-border bg-bg-card px-2.5 py-1.5 text-xs font-semibold leading-snug focus:border-accent focus:outline-none sm:text-sm" /> : null}
                {editLang !== 'ko' ? <textarea rows={2} placeholder={'첫 줄=명칭, 둘째 줄부터=설명'} value={group.nameEn ?? ''} onChange={event => onChange({ ...group, nameEn: event.target.value || undefined })} className="h-full min-h-0 w-full resize-none rounded-md border border-border/60 bg-bg-card/80 px-2.5 py-1.5 text-xs leading-snug text-text-secondary focus:border-accent focus:outline-none" /> : null}
              </div>
            </div>
          </section>

          <div className={`h-full shrink-0 ${disabled ? 'opacity-40 saturate-50' : ''}`}>
            <FactionHeaderSequence
              group={group}
              groupIndex={groupIndex}
              series={series}
              episodeName={episodeName}
              borderColor={onColorDim}
              onJumpCluster={onJumpCluster}
            />
          </div>
        </div>
      </header>

      {logoOpen ? <ImagePicker value={group.logoVid} onChange={logoVid => onChange({ ...group, logoVid })} crop={group.logoCrop} onCropChange={logoCrop => onChange({ ...group, logoCrop })} cropFit="contain" series={series} episodeName={episodeName} onClose={() => setLogoOpen(false)} /> : null}
      {logoImgOpen ? <ImagePicker value={group.logoImg} onChange={logoImg => onChange({ ...group, logoImg })} crop={group.logoCrop} onCropChange={logoCrop => onChange({ ...group, logoCrop })} cropFit="contain" series={series} episodeName={episodeName} onClose={() => setLogoImgOpen(false)} /> : null}
    </>
  )
}
