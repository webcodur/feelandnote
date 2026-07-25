import { Player } from '@remotion/player'
import type { FactionScript as RmFactionScript } from '@feelandnote/remotion/src/compositions/Faction/types'
import { FactionCard, type FactionCardSpec } from '@feelandnote/remotion/src/compositions/FactionCard'
import { useImageDrop, FACTION_IMAGE_DND } from '@/components/media'
import { ASSET_BASE, RATIOS } from '../utils'

// 카드 한 칸 — 미리보기 + 클릭 편집. onDropImage 가 있으면(스토리 장) 이미지 풀 드롭존이 된다.
function CardCell({ label, card, rm, episodeName, ratio, previewW, previewH, onClick, onDropImage, dropLabel }: {
  label: string
  card: FactionCardSpec
  rm: RmFactionScript
  episodeName: string
  ratio: (typeof RATIOS)[number]
  previewW: number
  previewH: number
  onClick: () => void
  onDropImage?: (path: string) => void
  /** 드롭 오버레이 문구 (기본: 배경 컨셉샷으로 연결) */
  dropLabel?: string
}) {
  const { dragOver, dropProps } = useImageDrop(FACTION_IMAGE_DND, path => onDropImage?.(path))
  return (
    <div className="shrink-0 space-y-1.5">
      <div
        onClick={onClick}
        {...(onDropImage ? dropProps : {})}
        className={`relative cursor-pointer transition hover:brightness-110 hover:ring-2 hover:ring-accent/60 ${dragOver ? 'ring-2 ring-accent' : ''}`}
        style={{ width: previewW, height: previewH, borderRadius: 10, overflow: 'hidden', boxShadow: '0 6px 20px rgba(0,0,0,0.4)' }}
        title={onDropImage ? `클릭: 편집창 · 풀에서 끌어다 놓기: ${dropLabel ?? '배경 컨셉샷으로 연결'}` : '클릭하면 이 카드 편집창이 열립니다'}
      >
        <Player
          component={FactionCard}
          inputProps={{ script: rm, episodeName, card, assetBase: ASSET_BASE }}
          durationInFrames={1}
          fps={1}
          compositionWidth={ratio.w}
          compositionHeight={ratio.h}
          style={{ width: previewW, height: previewH, pointerEvents: 'none' }}
          controls={false}
        />
        {dragOver && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-accent/30 text-xs font-bold text-white">
            {dropLabel ?? '배경 컨셉샷으로 연결'}
          </div>
        )}
      </div>
      <div className="text-center text-xs text-text-dim">{label}</div>
    </div>
  )
}

export function CardGrid({
  shown, rm, episodeName, ratio, previewW, previewH,
  openRoutedEdit, setStoryImage, setFace
}: {
  shown: { id: string; label: string; card: FactionCardSpec }[]
  rm: RmFactionScript
  episodeName: string
  ratio: (typeof RATIOS)[number]
  previewW: number
  previewH: number
  openRoutedEdit: (id: string, label: string, card: FactionCardSpec) => void
  setStoryImage: (index: number, path: string) => void
  setFace: (path: string) => void
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {shown.map(({ id, label, card }) => (
        <CardCell
          key={id}
          label={label}
          card={card}
          rm={rm}
          episodeName={episodeName}
          ratio={ratio}
          previewW={previewW}
          previewH={previewH}
          onClick={() => openRoutedEdit(id, label, card)}
          // 드롭 연결 — 스토리 장: 배경 컨셉샷 / 신원 장: 얼굴 사진(cardFace). 둘 다 즉시 저장
          onDropImage={
            id.startsWith('story') ? path => setStoryImage(Number(id.slice(5)), path)
              : id === 'identity' ? setFace
                : undefined
          }
          dropLabel={id === 'identity' ? '얼굴 사진으로 연결' : undefined}
        />
      ))}
    </div>
  )
}
