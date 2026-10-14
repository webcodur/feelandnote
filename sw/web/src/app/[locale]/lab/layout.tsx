/*
  파일명: /app/lab/layout.tsx
  기능: Lab 레이아웃
  책임: Lab 공통 헤더와 탭 네비게이션, 레이아웃을 제공하고, 운영에서는 이 길을 통째로 닫는다.
*/ // ------------------------------

import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { isDeveloperMode } from "@/lib/developer-mode";
import LabLayoutFrame from "@/components/lab/LabLayoutFrame";
import MessageScope from "@/components/shared/MessageScope";

interface Props {
  children: ReactNode;
}

export const metadata = { title: "Lab" };

// 이 묶음은 화면마다 쓰는 문구 폭이 넓어 공통 뼈대에 남은 문구를 통째로 덧댄다.
export default function LabLayout(props: Props) {
  // Lab은 만들다 만 화면과 실험 데이터가 그대로 놓인 작업실이다. 운영에서는 없는 길이 된다.
  if (!isDeveloperMode()) notFound();

  return (
    <MessageScope>
      <LabLayoutFrame {...props} />
    </MessageScope>
  );
}
