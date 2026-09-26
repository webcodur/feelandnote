/*
  파일명: /components/shared/VirtualMonologueModal.tsx
  기능: 인물 가상독백 읽기 모달
  책임: 인물 상세 「읽어보기」 밖(세력도감 인물 모달·신화의 세계 인물 상세)에서 가상독백 전문을 읽게 한다.
        빈 줄로 문단을 나누고 다른 읽기 모달과 같은 본문 크기·줄간격을 쓴다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import Modal, { ModalBody, READING_MODAL_MAX_HEIGHT_CLASS } from "@/components/ui/Modal";
import ContentReadingText from "@/components/ui/ContentReadingText";
import ReadingHighlightText from "@/components/shared/ReadingHighlightText";
import AutoScrollReadingText from "@/components/shared/AutoScrollReadingText";
import type { ReadingSegment } from "@/lib/reading-timing";
import { Z_INDEX } from "@/constants/zIndex";

interface VirtualMonologueModalProps {
  text: string;
  onClose: () => void;
  /** 다른 모달(세력도감 인물 모달) 위에 겹쳐 열 때 — 위에 띄우고 ESC가 바깥 모달까지 닫지 않게 한다 */
  nested?: boolean;
  /** 원문 기준 강조 범위(재생 문장) — 음성 재생 중 모달에서도 같은 구간을 밝힌다 */
  mark?: { start: number; end: number } | null;
  /** 문장 타이밍 — 주면 문장을 눌러 그 시점부터 재생한다 */
  segments?: ReadingSegment[] | null;
  onPlayFrom?: (seconds: number) => void;
  /** 바깥 미리보기와 같은 재생 상태·조작을 받는다. 모달은 음원을 따로 만들지 않는다. */
  status?: string;
  currentTime?: number;
  notice?: ReactNode;
}

export default function VirtualMonologueModal({ text, onClose, nested = false, mark, segments, onPlayFrom, status, currentTime = 0, notice }: VirtualMonologueModalProps) {
  const t = useTranslations("celebPage");
  const followsNarration = status !== undefined && !!segments?.length;

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
        {notice}
        <ContentReadingText size="modal" className="space-y-4">
          {followsNarration && (
            <AutoScrollReadingText
              viewport="parent" text={text} segments={segments}
              status={status} currentTime={currentTime} onPlayFrom={onPlayFrom}
              sentenceLabel={t("readingPlayFromHere")}
            />
          )}
          {!followsNarration && (
            <ReadingHighlightText text={text} mark={mark} segments={segments} onPlayFrom={onPlayFrom} sentenceLabel={t("readingPlayFromHere")} />
          )}
        </ContentReadingText>
      </ModalBody>
    </Modal>
  );
}
