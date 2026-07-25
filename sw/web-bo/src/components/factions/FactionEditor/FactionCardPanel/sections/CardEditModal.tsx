import { Player } from '@remotion/player'
import { FactionCard, type FactionCardSpec } from '@feelandnote/remotion/src/compositions/FactionCard'
import type { FactionScript as RmFactionScript } from '@feelandnote/remotion/src/compositions/Faction/types'
import type { FactionScript, FactionGroupCardFields } from '@/lib/faction-types'
import { ASSET_BASE, RATIOS } from '../utils'

export function CardEditModal({
  edit, closeEdit, rm, episodeName, ratio, editPreviewCard, person,
  editStoryIndex, draftStory, setDraftStory, view, g, saveGroupCards,
  draftStoryImg, setDraftStoryImg, draftFace, setDraftFace,
  draftQuote, setDraftQuote, editGuideKey, draftGuide, setDraftGuide, saveEdit
}: {
  edit: { id: string; label: string; card: FactionCardSpec }
  closeEdit: () => void
  rm: RmFactionScript
  episodeName: string
  ratio: (typeof RATIOS)[number]
  editPreviewCard?: FactionCardSpec
  person?: any
  editStoryIndex: number | null
  draftStory: string
  setDraftStory: (v: string) => void
  view: 'person' | 'cluster' | 'group'
  g?: any
  saveGroupCards: (name: string, patch: Partial<FactionGroupCardFields>) => void
  draftStoryImg: string
  setDraftStoryImg: (v: string) => void
  draftFace: string
  setDraftFace: (v: string) => void
  draftQuote: string
  setDraftQuote: (v: string) => void
  editGuideKey: string | null
  draftGuide: string
  setDraftGuide: (v: string) => void
  saveEdit: () => void
}) {
  return (
    <div onClick={closeEdit} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-6">
      <div onClick={e => e.stopPropagation()} className="flex max-h-full items-stretch gap-5">
        <div className="flex flex-col items-center gap-2">
          <Player
            component={FactionCard}
            inputProps={{ script: rm, episodeName, card: editPreviewCard ?? edit.card, assetBase: ASSET_BASE }}
            durationInFrames={1}
            fps={1}
            compositionWidth={ratio.w}
            compositionHeight={ratio.h}
            style={{ width: (640 * ratio.w) / ratio.h, height: 640, borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}
            controls={false}
          />
          <div className="text-sm text-white/80">{edit.label} · {ratio.label}</div>
        </div>
        <div className="flex w-96 flex-col gap-3 self-center rounded-lg border border-border bg-bg-card p-4">
          <div className="text-sm font-bold text-text-primary">{edit.label} 카드 편집{person ? ` — ${person.name}` : ''}</div>
          {editStoryIndex != null && (
            <>
              <label className="text-[11px] font-semibold text-text-dim">스토리 문단</label>
              <textarea
                rows={7}
                value={draftStory}
                onChange={e => setDraftStory(e.target.value)}
                className="w-full resize-y rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm leading-relaxed focus:border-accent focus:outline-none"
              />
              {view === 'group' && g && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      const nextStory = (g.cardStory ?? []).filter((_: any, i: number) => i !== editStoryIndex)
                      saveGroupCards(g.name, { cardStory: nextStory })
                      closeEdit()
                    }}
                    className="rounded px-2 py-1 text-[11px] text-danger-text hover:bg-danger/10"
                  >이 장 삭제</button>
                </div>
              )}
              <label className="text-[11px] font-semibold text-text-dim">배경 컨셉샷 경로 <span className="font-normal">(비우면 기본이미지)</span></label>
              <input
                value={draftStoryImg}
                onChange={e => setDraftStoryImg(e.target.value)}
                placeholder="예: 01-pioneers/1/story-turing-01.png"
                className="w-full rounded-md border border-border bg-bg-main px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
              />
            </>
          )}
          {edit.id === 'identity' && (
            <>
              <label className="text-[11px] font-semibold text-text-dim">얼굴 사진 경로 <span className="font-normal">(비우면 개인샷을 얼굴 크롭으로 사용 · 대사 카드도 함께 씀)</span></label>
              <input
                value={draftFace}
                onChange={e => setDraftFace(e.target.value)}
                placeholder="예: 01-pioneers/1/face-turing.png"
                className="w-full rounded-md border border-border bg-bg-main px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
              />
            </>
          )}
          {edit.id === 'quote' && (
            <>
              <label className="text-[11px] font-semibold text-text-dim">카드 대사 <span className="font-normal">(비우면 영상 대사 자동)</span></label>
              <textarea
                rows={3}
                value={draftQuote}
                onChange={e => setDraftQuote(e.target.value)}
                placeholder={person?.quote ?? ''}
                className="w-full resize-y rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm leading-relaxed focus:border-accent focus:outline-none"
              />
            </>
          )}
          {editGuideKey && (
            <>
              <label className="text-[11px] font-semibold text-text-dim">
                하단 나레이션 <span className="font-normal">(첫 줄바꿈 앞 토막은 세력색 강조{editGuideKey === 'identity' ? ' · 비우면 수식어 자동' : editGuideKey === 'brief' ? ' · 비우면 이름 소개 자동' : ' · 비우면 이 장의 나레이션 없음'})</span>
              </label>
              <textarea
                rows={4}
                value={draftGuide}
                onChange={e => setDraftGuide(e.target.value)}
                placeholder={editGuideKey === 'identity' ? person?.epithet ?? '' : ''}
                className="w-full resize-y rounded-md border border-border bg-bg-main px-2 py-1.5 text-sm leading-relaxed focus:border-accent focus:outline-none"
              />
            </>
          )}
          {editStoryIndex == null && edit.id !== 'quote' && !editGuideKey && (
            <p className="text-xs text-text-dim">이 카드는 따로 고칠 값이 없습니다. 내용은 인물·세력 데이터에서 자동으로 채워집니다.</p>
          )}
          <div className="mt-1 flex items-center justify-end gap-2">
            <button onClick={closeEdit} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-hover">닫기</button>
            {(editStoryIndex != null || edit.id === 'quote' || editGuideKey) && (
              <button onClick={saveEdit} className="rounded-md border border-accent bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20">이 카드에 저장</button>
            )}
          </div>
          <p className="text-[10px] text-text-dim">저장하면 카드 대본 파일(person-cards/인물명.json)에 바로 기록됩니다 — 영상 데이터와 별개</p>
        </div>
      </div>
    </div>
  )
}
