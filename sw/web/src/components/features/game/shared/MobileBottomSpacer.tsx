/*
  파일명: components/features/game/shared/MobileBottomSpacer.tsx
  기능: 모바일 게임 하단 빈 여백
  책임: 모바일에서 하단 UI(오디오 플레이어 등)에 콘텐츠가 가려지지 않도록 투명 여백을 제공한다.
*/

export default function MobileBottomSpacer() {
  return <div className="h-24 shrink-0 lg:hidden" aria-hidden="true" />;
}
