/*
  파일명: /components/features/explore/modals/AlgorithmInfoModal.tsx
  기능: 추천 알고리즘 안내 모달
  책임: 유사 유저 추천 알고리즘 설명 표시
*/ // ------------------------------
"use client";

import { Star, Info } from "lucide-react";
import Button from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter } from "@/components/ui";

interface AlgorithmInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AlgorithmInfoModal({ isOpen, onClose }: AlgorithmInfoModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="추천 알고리즘 안내" size="md">
      <ModalBody className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <Star size={16} className="text-yellow-500" />
            </div>
            <div>
              <h3 className="font-medium text-text-primary text-sm">공통 콘텐츠 기반 매칭</h3>
              <p className="text-xs text-text-secondary mt-1">나와 같은 콘텐츠를 기록한 유저를 찾아 추천해요</p>
            </div>
          </div>

          <div className="bg-background rounded-lg p-4">
            <h4 className="text-xs font-medium text-text-secondary mb-3">이렇게 계산해요</h4>
            <div className="space-y-2 text-xs text-text-tertiary">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold">1</span>
                <span>나와 상대방이 공통으로 기록한 콘텐츠 수를 파악</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold">2</span>
                <span>각자의 전체 콘텐츠 수로 정규화하여 공정하게 비교</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold">3</span>
                <span>유사도가 높은 순으로 추천</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-text-tertiary bg-background/50 rounded-lg p-3">
            <p className="flex items-start gap-2">
              <Info size={12} className="flex-shrink-0 mt-0.5" />
              <span>콘텐츠를 많이 기록할수록 취향이 맞는 유저를 더 정확하게 찾아드릴 수 있어요</span>
            </p>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button unstyled onClick={onClose} className="flex-1 px-4 py-2.5 bg-accent text-white rounded-lg hover:bg-accent/90 font-medium">확인</Button>
      </ModalFooter>
    </Modal>
  );
}
