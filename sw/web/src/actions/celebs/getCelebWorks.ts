"use server";

import { createClient } from "@/lib/supabase/server";
import { CL_SELECT, flattenLocales } from "@/lib/utils/content-locale";
import type { CelebWork, CelebWorkWithContent, Content } from "@/types/database";

interface GetCelebWorksParams {
  celebId: string;
  workType?: string;
  page?: number;
  limit?: number;
}

export interface CelebWorkItem {
  id: string;
  title: string;
  title_en: string | null;
  role: string;
  description: string | null;
  description_en: string | null;
  work_type: string;
  release_year: number | null;
  search_keyword: string | null;
  content: {
    id: string;
    type: string;
    title: string;
    creator: string | null;
    thumbnail_url: string | null;
    metadata: Record<string, unknown> | null;
    user_count: number | null;
    title_ko: string | null;
    title_en: string | null;
    creator_en: string | null;
    thumbnail_en: string | null;
    has_en_edition: boolean | null;
  } | null;
}

export interface GetCelebWorksResult {
  items: CelebWorkItem[];
  total: number;
  totalPages: number;
}

export async function getCelebWorks({
  celebId,
  workType,
  page = 1,
  limit = 20,
}: GetCelebWorksParams): Promise<GetCelebWorksResult> {
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  let query = supabase
    .from("celeb_works")
    .select(
      `id, title, title_en, role, description, description_en, work_type, release_year, search_keyword,
       content:contents(id, type, subtype, external_id, release_date, metadata, user_count, created_at, content_locales(${CL_SELECT}))`,
      { count: "exact" }
    )
    .eq("celeb_id", celebId)
    .order("release_year", { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (workType) {
    query = query.eq("work_type", workType);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("getCelebWorks 에러:", error);
    return { items: [], total: 0, totalPages: 0 };
  }

  const items: CelebWorkItem[] = (data ?? []).map((row: any) => {
    let content: CelebWorkItem["content"] = null;

    if (row.content) {
      const locales = row.content.content_locales ?? [];
      const flat = flattenLocales(locales);
      content = {
        id: row.content.id,
        type: row.content.type,
        title: flat.title,
        creator: flat.creator,
        thumbnail_url: flat.thumbnail_url,
        metadata: row.content.metadata,
        user_count: row.content.user_count,
        title_ko: flat.title_ko,
        title_en: flat.title_en,
        creator_en: flat.creator_en,
        thumbnail_en: flat.thumbnail_en,
        has_en_edition: flat.has_en_edition,
      };
    }

    return {
      id: row.id,
      title: row.title,
      title_en: row.title_en,
      role: row.role,
      description: row.description,
      description_en: row.description_en,
      work_type: row.work_type,
      release_year: row.release_year,
      search_keyword: row.search_keyword,
      content,
    };
  });

  const total = count ?? 0;
  return {
    items,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
