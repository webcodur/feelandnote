/*
  파일명: /app/(policy)/account-deletion/page.tsx
  기능: 계정 삭제 안내 페이지
  책임: 로그인 여부와 무관하게 계정 삭제 방법·삭제 범위·처리 절차를 안내한다.
*/

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getLocalizedAlternates } from "@/lib/seo";

const OPERATOR_EMAIL = "feelandnote@gmail.com";

export async function generateMetadata() {
  const t = await getTranslations("policy");
  return {
    title: t("accountDeletionTitle"),
    description: t("accountDeletionDescription"),
    alternates: await getLocalizedAlternates("/account-deletion"),
  };
}

export default async function AccountDeletionPage() {
  const t = await getTranslations("policy");

  const directSteps = [
    t("accountDeletion1Step1"),
    t("accountDeletion1Step2"),
    t("accountDeletion1Step3"),
    t("accountDeletion1Step4"),
  ];

  const requestItems = [
    t("accountDeletion2Item1"),
    t("accountDeletion2Item2"),
    t("accountDeletion2Item3"),
    t("accountDeletion2Item4"),
  ];

  const deletedItems = [
    t("accountDeletion3Item1"),
    t("accountDeletion3Item2"),
    t("accountDeletion3Item3"),
    t("accountDeletion3Item4"),
    t("accountDeletion3Item5"),
  ];

  const retainedItems = [t("accountDeletion4Item1"), t("accountDeletion4Item2")];

  return (
    <div className="space-y-10 text-text-primary">
      <header className="space-y-4 border-b border-border pb-6">
        <h1 className="text-3xl font-bold">{t("accountDeletionTitle")}</h1>
        <p className="text-text-secondary">{t("accountDeletionDescription")}</p>
      </header>

      {/* 1. 로그인 후 직접 삭제 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("accountDeletion1Title")}</h2>
        <p className="text-text-secondary leading-relaxed">{t("accountDeletion1Body")}</p>
        <ol className="list-decimal pl-5 space-y-2 text-text-secondary leading-relaxed">
          {directSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-bg-card/50 px-4 py-3 border border-border text-accent hover:bg-white/5 font-medium"
        >
          {t("accountDeletion1Link")}
        </Link>
      </section>

      {/* 2. 로그인 불가 시 운영팀 요청 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("accountDeletion2Title")}</h2>
        <p className="text-text-secondary leading-relaxed">{t("accountDeletion2Body")}</p>
        <p className="text-text-secondary leading-relaxed">{t("accountDeletion2ItemsIntro")}</p>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed">
          {requestItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="rounded-lg bg-bg-card/50 p-4 border border-border">
          <a
            href={`mailto:${OPERATOR_EMAIL}`}
            className="text-accent hover:underline font-medium"
          >
            {OPERATOR_EMAIL}
          </a>
        </div>
        <p className="text-text-secondary leading-relaxed">{t("accountDeletion2Note")}</p>
      </section>

      {/* 3. 삭제되는 정보 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("accountDeletion3Title")}</h2>
        <p className="text-text-secondary leading-relaxed">{t("accountDeletion3Body")}</p>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed">
          {deletedItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {/* 4. 삭제 후에도 남는 정보 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("accountDeletion4Title")}</h2>
        <p className="text-text-secondary leading-relaxed">{t("accountDeletion4Body")}</p>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed">
          {retainedItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Link href="/privacy" className="inline-block text-accent hover:underline font-medium">
          {t("privacy")}
        </Link>
      </section>

      {/* 5. 처리 기간 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("accountDeletion5Title")}</h2>
        <p className="text-text-secondary leading-relaxed">{t("accountDeletion5Body")}</p>
      </section>

      {/* 6. 연락처 */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">{t("accountDeletion6Title")}</h2>
        <p className="text-text-secondary leading-relaxed">{t("accountDeletion6Body")}</p>
        <div className="rounded-lg bg-bg-card/50 p-4 border border-border space-y-2">
          <p className="text-text-secondary">{t("accountDeletion6Operator")}</p>
          <a
            href={`mailto:${OPERATOR_EMAIL}`}
            className="block text-accent hover:underline font-medium"
          >
            {OPERATOR_EMAIL}
          </a>
        </div>
        <Link
          href="/about#contact"
          className="inline-block rounded-lg bg-bg-card/50 px-4 py-3 border border-border text-accent hover:bg-white/5 font-medium"
        >
          {t("accountDeletion6ContactLink")}
        </Link>
      </section>

      <footer className="pt-8 border-t border-border">
        <p className="text-sm text-text-secondary">{t("accountDeletionUpdatedDate")}</p>
      </footer>
    </div>
  );
}
