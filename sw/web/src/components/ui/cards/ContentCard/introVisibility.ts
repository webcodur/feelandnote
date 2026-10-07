interface IntroVisibility {
  showIntro?: boolean;
  clickModalHasIntroduction?: boolean;
  href?: string;
  onClick?: () => void;
  selectable?: boolean;
  opensReview?: boolean;
}

/** 클릭 목적지만으로 소개를 숨기지 않는다. 같은 소개를 읽는 중간 모달이 명시된 경우에만 생략한다. */
export function shouldShowContentIntro({ showIntro, clickModalHasIntroduction, href, onClick, selectable, opensReview }: IntroVisibility): boolean {
  return showIntro ?? !(clickModalHasIntroduction && onClick && !href && !selectable && !opensReview);
}
