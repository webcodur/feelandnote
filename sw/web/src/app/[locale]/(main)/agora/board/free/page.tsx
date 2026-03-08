/*
  파일명: /app/(main)/board/free/page.tsx
  기능: 자유게시판 페이지
  책임: 자유게시판 UI를 표시한다.
*/ // ------------------------------

import { MessageSquare } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("agora");
  return { title: t("freeBoard") };
}

export default async function Page() {
  const t = await getTranslations("agora");
  return (
    <>
      <div className="bg-surface rounded-2xl p-12 text-center">
        <div className="text-text-tertiary mb-2 flex justify-center">
          <MessageSquare size={48} />
        </div>
        <p className="text-lg font-medium text-text-secondary">{t("freeBoardComingSoon")}</p>
        <p className="text-sm text-text-tertiary mt-1">{t("freeBoardComingSoonDesc")}</p>
      </div>
    </>
  );
}
