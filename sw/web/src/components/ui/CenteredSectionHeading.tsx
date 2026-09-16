/*
  파일명: /components/ui/CenteredSectionHeading.tsx
  기능: 본문 격자 뒤에 붙는 딸림 구획의 공통 머리
  책임: 금선 한 줄과 가운데 제목으로 구획을 연다. 인물 화면 아래의 「이어지는 인물」과
        「이 인물이 읽은 책」이 서로 다른 모양으로 서던 것을 한 부품으로 묶는다.
        제목은 h2로 남겨 크롤러가 구획을 읽고 aria-labelledby가 가리킬 수 있게 한다.
*/

import type { ReactNode } from "react";

interface CenteredSectionHeadingProps {
  /** aria-labelledby가 가리킬 id */
  id?: string;
  title: string;
  /** 제목 아래 한 줄. 없으면 그리지 않는다 */
  description?: string;
  className?: string;
  /** 제목 옆에 붙는 작은 조작(안내 아이콘 등). h2 안에서 제목과 한 덩어리로 가운데 정렬된다 */
  titleAddon?: ReactNode;
}

export default function CenteredSectionHeading({
  id,
  title,
  description,
  className = "",
  titleAddon,
}: CenteredSectionHeadingProps) {
  return (
    <div
      className={`flex flex-col items-center gap-2 text-center ${className}`}
    >
      <span
        aria-hidden
        className="h-[2px] w-8 rounded-full bg-accent shadow-[0_0_8px_rgba(212,175,55,0.3)]"
      />
      <h2
        id={id}
        className="font-serif text-base font-bold tracking-tight text-text-primary md:text-xl"
      >
        {title}
        {titleAddon}
      </h2>
      {description && (
        <p className="text-sm text-text-secondary">{description}</p>
      )}
    </div>
  );
}
