"use client";

import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
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
    <Modal isOpen={isOpen} onClose={onClose} size={size} closeOnOverlayClick>
      <ModalBody>
        {/* 헤더 영역 */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
            <Icon size={28} className="text-accent" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
          <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
        </div>

        {/* 본문 영역 (옵션) */}
        {children && <div className="mb-4">{children}</div>}
      </ModalBody>

      {/* 액션 버튼 영역 */}
      {actions.length > 0 && (
        <ModalFooter className="flex-col gap-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              unstyled
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-sm ${BUTTON_STYLES[action.variant || "primary"]} ${
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
