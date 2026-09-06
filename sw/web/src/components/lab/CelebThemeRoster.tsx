/*
  파일명: /components/lab/CelebThemeRoster.tsx
  기능: 재질별 인물 명단
  책임: 전 인물을 세계 판정에 통과시켜 재질 하나에 모으고, 그 재질 색으로 칠한 판 위에 이름을 늘어놓는다.
        색이 인물과 맞는지는 이름을 나란히 봐야 알 수 있어 표본 몇 명 대신 전원을 싣는다.
*/

import { createStaticClient } from "@/lib/db/static";
import { getCelebWorld, resolveCelebWorld } from "@/lib/celeb/world";
import {
  WORLD_MATERIAL_BY_WORLD,
  WORLD_MATERIAL_DEFINITIONS,
  type WorldMaterialDefinition,
  type WorldMaterialId,
} from "@/lib/celeb/worldMaterial";

interface CelebRow {
  slug: string | null;
  nickname: string | null;
  nationality: string | null;
  birth_date: string | null;
  death_date: string | null;
  celeb_reality: string | null;
}

interface Person {
  slug: string;
  name: string;
  year: string;
}

const PAGE = 1000;

async function fetchAllCelebs(): Promise<CelebRow[]> {
  const db = createStaticClient();
  const rows: CelebRow[] = [];

  for (let from = 0; from < 20000; from += PAGE) {
    const { data, error } = await db
      .from("celebs")
      .select("slug,nickname,nationality,birth_date,death_date,celeb_reality")
      .order("slug")
      .range(from, from + PAGE - 1);

    if (error || !data || data.length === 0) break;
    rows.push(...(data as CelebRow[]));
    if (data.length < PAGE) break;
  }

  return rows;
}

/** "1545-04-28" · "-360" 어느 형태든 표시용 연도만 남긴다 */
function displayYear(row: CelebRow): string {
  const raw = row.birth_date ?? row.death_date;
  if (!raw) return "";
  const matched = /^-?\d{1,4}/.exec(String(raw).trim());
  if (!matched) return "";
  const year = Number.parseInt(matched[0], 10);
  return year < 0 ? `BC ${Math.abs(year)}` : String(year);
}

function MaterialPanel({
  material,
  worlds,
  total,
}: {
  material: WorldMaterialDefinition;
  worlds: Array<{ id: string; label: string; people: Person[] }>;
  total: number;
}) {
  return (
    <section
      className="rounded-lg border p-5"
      style={{ background: material.canvas, borderColor: material.edge }}
    >
      <header className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-lg font-semibold" style={{ color: material.accent }}>
          {material.labelKo}
        </h3>
        <span className="text-xs" style={{ color: material.muted }}>
          {material.id} · 인물 {total.toLocaleString()}명 · 세계 {worlds.length}개
        </span>
        <span className="ml-auto flex gap-1">
          {[material.canvas, material.panel, material.raised, material.edge, material.accent].map((color) => (
            <span
              key={color}
              title={color}
              className="inline-block h-4 w-8 rounded-sm"
              style={{ background: color, outline: `1px solid ${material.edge}` }}
            />
          ))}
        </span>
      </header>

      <div className="space-y-3">
        {worlds.map((world) => (
          <div
            key={world.id}
            className="rounded-md border p-3"
            style={{ background: material.panel, borderColor: material.edge }}
          >
            <p className="mb-2 text-xs font-semibold" style={{ color: material.accent }}>
              {world.label}
              <span className="ml-2 font-normal" style={{ color: material.muted }}>
                {world.people.length}명
              </span>
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {world.people.map((person) => (
                <li key={person.slug}>
                  <a
                    href={`/ko/celeb/${person.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block rounded border px-2 py-0.5 text-xs hover:brightness-125"
                    style={{ background: material.raised, borderColor: material.edge, color: material.text }}
                  >
                    {person.name}
                    {person.year && (
                      <span className="ml-1" style={{ color: material.muted }}>
                        {person.year}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function CelebThemeRoster() {
  const rows = await fetchAllCelebs();

  // 재질 → 세계 → 인물
  const buckets = new Map<WorldMaterialId, Map<string, Person[]>>();

  for (const row of rows) {
    if (!row.slug) continue;
    const worldId = resolveCelebWorld({
      nationality: row.nationality,
      birthDate: row.birth_date,
      deathDate: row.death_date,
      reality: row.celeb_reality,
    });
    const materialId = WORLD_MATERIAL_BY_WORLD[worldId] ?? "stone-bronze";

    if (!buckets.has(materialId)) buckets.set(materialId, new Map());
    const worldMap = buckets.get(materialId)!;
    if (!worldMap.has(worldId)) worldMap.set(worldId, []);
    worldMap.get(worldId)!.push({
      slug: row.slug,
      name: row.nickname ?? row.slug,
      year: displayYear(row),
    });
  }

  const materialIds = Object.keys(WORLD_MATERIAL_DEFINITIONS) as WorldMaterialId[];

  return (
    <div className="space-y-6">
      <p className="text-center text-sm text-text-secondary">
        인물 {rows.length.toLocaleString()}명을 세계 판정에 통과시킨 결과다. 이름을 누르면 그 인물의 상세가 새 탭에서
        열린다.
      </p>

      {materialIds.map((materialId) => {
        const worldMap = buckets.get(materialId);
        const material = WORLD_MATERIAL_DEFINITIONS[materialId];
        if (!worldMap || worldMap.size === 0) {
          return (
            <section
              key={materialId}
              className="rounded-lg border p-5"
              style={{ background: material.canvas, borderColor: material.edge }}
            >
              <h3 className="text-lg font-semibold" style={{ color: material.accent }}>
                {material.labelKo}
              </h3>
              <p className="text-xs" style={{ color: material.muted }}>
                {material.id} · 배정된 인물이 없다
              </p>
            </section>
          );
        }

        const worlds = [...worldMap.entries()]
          .map(([id, people]) => ({
            id,
            label: getCelebWorld(id).label,
            people: people.sort((a, b) => a.name.localeCompare(b.name, "ko")),
          }))
          .sort((a, b) => b.people.length - a.people.length);

        const total = worlds.reduce((sum, world) => sum + world.people.length, 0);

        return <MaterialPanel key={materialId} material={material} worlds={worlds} total={total} />;
      })}
    </div>
  );
}
