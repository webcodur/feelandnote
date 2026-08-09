/*
  파일명: /app/(main)/explore/faction/page.tsx
  기능: 세력도감 독립 페이지
  책임: 세력도감(FeaturedFaction)을 독립 페이지로 보여준다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { getFeaturedTags } from "@/actions/home";
import FeaturedFaction from "@/components/features/landing/FeaturedFaction";
import { getLocalizedAlternates } from "@/lib/seo";
import { isAdmin } from "@/lib/auth/checkAdmin";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("explore.faction");
  return {
    title: t("metaTitle"),
    alternates: await getLocalizedAlternates("/explore/faction"),
  };
}

async function FactionServer({ initialTagId }: { initialTagId?: string }) {
  const [featuredTags, supabase] = await Promise.all([getFeaturedTags(), createClient()]);
  const canEditNames = await isAdmin(supabase);

  return (
    <AsyncIntlProvider>
      <FeaturedFaction
        tags={featuredTags}
        location="explore-pc"
        initialTagId={initialTagId}
        canEditNames={canEditNames}
      />
    </AsyncIntlProvider>
  );
}

export default async function FactionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const tag = typeof params.tag === "string" ? params.tag : undefined;

  return <FactionServer initialTagId={tag} />;
}
