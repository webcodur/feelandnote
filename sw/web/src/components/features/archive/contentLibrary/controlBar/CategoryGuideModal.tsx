/*
  파일명: /components/features/archive/contentLibrary/controlBar/CategoryGuideModal.tsx
  기능: 대분류 안내 모달
  책임: 콘텐츠 대분류(매체 유형) 시스템을 설명한다.
*/ // ------------------------------
import { Layers } from "lucide-react";
import Modal, { ModalBody } from "@/components/ui/Modal";

interface CategoryGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CategoryGuideModal({ isOpen, onClose }: CategoryGuideModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="대분류 안내" icon={Layers} size="sm" closeOnOverlayClick>
      <ModalBody>
        <div className="flex flex-col gap-4 text-sm text-text-secondary leading-relaxed">
          <p>
            대분류는 콘텐츠의 <span className="text-text-primary font-medium">매체 유형</span>을 기준으로 구분됩니다.
          </p>
          <p>
            현재 도서, 영상, 게임, 음악, 자격증 총 5개의 대분류가 제공되고 있으며, 사용자분들의 건의에 따라 새로운
            카테고리가 추가될 수 있습니다. (외부 API가 확인되는 경우 추가 가능)
          </p>
          <p className="text-text-tertiary text-xs">
            카테고리 추가 건의는 자유게시판에서 건의사항 태그를 붙여주시면 전달됩니다.
          </p>
        </div>
      </ModalBody>
    </Modal>
  );
}
