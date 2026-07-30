/*
  파일명: /app/(policy)/terms/page.tsx
  기능: 이용약관 페이지
  책임: Feel&Note 서비스 이용약관을 표시한다.
*/

import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";

export async function generateMetadata() {
  const t = await getTranslations("policy");
  return {
    title: t("terms"),
    description: t("termsDescription"),
    alternates: await getLocalizedAlternates("/terms"),
  };
}

export default async function TermsPage() {
  const t = await getTranslations("policy");

  return (
    <div className="space-y-10 text-text-primary">
      <header className="space-y-4 border-b border-border pb-6">
        <h1 className="text-3xl font-bold">{t("termsTitle")}</h1>
        <p className="text-text-secondary">
          {t("termsDescription")}
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("terms1Title")}</h2>
        <p className="text-text-secondary leading-relaxed">
          {t("terms1Body")}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("terms2Title")}</h2>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed">
          <li>{t("terms2Item1")}</li>
          <li>{t("terms2Item2")}</li>
          <li>{t("terms2Item3")}</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("terms3Title")}</h2>
        <p className="text-text-secondary leading-relaxed whitespace-pre-line">
          {t("terms3Body")}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("terms4Title")}</h2>
        <p className="text-text-secondary leading-relaxed">
          {t("terms4Intro")}
        </p>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed">
          <li>{t("terms4Item1")}</li>
          <li>{t("terms4Item2")}</li>
          <li>{t("terms4Item3")}</li>
          <li>{t("terms4Item4")}</li>
          <li>{t("terms4Item5")}</li>
          <li>{t("terms4Item6")}</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("terms5Title")}</h2>
        <p className="text-text-secondary leading-relaxed whitespace-pre-line">
          {t("terms5Body")}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("terms6Title")}</h2>
        <p className="text-text-secondary leading-relaxed">
          {t("terms6Body")}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("terms7Title")}</h2>
        <p className="text-text-secondary leading-relaxed">
          {t("terms7Intro")}
        </p>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed">
          <li>{t("terms7Item1")}</li>
          <li>{t("terms7Item2")}</li>
          <li>{t("terms7Item3")}</li>
          <li>{t("terms7Item4")}</li>
          <li>{t("terms7Item5")}</li>
          <li>{t("terms7Item6")}</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("terms8Title")}</h2>
        <p className="text-text-secondary leading-relaxed whitespace-pre-line">
          {t("terms8Body")}
        </p>
      </section>

      <footer className="pt-8 border-t border-border">
        <p className="text-sm text-text-secondary">
          {t("termsAddendum")}<br/>
          {t("termsEffectiveDate")}
        </p>
      </footer>
    </div>
  );
}
