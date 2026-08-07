/*
  파일명: /hooks/useCelebAvatarSrc.ts
  기능: 인물 얼굴 주소 고르기
  책임: 얼굴이 작게 나오는 자리는 800px 원본 대신 96px 작은 판을 받게 한다.
        작은 판이 아직 없는 인물은 그 사진만 원본으로 되돌린다.
*/ // ------------------------------

"use client";

import { useCallback, useState } from "react";
import { celebAvatarSmallUrl, usesSmallAvatar } from "@feelandnote/shared/constants/celeb-avatar-small";

/**
 * @param src   원본 얼굴 주소
 * @param sizes 화면에 나오는 크기. `"40px"`처럼 고정 한 값일 때만 작은 판 대상으로 본다
 */
export function useCelebAvatarSrc(src: string | null | undefined, sizes: string | null | undefined) {
  const [fellBack, setFellBack] = useState(false);
  const onError = useCallback(() => setFellBack(true), []);

  const shown = !fellBack && usesSmallAvatar(sizes) ? celebAvatarSmallUrl(src) : src;
  return { src: shown ?? src ?? null, onError };
}
