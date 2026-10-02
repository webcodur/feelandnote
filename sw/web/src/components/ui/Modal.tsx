/*
  파일명: /components/ui/Modal.tsx
  기능: 모달 컴포넌트
  책임: Portal을 사용한 오버레이 모달 UI를 제공한다.
*/ // ------------------------------

"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import AnimatedHeight from "./AnimatedHeight";
import { Z_INDEX } from "@/constants/zIndex";
import { useClippedText } from "@/hooks/useClippedText";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scrollLock";

import ClassicalBox from "@/components/ui/ClassicalBox";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** 본문 스크롤 밖, 모달 아래에 고정할 조작 영역. */
  footer?: ReactNode;
  title?: string;
  /** 보이는 머리말 없이 여는 이미지 창 등의 접근성 이름 */
  ariaLabel?: string;
  titleClassName?: string;
  titleStyle?: CSSProperties;
  /** 제목 오른쪽에 붙는 보조 조작 — 인물 상세로 가는 화살표 같은 링크·버튼 */
  titleAction?: ReactNode;
  stickyHeader?: boolean;
  icon?: LucideIcon;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** size 대신 박스 너비 클래스를 직접 준다 (max-w-2xl, w-[min(90vw,340px)] 등). w-·size-를 주면 기본 w-full을 뺀다 */
  widthClassName?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  /** ESC로 닫기를 허용한다. 로딩 중이거나 위에 겹친 모달이 있을 때 false로 잠근다 */
  closeOnEscape?: boolean;
  /** ESC를 캡처 단계에서 잡아 같은 문서의 다른 리스너보다 먼저 처리한다 (전체화면 게임 위 모달) */
  escapeCapture?: boolean;
  animateHeight?: boolean;
  /** 높이 전환 시간(ms). 기본은 AnimatedHeight의 320 — 빠른 반응이 필요한 모달은 200 안팎으로 내린다 */
  animateHeightDuration?: number;
  /** 세로 상한. 기본은 상하 2rem씩 비워 화면을 꽉 채우지 않는다 */
  maxHeightClassName?: string;
  /** 스크롤 영역 아래에 글이 더 남았을 때 끝을 흐린다. 읽기용 모달에서 켠다 */
  fadeClippedEnd?: boolean;
  /** 커스텀 z-index (게임 전체화면 등 상위 모달 위에 표시할 때) */
  zIndex?: number;
  /** 기본 classical은 장식 상자(ClassicalBox). plain은 장식 없는 div라 boxClassName으로 겉을 직접 꾸민다 */
  frame?: "classical" | "plain";
  /** 박스에 덧붙이는 클래스 (배경·테두리·모서리·그림자) */
  boxClassName?: string;
  /** 콘텐츠 비율처럼 실행 중에 정해지는 박스 크기·CSS 변수 */
  boxStyle?: CSSProperties;
  /** 오버레이의 배경·흐림을 바꾼다. 기본 bg-black/60 backdrop-blur-md */
  overlayClassName?: string;
  /** 닫기 버튼의 클래스를 통째로 바꾼다 */
  closeButtonClassName?: string;
  /** 닫기 버튼을 잠근다 (로딩 중 닫기 금지 등) */
  closeButtonDisabled?: boolean;
}

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-4xl",
};

/** 긴 글을 읽는 모달의 세로 상한. 기본(상하 2rem)보다 넉넉한 여백을 남겨 바깥을 눌러 닫을 수 있게 한다 */
export const READING_MODAL_MAX_HEIGHT_CLASS = "max-h-[66dvh]";

// 닫기 단추는 누르는 칸 44px(아이콘 20px). 금 테두리 없이 바탕 위에 조용히 두고, hover에 면이 즉시 밝아진다
export const CLOSE_BUTTON_STYLE =
  "z-[70] flex size-11 items-center justify-center rounded-full bg-bg-card/70 text-text-secondary backdrop-blur-sm hover:bg-bg-stone-light hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70";
const DEFAULT_CLOSE_BUTTON = `absolute end-1.5 top-1.5 sm:end-3 sm:top-3 ${CLOSE_BUTTON_STYLE}`;
const HEADER_CLOSE_BUTTON = `absolute end-1.5 top-1/2 -translate-y-1/2 sm:end-3 ${CLOSE_BUTTON_STYLE}`;

