/*
  파일명: /components/features/archive/modals/ActionModal.tsx
  기능: 액션 모달 기본 컴포넌트
  책임: 아이콘, 제목, 설명, 액션 버튼을 포함한 재사용 가능한 모달을 제공한다.
*/ // ------------------------------
"use client";

import { type ReactNode } from "react";
import { Info, type LucideIcon } from "lucide-react";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

// #region 타입
interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
  actions?: ActionButton[];
  size?: "sm" | "md" | "lg";
}

interface ActionButton {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
}
// #endregion

// #region 버튼 스타일
const BUTTON_STYLES = {
  primary: "bg-accent hover:bg-accent-hover text-white",
  secondary: "bg-white/5 hover:bg-white/10 text-text-primary border border-border",
  danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20",
};
// #endregion

export default function ActionModal({
  isOpen,
  onClose,
  icon: Icon,
  title,
  description,
  children,
  actions = [],
  size = "sm",
}: ActionModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} icon={Icon} size={size} closeOnOverlayClick>
      <ModalBody>
        {/* 설명 */}
        <div className="p-3 bg-accent/5 border border-accent/10 rounded-xl mb-4">
          <div className="flex gap-2.5">
            <Info size={16} className="text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary leading-relaxed">{description}</p>
          </div>
        </div>

        {/* 본문 영역 */}
        {children}
      </ModalBody>

      {/* 액션 버튼 영역 */}
      {actions.length > 0 && (
        <ModalFooter>
          {actions.map((action, index) => (
            <Button
              key={index}
              unstyled
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm ${BUTTON_STYLES[action.variant || "primary"]} ${
                action.disabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {action.loading ? "처리 중..." : action.label}
            </Button>
          ))}
        </ModalFooter>
      )}
    </Modal>
  );
}
