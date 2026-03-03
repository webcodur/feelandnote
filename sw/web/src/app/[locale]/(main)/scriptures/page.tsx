import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getAlternates } from "@/lib/seo";

export async function generateMetadata() {
  const t = await getTranslations("scriptures.meta");
  return { title: t("title"), description: t("description"), alternates: getAlternates("/scriptures") };
}

export default async function Page() {
  const locale = await getLocale();
  redirect({ href: "/scriptures/era", locale });
}
