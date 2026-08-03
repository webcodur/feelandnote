import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const folders = ["world-best-2026", "nba-21c-club-best"];
const newProfileSlugs = [
  "vozinha",
  "pedro-porro",
  "lisandro-martinez",
  "dayot-upamecano",
  "marc-cucurella",
  "rodri",
  "michael-olise",
  "jude-bellingham",
  "gregg-popovich",
  "tony-parker",
  "manu-ginobili",
  "steve-kerr",
  "klay-thompson",
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function compact(value: string) {
  return value.replace(/\s+/g, "");
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url && key, "Supabase 관리자 환경변수가 없습니다.");
  const db = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const episodesResult = await db
    .from("faction_episodes")
    .select("id,folder,status,registered")
    .in("folder", folders);
  if (episodesResult.error) throw episodesResult.error;
  const episodes = episodesResult.data ?? [];
  assert(episodes.length === 2, `에피소드 수 불일치: ${episodes.length}`);
  assert(
    episodes.every((episode) => episode.status === "blocked" && episode.registered === false),
    "에피소드가 blocked/registered=false 상태가 아닙니다.",
  );

  const episodeIds = episodes.map((episode) => episode.id);
  const groupsResult = await db
    .from("faction_groups")
    .select("id,episode_id,disabled")
    .in("episode_id", episodeIds);
  if (groupsResult.error) throw groupsResult.error;
  const groups = groupsResult.data ?? [];
  assert(groups.length === 7, `세력 수 불일치: ${groups.length}`);
  assert(groups.every((group) => group.disabled === true), "비활성화되지 않은 세력이 있습니다.");

  const clustersResult = await db
    .from("faction_clusters")
    .select("id,group_id,disabled")
    .in("group_id", groups.map((group) => group.id));
  if (clustersResult.error) throw clustersResult.error;
  const clusters = clustersResult.data ?? [];
  assert(clusters.length === 7, `묶음 수 불일치: ${clusters.length}`);
  assert(clusters.every((cluster) => cluster.disabled === true), "비활성화되지 않은 묶음이 있습니다.");

  const peopleResult = await db
    .from("faction_people")
    .select("id,cluster_id,celeb_id,slug,disabled,web_hidden,epithet,epithet_en,lines,lines_en,quote,quote_chunks,quote_origin")
    .in("cluster_id", clusters.map((cluster) => cluster.id));
  if (peopleResult.error) throw peopleResult.error;
  const people = peopleResult.data ?? [];
  assert(people.length === 23, `출연진 수 불일치: ${people.length}`);
  assert(people.every((person) => person.celeb_id), "CELEB 미연결 출연진이 있습니다.");
  assert(people.every((person) => person.disabled === true), "비활성화되지 않은 출연진이 있습니다.");
  assert(people.every((person) => person.web_hidden === true), "웹 숨김이 아닌 출연진이 있습니다.");
  assert(people.every((person) => typeof person.epithet === "string" && person.epithet.trim()), "한국어 직함 누락");
  assert(people.every((person) => typeof person.epithet_en === "string" && person.epithet_en.trim()), "영문 직함 누락");
  assert(people.every((person) => Array.isArray(person.lines) && person.lines.length === 3 && person.lines.every(Boolean)), "한국어 상황 대사 3개 불충족");
  assert(people.every((person) => Array.isArray(person.lines_en) && person.lines_en.length === 3 && person.lines_en.every(Boolean)), "영문 상황 대사 3개 불충족");
  assert(people.every((person) => typeof person.quote === "string" && person.quote.trim()), "대표 대사 누락");
  assert(people.every((person) => Array.isArray(person.quote_chunks) && person.quote_chunks.length >= 2), "대표 대사 청크 누락");
  assert(
    people.every((person) => compact(person.quote) === compact(person.quote_chunks.join(""))),
    "대표 대사와 청크 내용이 다릅니다.",
  );
  assert(
    people.every((person) => typeof person.quote_origin === "string" && person.quote_origin.includes("창작 대사")),
    "창작 대사 표기 누락",
  );

  const profileIds = people.map((person) => person.celeb_id as string);
  const profilesResult = await db
    .from("profiles")
    .select("id,slug,status,celeb_tier,is_verified,avatar_url")
    .in("id", profileIds);
  if (profilesResult.error) throw profilesResult.error;
  const profiles = profilesResult.data ?? [];
  assert(profiles.length === 23, `연결 프로필 수 불일치: ${profiles.length}`);
  assert(profiles.every((profile) => typeof profile.avatar_url === "string" && profile.avatar_url.trim()), "아바타 누락 프로필이 있습니다.");

  const newProfiles = profiles.filter((profile) => newProfileSlugs.includes(profile.slug));
  assert(newProfiles.length === 13, `신규 최소 프로필 수 불일치: ${newProfiles.length}`);
  assert(
    newProfiles.every((profile) => profile.status === "suspended" && profile.celeb_tier === "light" && profile.is_verified === false),
    "신규 최소 프로필의 suspended/light/unverified 상태가 바뀌었습니다.",
  );

  const atlasResult = await db
    .from("faction_atlas_members")
    .select("person_id")
    .in("person_id", people.map((person) => person.id));
  if (atlasResult.error) throw atlasResult.error;
  assert((atlasResult.data ?? []).length === 0, "숨김 팩션 출연진이 공개 세력도감에 노출됩니다.");

  console.log(JSON.stringify({
    episodes: episodes.map(({ folder, status, registered }) => ({ folder, status, registered })),
    groups: groups.length,
    clusters: clusters.length,
    people: people.length,
    linkedProfiles: profiles.length,
    avatars: profiles.filter((profile) => profile.avatar_url).length,
    completedDialogue: people.length,
    newProfilesSuspendedLightUnverified: newProfiles.length,
    publicAtlasRows: (atlasResult.data ?? []).length,
  }, null, 2));
}

void main();
