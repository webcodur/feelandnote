/*
  파일명: actions/game/myth/resolveWorld.ts
  기능: 신화 게임 원천 → 화면 값
  책임: 두 언어 원천을 요청 언어로 풀고, 관계를 표준 방향 하나로 맞춰 중복을 없앤다.
        실제 조회와 체험 표본이 이 함수 하나를 지나므로 두 길의 모양이 갈라지지 않는다.
*/ // ------------------------------
import {
  canonicalizeCelebRelation,
  celebRelationFactKey,
  preferSpecificCelebRelationType,
} from "@feelandnote/shared/constants/celeb-relations";
import { titleArtForMyth, titleArtThumb } from "@/lib/myth-title-art";
import type {
  Bilingual,
  MythFigure,
  MythInfo,
  MythRelation,
  MythSourceCatalog,
  MythSourceRelation,
  MythWorld,
} from "@/components/features/game/myth/shared/types";

type Lang = "ko" | "en";

// 설명문은 다른 언어로 메우지 않는다. 이름만 영문이 비면 한국어 이름을 쓴다(신화 화면과 같은 규칙)
const text = (value: Bilingual, lang: Lang) => value[lang]?.trim() || null;
const properName = (value: Bilingual, lang: Lang) => text(value, lang) ?? text(value, "ko") ?? "";

function resolveRelations(rows: MythSourceRelation[], ids: Set<string>, lang: Lang): MythRelation[] {
  const byFact = new Map<string, MythRelation>();
  for (const row of rows) {
    if (!ids.has(row.from) || !ids.has(row.to) || row.from === row.to) continue;
    const canonical = canonicalizeCelebRelation({ fromId: row.from, toId: row.to, relType: row.type });
    const key = celebRelationFactKey(canonical);
    const candidate = { fromId: canonical.fromId, toId: canonical.toId, type: canonical.relType, note: text(row.note, lang) };
    const current = byFact.get(key);
    const better = !current
      || preferSpecificCelebRelationType(candidate.type, current.type)
      || (!current.note && Boolean(candidate.note) && !preferSpecificCelebRelationType(current.type, candidate.type));
    if (better) byFact.set(key, candidate);
  }
  return [...byFact.values()];
}

export function resolveWorld(
  catalog: MythSourceCatalog,
  relations: MythSourceRelation[],
  locale: string,
  isFixture: boolean,
): MythWorld {
  const lang: Lang = locale === "en" ? "en" : "ko";
  const figures: MythFigure[] = catalog.figures
    .filter((figure) => figure.slug && figure.roles.length > 0)
    .map((figure) => ({
      id: figure.id,
      slug: figure.slug,
      name: properName(figure.name, lang),
      title: text(figure.title, lang),
      headline: text(figure.headline, lang),
      gender: figure.gender,
      avatarUrl: figure.avatarUrl,
      portraitUrl: figure.portraitUrl,
      roles: figure.roles.map((role) => ({
        mythId: role.mythId,
        groupKey: role.group,
        summary: text(role.summary, lang),
        imageUrl: role.imageUrl,
      })),
    }));
  const ids = new Set(figures.map((figure) => figure.id));
  const orderIn = (mythId: string) => new Map(catalog.figures.filter((figure) => ids.has(figure.id)).flatMap((figure) =>
    figure.roles.filter((role) => role.mythId === mythId).map((role) => [figure.id, role.order] as const)));

  const myths: MythInfo[] = catalog.myths.map((myth) => {
    const order = orderIn(myth.id);
    const figureIds = [...order.keys()].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
    const members = figures.filter((figure) => order.has(figure.id));
    return {
      id: myth.id,
      slug: myth.slug,
      name: properName(myth.name, lang),
      region: text(myth.region, lang),
      titleArt: titleArtThumb(titleArtForMyth(myth.slug, myth.name.ko ?? "")),
      musicUrl: myth.musicUrl,
      leadIds: myth.leadIds.filter((id) => order.has(id)),
      figureIds,
      groups: [...myth.groups].sort((a, b) => a.position - b.position).map((group) => ({
        key: group.key,
        name: text(group.name, lang),
        description: text(group.description, lang),
        figureIds: figureIds.filter((id) => members.some((figure) =>
          figure.id === id && figure.roles.some((role) => role.mythId === myth.id && role.groupKey === group.key))),
      })),
    };
  }).filter((myth) => myth.figureIds.length > 0);

  return { myths, figures, relations: resolveRelations(relations, ids, lang), isFixture };
}
