/*
  파일명: components/features/game/hegemony/screenTypes.ts
  기능: 단계 화면 공통 속성
  책임: 효과음·대사·인물 상세·연출 속도처럼 모든 단계 화면이 받는 속성의 모양을 정한다.
*/

import type { SfxName } from "./hooks/useHegemonyAudio";
import type { SayLine } from "./hooks/useHegemonyDialogue";

export interface ScreenCommon {
  sfx: (name: SfxName) => void;
  say: SayLine;
  /** 떠 있는 대사를 바로 거둔다 */
  hush: () => void;
  onInspect: (cardId: string) => void;
  /** 연출 시간 배율 (빠르게 = 0.5) */
  speed: number;
}
