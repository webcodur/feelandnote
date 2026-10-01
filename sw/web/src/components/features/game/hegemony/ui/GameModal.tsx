/*
  파일명: components/features/game/hegemony/ui/GameModal.tsx
  기능: 패권 창
  책임: 전체화면 게임 위에 뜨는 창의 층·겉모양·ESC 처리를 한 곳에 맞춘다(ESC는 창만 닫고 게임을 나가지 않는다).
*/
"use client";

import type { ReactNode } from "react";
import Modal from "@/components/ui/Modal";
import { Z_INDEX } from "@/constants/zIndex";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}

export default function GameModal({ open, onClose, title, children, wide = false }: Props) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={title}
      frame="plain"
      escapeCapture
      zIndex={Z_INDEX.gameModal}
      widthClassName={wide ? "max-w-2xl" : "max-w-md"}
      boxClassName="break-keep rounded-2xl border border-hg-line bg-hg-panel text-text-primary shadow-2xl shadow-black/60"
      overlayClassName="bg-hg-ink/75 backdrop-blur-sm"
    >
      <div className="px-5 pb-5 pt-1">{children}</div>
    </Modal>
  );
}