export default function Modal({
  isOpen,
  onClose,
  children,
  footer,
  title,
  ariaLabel,
  titleClassName,
  titleStyle,
  titleAction,
  stickyHeader = false,
  icon: Icon,
  size = "md",
  widthClassName,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  escapeCapture = false,
  animateHeight = true,
  animateHeightDuration,
  maxHeightClassName = "max-h-[calc(100dvh-4rem)]",
  fadeClippedEnd = false,
  zIndex,
  frame = "classical",
  boxClassName,
  boxStyle,
  overlayClassName,
  closeButtonClassName,
  closeButtonDisabled = false,
}: ModalProps) {
  const t = useTranslations("shared.accessibility");
  const { ref: scrollRef, isClipped } = useClippedText<HTMLDivElement>(undefined, isOpen && fadeClippedEnd);
  const boxRef = useRef<HTMLDivElement>(null);

  // ESC·스크롤 잠금·포커스 트랩 — 열릴 때 박스로 포커스를 옮기고 닫히면 돌려준다
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockBodyScroll();
    const focusFrame = requestAnimationFrame(() => boxRef.current?.focus({ preventScroll: true }));

    const handleKeyDown = (e: KeyboardEvent) => {
      // 초상화 확대처럼 Portal로 위에 열린 창의 키 입력은 그 창에서 처리한다.
      const targetDialog = e.target instanceof Element ? e.target.closest('[role="dialog"]') : null;
      if (targetDialog && !boxRef.current?.contains(targetDialog)) return;
      if (e.key === "Escape") {
        if (!closeOnEscape) return;
        if (escapeCapture) e.stopImmediatePropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = boxRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === boxRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, escapeCapture);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown, escapeCapture);
      unlockBodyScroll();
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [isOpen, onClose, closeOnEscape, escapeCapture]);

  if (!isOpen) return null;

  const handleOverlayClick = () => {
    if (closeOnOverlayClick) onClose();
  };

  // widthClassName이 너비(w-·size-)를 직접 쥐면 w-full과 같은 속성을 두고 싸워 생성 순서로 진다 — 그 경우 w-full을 뺀다
  const hasOwnWidth = /(?:^|\s)(?:w-|size-)/.test(widthClassName ?? "");
  // classical 판의 모서리(16px)는 ClassicalBox가 쥔다
  const boxClass = `${hasOwnWidth ? "" : "w-full "}${widthClassName ?? SIZE_CLASSES[size]} ${maxHeightClassName} animate-modal-content outline-none ${frame === "classical" ? "" : "relative"} ${footer ? "flex flex-col overflow-hidden" : ""} ${boxClassName ?? ""}`;
  const closeInHeader = Boolean(title && stickyHeader && !closeButtonClassName);
  const closeButton = showCloseButton && (
    <button
      type="button"
      onClick={onClose}
      disabled={closeButtonDisabled}
      aria-label={t("close")}
      className={`${closeButtonClassName ?? (closeInHeader ? HEADER_CLOSE_BUTTON : DEFAULT_CLOSE_BUTTON)} disabled:cursor-wait disabled:opacity-40`}
    >
      <X size={20} />
    </button>
  );

  const inner = (
    <>
      {/* 고정 헤더가 없는 모달과 별도 배치 버튼은 스크롤 영역 밖에 둔다. */}
      {!closeInHeader && closeButton}

      {/* 스크롤 영역 */}
      <div
        ref={scrollRef}
        className={`overflow-y-auto max-h-[inherit] ${footer ? "min-h-0" : ""} ${frame === "classical" ? "rounded-[inherit]" : ""} ${fadeClippedEnd && isClipped ? "clip-fade-end" : ""}`}
      >
        {/* 헤더 - title이 있을 때만 렌더링 */}
        {title && (
          <div className={`flex min-h-14 items-center justify-center border-b border-line py-3 ${closeInHeader ? "px-14" : "px-4"} ${stickyHeader ? "sticky top-0 z-30 bg-bg-card/95 backdrop-blur-sm" : "relative"}`}>
            <div className="flex min-w-0 items-center gap-1.5 text-center">
              {Icon && <Icon size={16} className="text-accent" />}
              <h2 className={`text-base sm:text-lg ${titleClassName ?? "text-text-primary"}`} style={titleStyle}>{title}</h2>
              {titleAction}
            </div>
            {closeInHeader && closeButton}
          </div>
        )}

        {/* 본문 */}
        {animateHeight ? <AnimatedHeight independent duration={animateHeightDuration}>{children}</AnimatedHeight> : children}
      </div>
      {footer && <div className="shrink-0">{footer}</div>}
    </>
  );

  const modalContent = (
    <div
      className={`fixed inset-0 flex items-center justify-center px-4 py-8 animate-modal-overlay ${overlayClassName ?? "bg-black/70 backdrop-blur-sm"}`}
      style={{ zIndex: zIndex ?? Z_INDEX.modal }}
      onClick={handleOverlayClick}
    >
      {frame === "classical" ? (
        <ClassicalBox
          hover={false}
          className={boxClass}
          style={boxStyle}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel ?? title}
          ref={boxRef}
          tabIndex={-1}
        >
          {inner}
        </ClassicalBox>
      ) : (
        <div
          className={boxClass}
          style={boxStyle}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel ?? title}
          ref={boxRef}
          tabIndex={-1}
        >
          {inner}
        </div>
      )}
    </div>
  );

  // Portal로 body에 렌더링
  if (typeof window === "undefined") return null;
  return createPortal(modalContent, document.body);
}

// 모달 내부 섹션 컴포넌트
export function ModalBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

export function ModalFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex gap-3 p-4 border-t border-line ${className}`}>
      {children}
    </div>
  );
}
