import { getTranslations } from "next-intl/server";
import { RetryBlock } from "@/components/ui/pending";
import { getCuratedHub } from "@/actions/library";
import type { CuratedHub } from "@/actions/library/types";
import CuratedHubView from "@/components/features/library/curated/CuratedHubView";

export async function CuratedSection() {
  let hub: CuratedHub;
  try {
    hub = await getCuratedHub();
  } catch (error) {
    console.error("[works] Curated lists failed:", error);
    return <RetryBlock />;
  }
  if (hub.curators.length === 0) {
    const t = await getTranslations("pending");
    return <p className="py-8 text-center text-sm text-text-secondary">{t("empty")}</p>;
  }
  return <CuratedHubView hub={hub} />;
}
