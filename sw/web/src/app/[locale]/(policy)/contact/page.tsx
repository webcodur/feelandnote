/*
  파일명: /app/(policy)/contact/page.tsx
  기능: 문의하기 페이지
  책임: 서비스 연락처 및 피드백 안내를 표시한다.
*/

import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getLocalizedAlternates } from "@/lib/seo";

export async function generateMetadata() {
  const t = await getTranslations("policy");
  return {
    title: t("contact"),
    description: t("contactDescription"),
    alternates: await getLocalizedAlternates("/contact"),
  };
}

export default async function ContactPage() {
  const t = await getTranslations("policy");

  return (
    <div className="space-y-10 text-text-primary">
      <header className="space-y-4 border-b border-border pb-6">
        <h1 className="text-3xl font-bold">{t("contactTitle")}</h1>
        <p className="text-text-secondary">{t("contactDescription")}</p>
      </header>

      {/* 이메일 문의 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("contactEmail")}</h2>
        <p className="text-text-secondary leading-relaxed">
          {t("contactEmailDesc")}
        </p>
        <div className="rounded-lg bg-bg-card/50 p-4 border border-border">
          <a
            href="mailto:feelandnote@gmail.com"
            className="text-accent-primary hover:underline font-medium"
          >
            feelandnote@gmail.com
          </a>
        </div>
      </section>

      {/* 피드백 게시판 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("contactFeedback")}</h2>
        <p className="text-text-secondary leading-relaxed">
          {t("contactFeedbackDesc")}
        </p>
        <Link
          href="/agora/board/feedback"
          className="inline-block rounded-lg bg-bg-card/50 px-4 py-3 border border-border text-accent-primary hover:underline font-medium"
        >
          {t("contactFeedbackLink")}
        </Link>
      </section>
    </div>
  );
}
