/*
  파일명: /components/ui/icons/WikiMark.tsx
  기능: 위키 표식
  책임: 바깥으로 나가는 링크가 어디로 가는지 한 글자로 알린다. 일반 외부 링크
        화살표(↗)는 "밖으로 나간다"만 말하고 목적지를 말해 주지 않는다.
        위키데이터 공식 로고(3색 막대)도 써 봤지만 작게 줄이면 무슨 표인지 읽히지
        않아, 위키 계열에서 가장 널리 통하는 세리프 W로 돌아왔다.
*/ // ------------------------------

import { cn } from "@/lib/utils";

interface Props {
  /** 글자 크기(px) */
  size?: number;
  className?: string;
}

export default function WikiMark({ size = 15, className }: Props) {
  return (
    <span
      aria-hidden
      className={cn("font-serif font-bold leading-none", className)}
      style={{ fontSize: size }}
    >
      W
    </span>
  );
}
