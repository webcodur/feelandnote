import type { CSSProperties, ReactNode } from "react";
import { Maximize2 } from "lucide-react";

import ContentReadingText from "./ContentReadingText";
import Modal, { ModalBody } from "./Modal";

const MODAL_GOLD_CLASS = "text-3d-gold-bright";
const MODAL_GOLD_STYLE: CSSProperties = {
  filter: "none",
  backgroundImage: "linear-gradient(to bottom, #f0c948, #c9a33a)",
};
const MODAL_BODY_STYLE: CSSProperties = {
  fontSize: "clamp(15px, 1.25vw, 16px)",
};
/* 긴 소개도 화면을 다 채우지 않는다. 위아래 여백이 남아야 바깥을 눌러 닫을 수 있다 */
const MODAL_MAX_HEIGHT_CLASS = "max-h-[78dvh]";
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
      maxHeightClassName={MODAL_MAX_HEIGHT_CLASS}
      fadeClippedEnd
    >
      <ModalBody className="p-4 sm:p-6">
        {notice}
        <ContentReadingText
          text={text}
          tone="primary"
          size="modal"
          style={MODAL_BODY_STYLE}
          highlightClassName={MODAL_GOLD_CLASS}
          highlightStyle={MODAL_GOLD_STYLE}
        />
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
