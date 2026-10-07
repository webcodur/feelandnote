"use client";

import { useTranslations } from "next-intl";
import { SourceList, type SourceListProps } from "@feelandnote/shared/ui/source-link";
import Modal, { ModalBody } from "./Modal";

export default function SourceLinksModal({ sources, layer, onClose }: SourceListProps) {
  const t = useTranslations("shared.sources");
  return (
    <Modal isOpen onClose={onClose} title={t("title")} size="lg" zIndex={layer} escapeCapture>
      <ModalBody className="p-4 sm:p-6">
        <SourceList sources={sources} />
      </ModalBody>
    </Modal>
  );
}
