/*
  천도 v2 — 길잡이
*/
'use client'

import { useCheondo } from '../context'
import { PanelTitle } from '../ui/Frame'
import { Modal } from '../ui/Overlay'
import { INK } from '../ui/theme'

export default function HowToModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { T } = useCheondo()
  return (
    <Modal open={open} onClose={onClose} width={620} label={T.howTo.title}>
      <PanelTitle title={T.howTo.title} sub={T.tagline} />
      <ol className="flex flex-col gap-3 overflow-y-auto p-5">
        {T.howTo.steps.map(([title, desc], i) => (
          <li key={title} className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center border text-[12px] font-black tabular-nums" style={{ borderColor: INK.lineStrong, color: INK.goldBright }}>{i + 1}</span>
            <div>
              <p className="text-[14px] font-bold" style={{ color: INK.text }}>{title}</p>
              <p className="text-[12px] leading-relaxed" style={{ color: INK.sub }}>{desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </Modal>
  )
}
