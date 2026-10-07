import type { CSSProperties, ReactNode } from "react";
import { Maximize2 } from "lucide-react";

import ContentReadingText from "./ContentReadingText";
import Modal, { ModalBody } from "./Modal";
import SourceLink from "./SourceLink";
import AutoScrollReadingText from "@/components/shared/AutoScrollReadingText";
import type { ReadingSegment } from "@/lib/reading-timing";
import { Z_INDEX } from "@/constants/zIndex";

const MODAL_GOLD_CLASS = "text-3d-gold-bright";
const MODAL_GOLD_STYLE: CSSProperties = {
  filter: "none",
  backgroundImage: "linear-gradient(to bottom, #f0c948, #c9a33a)",
};
const MODAL_SOURCE_CLASS =
  `inline-flex min-h-11 items-center rounded-sm text-sm font-medium ${MODAL_GOLD_CLASS} underline decoration-accent/60 underline-offset-4 hover:brightness-125 hover:decoration-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`;

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
  /** 다른 모달(인물 상세 모달) 위에 겹쳐 열 때 — 위에 띄우고 ESC가 바깥 모달까지 닫지 않게 한다 */
  nested?: boolean;
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
  nested = false,
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
      fadeClippedEnd
      zIndex={nested ? Z_INDEX.modal + 1 : undefined}
      escapeCapture={nested}
      footer={source ? (
        <div data-content-text-source className="flex justify-end border-t border-line px-4 py-1 sm:px-6">
          <SourceLink sourceUrl={source.href}
            className={MODAL_SOURCE_CLASS} style={MODAL_GOLD_STYLE}>{source.label}</SourceLink>
        </div>
      ) : undefined}
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
      </ModalBody>
    </Modal>
  );
}
