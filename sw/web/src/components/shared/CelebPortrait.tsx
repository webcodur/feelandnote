"use client";

import { useCallback, useState } from "react";
import CelebProfileMedia, { type CelebProfileMediaProps } from "./CelebProfileMedia";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import { Z_INDEX } from "@/constants/zIndex";

interface Props extends Omit<CelebProfileMediaProps, "onZoom"> {
  /** 작은 아바타 대신 대표 사진을 확대해야 할 때 지정한다. */
  zoomSrc?: string | null;
  zoomCaption?: string | null;
  /** 이 초상화를 담고 있는 모달의 레이어. */
  zIndex?: number;
}

/** 인물 모달·상세 페이지·세력·신화 도감의 초상화와 확대 동작을 함께 관리한다. */
export default function CelebPortrait({ zoomSrc, zoomCaption, zIndex, ...media }: Props) {
  const src = zoomSrc === undefined ? media.photoUrl ?? media.avatarUrl : zoomSrc;
  const [openedSrc, setOpenedSrc] = useState<string | null>(null);
  const open = useCallback(() => { if (src) setOpenedSrc(src); }, [src]);
  const close = useCallback(() => setOpenedSrc(null), []);

  return (
    <>
      <CelebProfileMedia {...media} onZoom={open} />
      {src && (
        <ImageViewerModal
          src={src}
          alt={media.nickname}
          caption={zoomCaption}
          isOpen={openedSrc === src}
          onClose={close}
          zIndex={Math.max(Z_INDEX.top, (zIndex ?? Z_INDEX.modal) + 1)}
          showImageShadow={false}
          closeOnImageClick
        />
      )}
    </>
  );
}
