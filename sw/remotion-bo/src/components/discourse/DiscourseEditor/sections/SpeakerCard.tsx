'use client'

/**
 * 인물 카드 한 장 — 이름·연결 키·직함·수식어·생몰·색·사진·음성 기본값.
 * 무슨 말을 하는지는 여기에 없다(편성 탭). 인물이 **누구인지**만 담는다.
 */

import { useState } from 'react'
import type { Speaker, DiscourseVoice } from '@/lib/discourse-types'
import { ChevronUp, ChevronDown, Trash2, Eye, EyeOff } from '@/components/icons'
import { CelebBadge } from '../../shared/CelebBadge'
import { imageSrc } from '../../shared/timing'
import { MediaThumb, ImageLightbox, ImageSlot, DISCOURSE_IMAGE_DND } from '@/components/media'
import type { EditLang } from '@/components/editor'
import { LangText } from './LangField'
import { VoiceFields } from './VoiceFields'
import { castColorOf } from './CastColorBar'

type Props = {
  speaker: Speaker
  index: number
  total: number
  /** 이 인물이 하는 발언 수 — 편성 탭 데이터 */
  turnCount: number
  episodeName: string
  series: string
  editLang: EditLang
  celebExisting: Set<string>
  celebLoaded: boolean
  onChange: (next: Speaker) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

const orUndef = (v: string) => (v.trim() ? v : undefined)

/** 인물색 후보 — 렌더 기본 팔레트와 같은 계열. 직접 고르는 칸도 함께 둔다 */
const COLOR_PRESETS = ['#c9a227', '#5aa9e6', '#e05c5c', '#6fcf97', '#b07de0', '#e08c3c', '#4ecdc4', '#d96ba0']

export function SpeakerCard({
  speaker, index, total, turnCount, episodeName, series, editLang,
  celebExisting, celebLoaded, onChange, onDelete, onMoveUp, onMoveDown,
}: Props) {
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState<number | null>(null)
  const color = castColorOf(speaker, index)
  const src = imageSrc(series, episodeName, speaker.image)

  const set = (patch: Partial<Speaker>) => onChange({ ...speaker, ...patch })
  const setLine = (li: number, v: string) => {
    const lines = [...(speaker.lines ?? ['', '', ''])]
    lines[li] = v
    set({ lines })
  }
  const setLineEn = (li: number, v: string) => {
    const linesEn = [...(speaker.linesEn ?? ['', '', ''])]
    linesEn[li] = v
    set({ linesEn })
  }

  return (
    <div
      className="rounded-lg border border-border bg-bg-card"
      style={{ borderInlineStartWidth: 4, borderInlineStartColor: color, ...(speaker.disabled ? { opacity: 0.5 } : {}) }}
    >
      {/* 머리 — 접힌 상태에서도 정체가 읽힌다 */}
      <div className="flex items-center gap-2 p-2.5">
        <span className="w-5 shrink-0 text-center font-mono text-[11px] text-text-dim">{index + 1}</span>
        {src ? (
          <MediaThumb src={src} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-secondary text-xs font-bold text-text-secondary">
            {(speaker.name || '?').trim()[0] ?? '?'}
          </span>
        )}
        <button onClick={() => setOpen(v => !v)} className="min-w-0 flex-1 text-start hover:text-accent">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{speaker.name || '이름 없음'}</span>
            <CelebBadge speaker={speaker} existing={celebExisting} loaded={celebLoaded} />
            {speaker.living && (
              <span title="생존 인물 — 고지·편성 판단이 따로 필요합니다(§3 고지 원칙)" className="shrink-0 rounded bg-info px-1 text-[10px] font-bold text-info-text">생존</span>
            )}
            {speaker.disabled && <span className="shrink-0 rounded bg-danger px-1 text-[10px] font-bold text-danger-text">영상 제외</span>}
          </span>
          <span className="truncate text-[11px] text-text-dim">
            발언 {turnCount}개{speaker.era ? ` · ${speaker.era}` : ''}{speaker.lines?.[0] ? ` · ${speaker.lines[0]}` : ''}
          </span>
        </button>

        <span className="flex shrink-0 items-center gap-0.5">
          <button onClick={onMoveUp} disabled={index === 0} className="rounded p-1 text-text-secondary hover:bg-bg-hover hover:text-accent disabled:opacity-30" title="위로 (발언의 발언자 번호도 함께 옮깁니다)">
            <ChevronUp size={14} />
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="rounded p-1 text-text-secondary hover:bg-bg-hover hover:text-accent disabled:opacity-30" title="아래로 (발언의 발언자 번호도 함께 옮깁니다)">
            <ChevronDown size={14} />
          </button>
          <button
            onClick={() => set({ disabled: speaker.disabled ? undefined : true })}
            className="rounded p-1 text-text-secondary hover:bg-bg-hover hover:text-accent"
            title={speaker.disabled ? '이 인물을 다시 영상에 넣습니다' : '이 인물을 영상에서 뺍니다 (발언도 함께 빠집니다. 데이터는 남습니다)'}
          >
            {speaker.disabled ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button onClick={onDelete} className="rounded p-1 text-danger-text hover:bg-danger" title="인물 삭제">
            <Trash2 size={14} />
          </button>
          <button onClick={() => setOpen(v => !v)} className="rounded px-1.5 py-1 text-[11px] text-text-secondary hover:bg-bg-hover hover:text-accent">
            {open ? '접기' : '펼치기'}
          </button>
        </span>
      </div>

      {open && (
        <div className="space-y-2 border-t border-border p-3">
          <LangText
            label="이름 -" editLang={editLang}
            ko={speaker.name ?? ''} en={speaker.nameEn ?? ''}
            onKo={v => set({ name: v })} onEn={v => set({ nameEn: orUndef(v) })}
          />

          <div className="flex items-center gap-2">
            <label className="w-20 shrink-0 text-xs text-text-dim">연결 키 -</label>
            <input
              value={speaker.slug ?? ''} placeholder="본서비스 셀럽 slug (예: qin-shi-huang)"
              onChange={e => set({ slug: orUndef(e.target.value) })}
              className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-3 py-1.5 font-mono text-xs focus:border-accent focus:outline-none"
            />
            <CelebBadge speaker={speaker} existing={celebExisting} loaded={celebLoaded} />
          </div>
          <p className="ps-22 text-[11px] text-text-dim">
            본서비스 인물과 잇는 열쇠입니다. 이 값으로 가상 독백 원천·인물 사진이 연결되고, 음원 파일 이름에도 들어갑니다.
          </p>

          {/* 직함 3줄 — 첫 줄은 짧은 대표 직함 */}
          {[0, 1, 2].map(li => (
            <LangText
              key={li}
              label={li === 0 ? '직함 -' : ''} editLang={editLang}
              ko={speaker.lines?.[li] ?? ''} en={speaker.linesEn?.[li] ?? ''}
              onKo={v => setLine(li, v)} onEn={v => setLineEn(li, v)}
              placeholder={li === 0 ? '짧은 대표 직함 (첫 줄)' : `${li + 1}번째 줄`}
              hint={li === 0 ? '첫 줄은 짧게. 발언하는 인물은 이 줄만 화면에 뜹니다.' : undefined}
            />
          ))}

          <LangText
            label="수식어 -" editLang={editLang}
            ko={speaker.epithet ?? ''} en={speaker.epithetEn ?? ''}
            onKo={v => set({ epithet: orUndef(v) })} onEn={v => set({ epithetEn: orUndef(v) })}
            placeholder="인물을 규정하는 한 문장 (소개 컷에서 낭독·표시)"
          />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-text-dim">
              생몰
              <input
                value={speaker.era ?? ''} placeholder="기원전 259 ~ 기원전 210"
                onChange={e => set({ era: orUndef(e.target.value) })}
                className="w-52 rounded-md border border-border bg-bg-card px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
              />
            </span>
            <label className="inline-flex items-center gap-1.5 text-xs text-text-dim" title="생존 인물은 고지·편성 판단이 따로 필요하다(§3 고지 원칙)">
              <input type="checkbox" checked={!!speaker.living} onChange={e => set({ living: e.target.checked || undefined })} className="accent-accent" />
              생존 인물
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs text-text-dim" title="신화·전설 속 존재 — 실존 인물이 아니다">
              <input type="checkbox" checked={!!speaker.mythical} onChange={e => set({ mythical: e.target.checked || undefined })} className="accent-accent" />
              신화 속 존재
            </label>
          </div>

          {/* 인물색 — 발언자 식별이 이 색에 걸려 있다 */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="w-20 shrink-0 text-xs text-text-dim">인물색 -</label>
            {COLOR_PRESETS.map(c => (
              <button
                key={c}
                onClick={() => set({ color: c })}
                className={`h-6 w-6 rounded-full border-2 hover:border-accent ${speaker.color === c ? 'border-accent' : 'border-border'}`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
            <input
              type="color" value={color}
              onChange={e => set({ color: e.target.value })}
              className="h-7 w-10 cursor-pointer rounded border border-border bg-bg-card"
              title="색 직접 고르기"
            />
            <span className="font-mono text-[10px] text-text-dim">{color}{speaker.color ? '' : ' (기본 팔레트)'}</span>
            {speaker.color && (
              <button onClick={() => set({ color: undefined })} className="text-[11px] text-text-secondary hover:text-accent">
                기본으로
              </button>
            )}
            <span className="text-[11px] text-text-dim">이름·자막이 이 색으로 강조됩니다. 인물마다 갈려야 누가 말하는지 읽힙니다.</span>
          </div>

          <div className="flex items-start gap-3">
            <label className="mt-1.5 w-20 shrink-0 text-xs text-text-dim">소개 사진 -</label>
            <ImageSlot
              dnd={DISCOURSE_IMAGE_DND}
              captionArea
              value={speaker.image}
              onChange={v => set({ image: v })}
              crop={speaker.imageCrop}
              onCropChange={c => set({ imageCrop: c })}
              series={series}
              episodeName={episodeName}
              size={112}
              pickerTitle={`${speaker.name || '이 인물'}의 소개 사진`}
            />
            <div className="min-w-0 flex-1 space-y-2">
              <input
                value={speaker.image ?? ''} placeholder="cast/qin-shi-huang/01.png"
                onChange={e => set({ image: orUndef(e.target.value) })}
                className="w-full rounded-md border border-border bg-bg-card px-3 py-1.5 font-mono text-xs focus:border-accent focus:outline-none"
              />
              {src && (
                <button
                  onClick={() => setZoom(0)}
                  className="text-[11px] text-text-secondary underline hover:text-accent"
                  title="원본 크기로 봅니다"
                >
                  원본 크기로 보기
                </button>
              )}
              <p className="text-[11px] text-text-dim">
                발언에 사진을 따로 걸지 않으면 이 사진이 그 발언 내내 화면에 뜹니다.
                왼쪽 칸을 누르면 사진을 고르고 세로 화면에서 보일 자리를 잡습니다.
              </p>
            </div>
          </div>

          {/* 음성 기본값 — 발언이 따로 정하지 않으면 이 설정으로 합성한다 */}
          <VoiceFields
            title="음성 기본 설정"
            hint="이 인물의 모든 발언이 이 설정으로 합성됩니다. 톤이 바뀌는 발언만 편성 탭에서 따로 덮어씁니다."
            voice={speaker.voice}
            onChange={(v?: DiscourseVoice) => set({ voice: v })}
          />
        </div>
      )}

      {src && (
        <ImageLightbox
          shots={[{ src, path: speaker.image ?? '', caption: speaker.name, when: '인물 소개 사진' }]}
          index={zoom}
          onClose={() => setZoom(null)}
          onIndex={setZoom}
        />
      )}
    </div>
  )
}
