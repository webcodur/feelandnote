import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("scriptures.meta");
  return { title: t("title"), description: t("description") };
}

export default function Page() {
  redirect("/scriptures/era");
}
