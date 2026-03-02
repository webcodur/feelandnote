import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("pages");
  return { title: t("notifications"), robots: { index: false, follow: false } };
}

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
