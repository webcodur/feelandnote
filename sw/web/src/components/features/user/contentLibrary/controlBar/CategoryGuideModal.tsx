/*
  파일명: /components/features/user/contentLibrary/controlBar/CategoryGuideModal.tsx
  기능: 대분류 안내 모달
  책임: 콘텐츠 대분류(매체 유형) 시스템을 설명한다.
*/ // ------------------------------
import { Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import Modal, { ModalBody } from "@/components/ui/Modal";

interface CategoryGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CategoryGuideModal({ isOpen, onClose }: CategoryGuideModalProps) {
  const t = useTranslations("archiveSearch.categoryGuide");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("title")} icon={Layers} size="sm" closeOnOverlayClick>
      <ModalBody>
        <div className="flex flex-col gap-4 text-sm text-text-secondary leading-relaxed">
          <p>{t("basis")}</p>
          <p>{t("available")}</p>
          <p className="text-xs">
            {t("suggestion")}
          </p>
        </div>
      </ModalBody>
    </Modal>
  );
}
