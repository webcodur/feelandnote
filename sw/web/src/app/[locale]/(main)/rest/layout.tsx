/*
  파일명: /app/(main)/rest/layout.tsx
  기능: 쉼터 레이아웃
  책임: 쉼터 공통 탭 네비게이션과 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import PageContainer from "@/components/layout/PageContainer";
import HubBackLink from "@/components/shared/HubBackLink";
import HexagonBanner from "@/components/lab/HexagonBanner";
import PageBanner from "@/components/shared/PageBanner";
import { BANNER_TITLE_CLASS } from "@/components/shared/bannerStyles";
import { getTranslations } from "next-intl/server";
import MessageScope from "@/components/shared/MessageScope";

interface Props {
  children: ReactNode;
}

async function RestLayoutBody({ children }: Props) {
  const tNav = await getTranslations("nav");
  const title = tNav("rest");

  return (
    <>
      <PageBanner title={title}>
        <HexagonBanner compact>
          <h1 className={BANNER_TITLE_CLASS}>{title}</h1>
        </HexagonBanner>
      </PageBanner>
      <PageContainer>
        <HubBackLink hubPath="/rest" label={title} />
        {children}
      </PageContainer>
    </>
  );
}

// 이 묶음은 화면마다 쓰는 문구 폭이 넓어 공통 뼈대에 남은 문구를 통째로 덧댄다.
export default function RestLayout(props: Props) {
  return (
    <MessageScope>
      <RestLayoutBody {...props} />
    </MessageScope>
  );
}
