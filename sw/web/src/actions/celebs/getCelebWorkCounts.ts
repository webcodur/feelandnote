"use server";

import { createClient } from "@/lib/supabase/server";

export interface WorkTypeCounts {
  [key: string]: number;
}

export async function getCelebWorkCounts(celebId: string): Promise<WorkTypeCounts> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("celeb_works")
    .select("work_type")
    .eq("celeb_id", celebId);

  if (error || !data) return {};

  const counts: WorkTypeCounts = {};
  for (const row of data) {
    counts[row.work_type] = (counts[row.work_type] || 0) + 1;
  }
  return counts;
}
