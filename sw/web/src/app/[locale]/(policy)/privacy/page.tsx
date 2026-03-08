/*
  파일명: /app/(policy)/privacy/page.tsx
  기능: 개인정보처리방침 페이지
  책임: Feel&Note 개인정보 수집 및 이용 내역을 표시한다.
*/

import { getTranslations, getLocale } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("policy");
  return { title: t("privacy"), robots: { index: false, follow: false } };
}

export default async function PrivacyPage() {
  const t = await getTranslations("policy");
  const locale = await getLocale();

  const bold = (chunks: React.ReactNode) => <strong>{chunks}</strong>;

  return (
    <div className="space-y-10 text-text-primary">
      <header className="space-y-4 border-b border-border pb-6">
        <h1 className="text-3xl font-bold">{t("privacyTitle")}</h1>
        <p className="text-text-secondary">
          {t("privacyDescription")}
        </p>
        {locale === "en" && (
          <p className="text-sm text-amber-400/80 bg-amber-400/5 border border-amber-400/20 rounded-lg px-4 py-2">
            {t("koreanOnly")}
          </p>
        )}
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("privacy1Title")}</h2>
        <p className="text-text-secondary leading-relaxed">
          {t("privacy1Body")}
        </p>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed">
          <li>{t.rich("privacy1Item1", { b: bold })}</li>
          <li>{t.rich("privacy1Item2", { b: bold })}</li>
          <li>{t.rich("privacy1Item3", { b: bold })}</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("privacy2Title")}</h2>
        <p className="text-text-secondary leading-relaxed">
          {t("privacy2Body")}
        </p>
        <div className="rounded-lg bg-bg-card/50 p-4 border border-border">
          <ul className="list-disc pl-5 space-y-2 text-text-secondary">
            <li>{t.rich("privacy2Item1", { b: bold })}</li>
            <li>{t.rich("privacy2Item2", { b: bold })}</li>
            <li>{t.rich("privacy2Item3", { b: bold })}</li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("privacy3Title")}</h2>
        <p className="text-text-secondary leading-relaxed">
          {t("privacy3Body")}
        </p>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed">
          <li>{t.rich("privacy3Item1", { b: bold })}</li>
          <li>{t.rich("privacy3Item2", { b: bold })}</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("privacy4Title")}</h2>
        <p className="text-text-secondary leading-relaxed">
          {t("privacy4Body")}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("privacy5Title")}</h2>
        <p className="text-text-secondary leading-relaxed">
          {t("privacy5Body")}
        </p>
      </section>

      <footer className="pt-8 border-t border-border">
        <p className="text-sm text-text-secondary">
          {t("privacyAnnouncementDate")}<br/>
          {t("privacyEffectiveDate")}
        </p>
      </footer>
    </div>
  );
}
