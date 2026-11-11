import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import FigureVoteLab from "@/components/lab/figure-votes/FigureVoteLab";
import { FIGURE_VOTE_ROUNDS, type VotePerson, type VoteRound } from "@/components/lab/figure-votes/rounds";
import { createStaticClient } from "@/lib/db/static";
import { isDeveloperMode } from "@/lib/developer-mode";
import { getLocalizedAlternates } from "@/lib/seo";

export async function generateMetadata() {
  return {
    title: "인물 투표 | Lab",
    robots: { index: false, follow: false },
    alternates: await getLocalizedAlternates("/lab/figure-votes"),
  };
}

export default async function FigureVotesPage() {
  if (!isDeveloperMode() || await getLocale() !== "ko") notFound();

  const slugs = [...new Set(FIGURE_VOTE_ROUNDS.flatMap(round => round.candidates.flatMap(candidate => candidate.people)))];
  const { data, error } = await createStaticClient()
    .from("celebs")
    .select("slug, nickname, portrait_url, avatar_url")
    .eq("publication_status", "active")
    .in("slug", slugs);

  if (error) {
    console.error("[Figure votes] 후보 조회 실패:", error.message);
    return <p role="alert" className="py-8 text-sm text-red-300">후보를 불러오지 못했습니다. 새로고침해 다시 시도하세요.</p>;
  }

  const people = new Map<string, VotePerson>();
  for (const person of data ?? []) {
    if (!person.slug || !person.nickname) continue;
    people.set(person.slug, { slug: person.slug, name: person.nickname, portrait: person.portrait_url, avatar: person.avatar_url });
  }

  const rounds: VoteRound[] = FIGURE_VOTE_ROUNDS.flatMap(round => {
    const candidates = round.candidates.flatMap(candidate => {
      const members = candidate.people.flatMap(slug => people.get(slug) ?? []);
      return members.length === candidate.people.length ? [{ ...candidate, people: members }] : [];
    });
    return candidates.length >= (round.mode === "rank" ? 3 : 2) ? [{ ...round, candidates }] : [];
  });

  if (!rounds.length) return <p role="status" className="py-8 text-sm text-text-secondary">투표를 열 수 있는 인물이 없습니다.</p>;
  return <FigureVoteLab rounds={rounds} />;
}
