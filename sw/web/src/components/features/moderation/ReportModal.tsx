/*
  파일명: /components/features/moderation/ReportModal.tsx
  기능: 신고 접수 대화 상자
  책임: 신고 사유와 상세 설명을 받아 접수하고 결과를 알린다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Flag, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { createReport } from "@/actions/moderation";
import {
  ENUM_REPORT_REASON,
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_DESCRIPTION_MIN_LENGTH_FOR_OTHER,
  REPORT_REASON_OPTIONS,
  type ReportReason,
  type ReportTargetType,
} from "@/constants/moderation";
import { reportErrorKey } from "./reportResultMessage";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetUserId?: string | null;
  /** 무엇을 신고하는지 보여줄 짧은 설명. 글 제목 등 */
  targetLabel?: string;
  /** 비로그인 여부. 로그인 안내로 갈음한다 */
  isGuest?: boolean;
}

type Phase = "form" | "done";

export default function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetUserId = null,
  targetLabel,
  isGuest = false,
}: ReportModalProps) {
  const t = useTranslations("moderation.report");
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [isFailure, setIsFailure] = useState(false);

  const needsDetail = reason === ENUM_REPORT_REASON.OTHER;
  const detailTooShort = needsDetail && detail.trim().length < REPORT_DESCRIPTION_MIN_LENGTH_FOR_OTHER;
  const canSubmit = reason !== null && !detailTooShort && !isSubmitting;

  const reset = () => {
    setReason(null);
    setDetail("");
    setPhase("form");
    setResultKey(null);
    setIsFailure(false);
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  const handleSubmit = async () => {
    if (reason === null) {
      setResultKey("reasonMissing");
      setIsFailure(true);
      return;
    }

    setIsSubmitting(true);
    setResultKey(null);

    const result = await createReport({ targetType, targetId, targetUserId, reason, description: detail });

    setIsSubmitting(false);

    if (!result.success) {
      setResultKey(reportErrorKey(result.error));
      setIsFailure(true);
      return;
    }

    setResultKey(result.data.alreadyReported ? "alreadyReported" : "success");
    setIsFailure(false);
    setPhase("done");
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t("title")} icon={Flag} size="md">
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

      {!isGuest && phase === "done" && (
        <>
          <ModalBody>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={18} className="mt-0.5 text-accent" />
              <p className="text-sm text-text-primary">{resultKey && t(`result.${resultKey}`)}</p>
            </div>
          </ModalBody>
          <ModalFooter className="justify-end">
            <Button variant="primary" onClick={handleClose}>
              {t("close")}
            </Button>
          </ModalFooter>
        </>
      )}

      {!isGuest && phase === "form" && (
        <>
          <ModalBody className="space-y-4">
            <p className="text-sm text-text-secondary">{t("guide")}</p>

            {targetLabel && (
              <div>
                <span className="text-sm text-accent">{t("targetLabel")}</span>
                <p className="mt-1 text-sm text-text-primary line-clamp-2">{targetLabel}</p>
              </div>
            )}

            <div>
              <span className="text-sm text-accent">{t("reasonLabel")}</span>
              <div className="mt-2 space-y-1">
                {REPORT_REASON_OPTIONS.map((option) => (
                  <Button
                    unstyled
                    key={option.value}
                    onClick={() => setReason(option.value)}
                    className={`w-full rounded-md border px-3 py-2 text-start ${
                      reason === option.value
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`block text-sm ${
                        reason === option.value ? "text-accent" : "text-text-primary"
                      }`}
                    >
                      {t(`reason.${option.messageKey}`)}
                    </span>
                    <span className="block text-sm text-text-secondary">
                      {t(`reasonHint.${option.messageKey}`)}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-sm text-accent">
                {needsDetail ? t("detailRequired") : t("detailOptional")}
              </span>
              <textarea
                value={detail}
                onChange={(event) => setDetail(event.target.value.slice(0, REPORT_DESCRIPTION_MAX_LENGTH))}
                placeholder={t("detailPlaceholder")}
                rows={4}
                className="mt-2 w-full resize-none rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
              />
              <p className="mt-1 text-end text-sm text-text-tertiary">
                {t("charCount", { count: detail.length, max: REPORT_DESCRIPTION_MAX_LENGTH })}
              </p>
            </div>

            {isFailure && resultKey && (
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="mt-0.5 text-status-paused" />
                <p className="text-sm text-status-paused">
                  {t(`result.${resultKey}`, { max: REPORT_DESCRIPTION_MAX_LENGTH })}
                </p>
              </div>
            )}
          </ModalBody>

          <ModalFooter className="justify-end">
            <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
              {t("cancel")}
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isSubmitting ? t("submitting") : t("submit")}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
