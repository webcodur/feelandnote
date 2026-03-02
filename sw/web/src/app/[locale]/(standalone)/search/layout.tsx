import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("pages");
  return { title: t("search"), robots: { index: false, follow: false } };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
