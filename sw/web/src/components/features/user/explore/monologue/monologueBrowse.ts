import type { VirtualMonologueCeleb } from "@/actions/celebs/getVirtualMonologueCelebs";

export const MONOLOGUE_PAGE_SIZE = 16;
export interface MonologueBrowseOptions {
  professions: { value: string; label: string }[];
  nationalities: { value: string; label: string }[];
}
export interface MonologueFilters {
  query: string;
  profession: string;
  nationality: string;
  audio: "all" | "voiced" | "text";
}
export const EMPTY_MONOLOGUE_FILTERS: MonologueFilters = { query: "", profession: "", nationality: "", audio: "all" };

const normalize = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase().replace(/\s+/g, "");

export function filterMonologueCelebs(items: VirtualMonologueCeleb[], filters: MonologueFilters): VirtualMonologueCeleb[] {
  const query = normalize(filters.query.trim());
  return items.filter(celeb => {
    if (filters.profession && celeb.profession !== filters.profession) return false;
    if (filters.nationality && celeb.nationality !== filters.nationality) return false;
    if (filters.audio === "voiced" && !celeb.hasVoice) return false;
    if (filters.audio === "text" && celeb.hasVoice) return false;
    return !query || normalize(`${celeb.searchNames} ${celeb.nickname} ${celeb.title ?? ""}`).includes(query);
  });
}

export function monologuePage(items: VirtualMonologueCeleb[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / MONOLOGUE_PAGE_SIZE));
  const page = Math.max(1, Math.min(requestedPage, totalPages));
  return { page, totalPages, items: items.slice((page - 1) * MONOLOGUE_PAGE_SIZE, page * MONOLOGUE_PAGE_SIZE) };
}
