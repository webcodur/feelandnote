/*
  파일명: /app/(policy)/about/page.tsx
  기능: 서비스 소개 페이지
  책임: Feel&Note가 어떤 서비스인지, 콘텐츠를 어떻게 만드는지, 운영 주체와 연락 수단을 안내한다.
*/

import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getLocalizedAlternates } from "@/lib/seo";

export async function generateMetadata() {
  const t = await getTranslations("policy");
  return {
    title: t("about"),
    description: t("aboutDescription"),
    alternates: await getLocalizedAlternates("/about"),
  };
}

export default async function AboutPage() {
  const t = await getTranslations("policy");

  return (
    <div className="space-y-10 text-text-primary">
      <header className="space-y-4 border-b border-border pb-6">
        <h1 className="text-3xl font-bold">{t("aboutTitle")}</h1>
        <p className="text-text-secondary">{t("aboutDescription")}</p>
      </header>

      {/* 서비스 정의 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("aboutWhatTitle")}</h2>
        <p className="text-text-secondary leading-relaxed">
          {t("aboutWhatBody1")}
        </p>
        <p className="text-text-secondary leading-relaxed">
          {t("aboutWhatBody2")}
        </p>
      </section>

      {/* 콘텐츠 제작 방식 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("aboutContentTitle")}</h2>
        <p className="text-text-secondary leading-relaxed">
          {t("aboutContentBody")}
        </p>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed">
          <li>{t("aboutContentItem1")}</li>
          <li>{t("aboutContentItem2")}</li>
          <li>{t("aboutContentItem3")}</li>
        </ul>
      </section>

      {/* 운영 안내 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("aboutOperatorTitle")}</h2>
        <p className="text-text-secondary leading-relaxed">
          {t("aboutOperatorBody")}
        </p>
        <div className="rounded-lg bg-bg-card/50 p-4 border border-border">
          <a
            href="mailto:feelandnote@gmail.com"
            className="text-accent-primary hover:underline font-medium"
          >
            feelandnote@gmail.com
          </a>
        </div>
        <Link
          href="/contact"
          className="inline-block rounded-lg bg-bg-card/50 px-4 py-3 border border-border text-accent-primary hover:underline font-medium"
        >
          {t("aboutOperatorContactLink")}
        </Link>
      </section>

      {/* 관련 활동 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("aboutActivityTitle")}</h2>
        <p className="text-text-secondary leading-relaxed">
          {t("aboutActivityBody")}
        </p>
        <Link
          href="/explore/youtube"
          className="inline-block rounded-lg bg-bg-card/50 px-4 py-3 border border-border text-accent-primary hover:underline font-medium"
        >
          {t("aboutActivityLink")}
        </Link>
      </section>
    </div>
  );
}
