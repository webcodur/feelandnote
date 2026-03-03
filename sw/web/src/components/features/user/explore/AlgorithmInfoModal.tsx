/*
  파일명: /components/features/explore/modals/AlgorithmInfoModal.tsx
  기능: 추천 알고리즘 안내 모달
  책임: 유사 유저 추천 알고리즘 설명 표시
*/ // ------------------------------
"use client";

import { Star, Info } from "lucide-react";
import Button from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter } from "@/components/ui";
import { useTranslations } from "next-intl";

interface AlgorithmInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AlgorithmInfoModal({ isOpen, onClose }: AlgorithmInfoModalProps) {
  const t = useTranslations("explore.ui");
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("algorithmTitle")} size="md">
      <ModalBody className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <Star size={16} className="text-yellow-500" />
            </div>
            <div>
              <h3 className="font-medium text-text-primary text-sm">{t("contentMatchTitle")}</h3>
              <p className="text-xs text-text-secondary mt-1">{t("contentMatchDesc")}</p>
            </div>
          </div>

          <div className="bg-background rounded-lg p-4">
            <h4 className="text-xs font-medium text-text-secondary mb-3">{t("howItWorks")}</h4>
            <div className="space-y-2 text-xs text-text-tertiary">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold">1</span>
                <span>{t("step1")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold">2</span>
                <span>{t("step2")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold">3</span>
                <span>{t("step3")}</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-text-tertiary bg-background/50 rounded-lg p-3">
            <p className="flex items-start gap-2">
              <Info size={12} className="flex-shrink-0 mt-0.5" />
              <span>{t("moreRecordsBetter")}</span>
            </p>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button unstyled onClick={onClose} className="flex-1 px-4 py-2.5 bg-accent text-white rounded-lg hover:bg-accent/90 font-medium">{t("confirm")}</Button>
      </ModalFooter>
    </Modal>
  );
}
