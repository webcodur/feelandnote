/*
  파일명: /components/shared/PortraitSharpenFilter.tsx
  기능: 인물 사진을 작게 줄여 보여줄 때 또렷함을 되살리는 SVG 필터 정의
  책임: 문서에 한 번만 삽입되어 id로 참조된다. 실제 적용은 각 컴포넌트가 filter로 건다.
*/ // ------------------------------

/**
 * 인물 사진 선명화 필터.
 *
 * 800px 사진을 카드에서 190px 안팎으로 줄여 쓰는데, 이 배율에서는 잔 디테일이 사라져
 * 뿌옇게 보인다. AI로 다시 그린 아바타는 원래 미세 질감이 균질해 더 심하게 뭉갠다
 * (2026-07-28 실측: 실사 394 대 재생성본 346, 화면 표시 크기 기준 고주파 에너지).
 *
 * 3x3 언샤프 커널로 가장자리만 살짝 세운다. 계수를 더 키우면 윤곽에 흰 테가 생기고
 * 원본 입자까지 함께 증폭돼 얼굴이 지글거려 보이므로(셀럽 카드 노이즈 체감),
 * 중앙 2.0 / 상하좌우 -0.25로 상한보다 한 단 낮춰 둔다. 합이 1이라 밝기는 그대로다.
 *
 * preserveAlpha가 필수다. 배경을 지운 아바타라 알파를 건드리면 테두리가 지저분해진다.
 */
export const PORTRAIT_SHARPEN_ID = "portrait-sharpen";

export default function PortraitSharpenFilter() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      <defs>
        <filter id={PORTRAIT_SHARPEN_ID} x="0" y="0" width="100%" height="100%">
          <feConvolveMatrix
            order="3"
            preserveAlpha="true"
            kernelMatrix="0 -0.25 0 -0.25 2.0 -0.25 0 -0.25 0"
          />
        </filter>
      </defs>
    </svg>
  );
}
