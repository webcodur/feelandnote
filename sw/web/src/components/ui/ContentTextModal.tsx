import type { CSSProperties, ReactNode } from "react";
import { Maximize2 } from "lucide-react";

import ContentReadingText from "./ContentReadingText";
import Modal, { ModalBody, READING_MODAL_MAX_HEIGHT_CLASS } from "./Modal";
import AutoScrollReadingText from "@/components/shared/AutoScrollReadingText";
import type { ReadingSegment } from "@/lib/reading-timing";

const MODAL_GOLD_CLASS = "text-3d-gold-bright";
const MODAL_GOLD_STYLE: CSSProperties = {
  filter: "none",
  backgroundImage: "linear-gradient(to bottom, #f0c948, #c9a33a)",
};
const MODAL_SOURCE_CLASS =
  `mt-5 block break-all text-sm font-medium leading-relaxed ${MODAL_GOLD_CLASS} underline decoration-accent/60 underline-offset-4 hover:brightness-125 hover:decoration-accent-hover`;

interface ExpandTextButtonProps {
  label: string;
  onClick: () => void;
}

export function ExpandTextButton({ label, onClick }: ExpandTextButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-text-tertiary hover:border-accent/50 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
    >
      <Maximize2 size={15} aria-hidden />
    </button>
  );
}

interface ContentTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  text: string;
  notice?: ReactNode;
  /** 원문 기준 강조 범위(재생 문장 등) */
  mark?: { start: number; end: number } | null;
  /** 문장 타이밍 — 주면 문장을 눌러 그 시점부터 재생한다 */
  segments?: ReadingSegment[] | null;
  /** 낭독 상태·재생 위치 — 넘기면 재생 문장을 따라 모달 본문이 스스로 스크롤한다 */
  status?: string;
  currentTime?: number;
  onPlayFrom?: (seconds: number) => void;
  /** 문장 조각 버튼의 접근성 라벨 */
  sentenceLabel?: string;
  source?: {
    href: string;
    label: ReactNode;
  };
}

export default function ContentTextModal({
  isOpen,
  onClose,
  title,
  text,
  notice,
  mark,
  segments,
  status,
  currentTime,
  onPlayFrom,
  sentenceLabel,
  source,
}: ContentTextModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      titleClassName={`font-semibold tracking-wide ${MODAL_GOLD_CLASS}`}
      titleStyle={MODAL_GOLD_STYLE}
      stickyHeader
      size="xl"
      maxHeightClassName={READING_MODAL_MAX_HEIGHT_CLASS}
      fadeClippedEnd
    >
      <ModalBody className="p-4 sm:p-6">
        {notice}
        <ContentReadingText
          text={segments?.length && onPlayFrom ? undefined : text}
          tone="primary"
          size="modal"
          mark={segments?.length && onPlayFrom ? undefined : mark}
        >
          {segments?.length && onPlayFrom ? (
            <AutoScrollReadingText
              viewport="parent"
              text={text}
              segments={segments}
              status={status ?? "idle"}
              currentTime={currentTime ?? 0}
              onPlayFrom={onPlayFrom}
              sentenceLabel={sentenceLabel}
            />
          ) : null}
        </ContentReadingText>
        {source && (
          <a
            href={source.href}
            target="_blank"
            rel="noopener noreferrer"
            className={MODAL_SOURCE_CLASS}
            style={MODAL_GOLD_STYLE}
          >
            {source.label}
          </a>
        )}
      </ModalBody>
    </Modal>
  );
}
