/*
  파일명: /app/(main)/explore/layout.tsx
  기능: 탐색 레이아웃
  책임: 공통 배너(breadcrumb 포함)와 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PageContainer from "@/components/layout/PageContainer";
import HubBackLink from "@/components/shared/HubBackLink";
import ExploreBanner from "@/components/features/user/explore/hub/ExploreBanner";
import MessageScope from "@/components/shared/MessageScope";

interface Props {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

async function ExploreLayoutBody({ children, params }: Props) {
  // 정적(ISR) 하위 화면(명부·연표)이 요청 헤더에 기대지 않게 locale을 params로 못 박는다
  const { locale } = await params;
  setRequestLocale(locale);
  const tNav = await getTranslations("nav");

  return (
    <>
      <ExploreBanner />
      <PageContainer>
        {/* 하위 화면에서 탐색으로 돌아가는 길. 자체 뒤로가기를 가진 화면에서는 알아서 숨는다 */}
        <HubBackLink hubPath="/explore" label={tNav("explore")} />
        {children}
      </PageContainer>
    </>
  );
}

// 이 묶음은 화면마다 쓰는 문구 폭이 넓어 공통 뼈대에 남은 문구를 통째로 덧댄다.
export default function ExploreLayout(props: Props) {
  return (
    <MessageScope>
      <ExploreLayoutBody {...props} />
    </MessageScope>
  );
}
