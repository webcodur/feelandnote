/*
  파일명: /components/shared/VirtualMonologueModal.tsx
  기능: 인물 가상독백 읽기 모달
  책임: 인물 상세 「읽어보기」 밖(세력도감 인물 모달·신화의 세계 인물 상세)에서 가상독백 전문을 읽게 한다.
        본문 위계는 인물 상세의 가상독백 문단과 같다 — 빈 줄로 문단을 나누고 명조체로 느슨하게 짠다.
*/ // ------------------------------

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import Modal, { ModalBody, READING_MODAL_MAX_HEIGHT_CLASS } from "@/components/ui/Modal";
import { Z_INDEX } from "@/constants/zIndex";

interface VirtualMonologueModalProps {
  /** 화면 언어의 인물 이름 — 제목 아래 화자 표시 */
  name: string;
  text: string;
  onClose: () => void;
  /** 다른 모달(세력도감 인물 모달) 위에 겹쳐 열 때 — 위에 띄우고 ESC가 바깥 모달까지 닫지 않게 한다 */
  nested?: boolean;
}

export default function VirtualMonologueModal({ name, text, onClose, nested = false }: VirtualMonologueModalProps) {
  const t = useTranslations("celebPage");
  const paragraphs = useMemo(
    () => text.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean),
    [text],
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t("virtualMonologue")}
      titleClassName="font-semibold tracking-wide text-3d-gold-bright"
      stickyHeader
      size="xl"
      maxHeightClassName={READING_MODAL_MAX_HEIGHT_CLASS}
      fadeClippedEnd
      zIndex={nested ? Z_INDEX.modal + 1 : undefined}
      escapeCapture={nested}
    >
      <ModalBody className="p-4 sm:p-6">
        <p className="mb-4 text-center text-xs font-bold tracking-[0.12em] text-accent">{name}</p>
        <div className="space-y-4 whitespace-pre-line break-keep font-serif text-[15px] leading-loose text-text-primary/85 md:text-base">
          {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </div>
      </ModalBody>
    </Modal>
  );
}
