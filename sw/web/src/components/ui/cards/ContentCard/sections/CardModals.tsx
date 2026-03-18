"use client";

import { Bookmark, Check, X } from "lucide-react";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { RecommendationModal } from "@/components/features/recommendations";
import ContentReviewModal from "@/components/features/game/shared/ContentReviewModal";
import { addContent } from "@/actions/contents/addContent";

import TypeInfoModal from "../modals/TypeInfoModal";
import ContentStatsModal from "../modals/ContentStatsModal";
import type { ContentCardProps } from "../types";
import type { ContentCardState } from "../useContentCardState";

interface CardModalsProps {
  props: ContentCardProps;
  state: ContentCardState;
}

export default function CardModals({ props, state }: CardModalsProps) {
  const {
    title,
    thumbnail,
    contentId,
    onAdd,
    onSavedStatusChange,
    onSavedRemove,
    modalZIndex,
    reviewPresets,
  } = props;

  const {
    contentType,
    isSpoiler,
    isTypeInfoOpen,
    setIsTypeInfoOpen,
    showStatsModal,
    setShowStatsModal,
    effectiveCelebCount,
    internalSaved,
    internalUserContentId,
    isRecommendModalOpen,
    setIsRecommendModalOpen,
    showAddConfirm,
    setShowAddConfirm,
    showSavedAction,
    setShowSavedAction,
    showModal,
    setShowModal,
    displayTitle,
    displayCreator,
    displayReview,
    contentDetailUrl,
    setInternalSaved,
    setInternalUserContentId,
  } = state;

  const sourceUrl = props.sourceUrl;
  const ownerNickname = props.ownerNickname;
  const creator = props.creator;

  return (
    <>
      <TypeInfoModal
        isOpen={isTypeInfoOpen}
        onClose={() => setIsTypeInfoOpen(false)}
        currentType={contentType}
      />
      <ContentStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        contentId={contentId || ""}
        contentTitle={title}
        contentThumbnail={thumbnail}
        celebCount={effectiveCelebCount ?? 0}
      />
      {internalSaved && internalUserContentId && (
        <RecommendationModal
          isOpen={isRecommendModalOpen}
          onClose={() => setIsRecommendModalOpen(false)}
          userContentId={internalUserContentId}
          contentTitle={title}
          contentThumbnail={thumbnail ?? null}
          contentType={contentType}
        />
      )}
      <Modal isOpen={showAddConfirm} onClose={() => setShowAddConfirm(false)} title="서재에 담기" icon={Bookmark} size="sm" closeOnOverlayClick zIndex={modalZIndex}>
        <ModalBody>
          <p className="text-text-secondary">
            <span className="text-text-primary font-semibold">{title}</span>
            을(를) 서재에 담으시겠습니까?
          </p>
        </ModalBody>
        <ModalFooter className="justify-end">
          <Button variant="ghost" size="md" onClick={() => setShowAddConfirm(false)}>취소</Button>
          <Button variant="primary" size="md" onClick={async (e) => {
            setShowAddConfirm(false);
            if (onAdd) {
              onAdd(e as React.MouseEvent);
            } else {
              // 내부에서 직접 추가
              if (!contentId) {
                console.error('[ContentCard] contentId 없음');
                return;
              }

              try {
                const result = await addContent({
                  id: contentId,
                  type: contentType,
                  title,
                  creator: creator ?? undefined,
                  thumbnailUrl: thumbnail ?? undefined,
                  status: "WANT",
                });

                console.log('[ContentCard] addContent 결과:', result);

                if (result.success && result.data) {
                  setInternalSaved(true);
                  setInternalUserContentId(result.data.userContentId);
                  console.log('[ContentCard] 서재 추가 완료:', result.data.userContentId);
                } else {
                  console.error('[ContentCard] addContent 실패:', result);
                }
              } catch (error) {
                console.error('[ContentCard] addContent 에러:', error);
              }
            }
          }}>등록</Button>
        </ModalFooter>
      </Modal>
      <Modal isOpen={showSavedAction} onClose={() => setShowSavedAction(false)} title="서재 관리" icon={Bookmark} size="sm" closeOnOverlayClick zIndex={modalZIndex}>
        <ModalBody>
          <p className="text-sm text-text-secondary mb-4">
            <span className="text-text-primary font-semibold">{title}</span>
          </p>
          <div className="flex flex-col gap-2">
            {onSavedStatusChange && (
              <Button
                variant="secondary"
                size="md"
                className="w-full justify-start gap-2"
                onClick={() => { setShowSavedAction(false); onSavedStatusChange("FINISHED"); }}
              >
                <Check size={16} className="text-green-400" />
                감상완료로 변경
              </Button>
            )}
            {onSavedRemove && (
              <Button
                variant="secondary"
                size="md"
                className="w-full justify-start gap-2 text-red-400 hover:text-red-300"
                onClick={() => { setShowSavedAction(false); onSavedRemove(); }}
              >
                <X size={16} />
                기록 삭제
              </Button>
            )}
          </div>
        </ModalBody>
      </Modal>
      <ContentReviewModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={displayTitle}
        creator={displayCreator}
        review={displayReview}
        reviewPresets={reviewPresets}
        isSpoiler={isSpoiler}
        sourceUrl={sourceUrl}
        ownerNickname={ownerNickname}
        contentDetailUrl={contentDetailUrl}
        zIndex={modalZIndex}
      />
    </>
  );
}
