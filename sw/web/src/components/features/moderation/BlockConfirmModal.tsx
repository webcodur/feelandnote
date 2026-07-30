/*
  파일명: /components/features/moderation/BlockConfirmModal.tsx
  기능: 차단·차단 해제 확인 대화 상자
  책임: 차단 상태를 바꾸기 전에 확인을 받고 결과를 알린다.

  브라우저 기본 확인창(confirm)을 쓰지 않는다 — 화면 조작이 멈춰 이후 동작이 막힌다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserX, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { blockUser, unblockUser } from "@/actions/moderation";
import { blockErrorKey } from "./reportResultMessage";

interface BlockConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  nickname: string;
  /** 현재 차단 상태. true 면 해제 흐름으로 동작한다 */
  isBlocked?: boolean;
  onChanged?: (blocked: boolean) => void;
  isGuest?: boolean;
}

export default function BlockConfirmModal({
  isOpen,
  onClose,
  targetUserId,
  nickname,
  isBlocked = false,
  onChanged,
  isGuest = false,
}: BlockConfirmModalProps) {
  const t = useTranslations("moderation.block");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [isFailure, setIsFailure] = useState(false);

  const handleClose = () => {
    onClose();
    setResultKey(null);
    setIsFailure(false);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setResultKey(null);

    // 두 액션의 결과 모양이 달라 분기 안에서 각각 처리한다
    if (isBlocked) {
      const result = await unblockUser(targetUserId);
      setIsSubmitting(false);

      if (!result.success) {
        setResultKey(blockErrorKey(result.error));
        setIsFailure(true);
        return;
      }

      setIsFailure(false);
      setResultKey(result.data.wasBlocked ? "unblocked" : "notBlocked");
      onChanged?.(false);
      return;
    }

    const result = await blockUser(targetUserId);
    setIsSubmitting(false);

    if (!result.success) {
      setResultKey(blockErrorKey(result.error));
      setIsFailure(true);
      return;
    }

    setIsFailure(false);
    setResultKey(result.data.alreadyBlocked ? "alreadyBlocked" : "success");
    onChanged?.(true);
  };

  const isDone = resultKey !== null && !isFailure;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isBlocked ? t("unblockConfirmTitle", { nickname }) : t("confirmTitle", { nickname })}
      icon={UserX}
      size="sm"
    >
      {isGuest && (
        <>
          <ModalBody>
            <p className="text-sm text-text-secondary">{t("result.loginRequired")}</p>
          </ModalBody>
          <ModalFooter className="justify-end">
            <Button variant="ghost" onClick={handleClose}>
              {t("cancel")}
            </Button>
          </ModalFooter>
        </>
      )}

      {!isGuest && isDone && (
        <>
          <ModalBody>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={18} className="mt-0.5 text-accent" />
              <p className="text-sm text-text-primary">{t(`result.${resultKey}`, { nickname })}</p>
            </div>
          </ModalBody>
          <ModalFooter className="justify-end">
            <Button variant="primary" onClick={handleClose}>
              {t("cancel")}
            </Button>
          </ModalFooter>
        </>
      )}

      {!isGuest && !isDone && (
        <>
          <ModalBody className="space-y-3">
            <p className="text-sm text-text-secondary">
              {isBlocked ? t("unblockConfirmMessage") : t("confirmMessage")}
            </p>
            {!isBlocked && <p className="text-sm text-text-tertiary">{t("confirmNote")}</p>}

            {isFailure && resultKey && (
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="mt-0.5 text-status-paused" />
                <p className="text-sm text-status-paused">{t(`result.${resultKey}`, { nickname })}</p>
              </div>
            )}
          </ModalBody>

          <ModalFooter className="justify-end">
            <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
              {t("cancel")}
            </Button>
            <Button variant={isBlocked ? "primary" : "danger"} onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isSubmitting ? t("processing") : isBlocked ? t("unblockConfirm") : t("confirm")}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
