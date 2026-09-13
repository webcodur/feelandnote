import { getTranslations } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import Lane from "@/components/ui/pending/Lane";
import MythAtlasSkeleton from "@/components/features/user/explore/myth/MythAtlasSkeleton";
import { MythSection } from "../sections";

export const maxDuration = 30;

export async function generateMetadata() {
  const t = await getTranslations("explore.hub.myth");
  return {
    title: t("title"),
    description: t("description"),
    alternates: await getLocalizedAlternates("/explore/myth"),
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default function MythPage() {
  return <Lane fallback={<MythAtlasSkeleton />}><MythSection /></Lane>;
}
