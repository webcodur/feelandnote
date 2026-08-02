/*
  파일명: /app/(main)/library/layout.tsx
  기능: 서가 레이아웃
  책임: 공통 배너(breadcrumb 포함)와 레이아웃을 제공한다.
*/ // ------------------------------

import { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import PageContainer from "@/components/layout/PageContainer";
import HubBackLink from "@/components/shared/HubBackLink";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import LibraryBanner from "@/components/features/library/hub/LibraryBanner";
import { LibraryCrumbProvider } from "@/components/features/library/hub/LibraryCrumbs";

interface Props {
  children: ReactNode;
}

export default async function LibraryLayout({ children }: Props) {
  const tNav = await getTranslations("nav");

  return (
    // 비동기 서버 레이아웃이 클라이언트 컴포넌트(배너)를 그리므로 intl 컨텍스트를 재공급한다(code-rules.md)
    <AsyncIntlProvider>
      {/* 기관·목록처럼 이름이 자료에 있는 화면이 배너에 자기 이름을 알릴 수 있게 감싼다 */}
      <LibraryCrumbProvider>
        <LibraryBanner />
        <PageContainer>
          {/* 하위 화면에서 서가로 돌아가는 길. 자체 뒤로가기를 가진 화면에서는 알아서 숨는다 */}
          <HubBackLink hubPath="/library" label={tNav("library")} />
          {children}
        </PageContainer>
      </LibraryCrumbProvider>
    </AsyncIntlProvider>
  );
}
