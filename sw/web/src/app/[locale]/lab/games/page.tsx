/*
  파일명: /app/[locale]/lab/games/page.tsx
  기능: 실험 게임 목록
  책임: 신작 게임 7종을 한자리에서 열어보게 한다.
        여기는 robots에서 차단된 실험 구역(`/lab`)이라 공개 쉼터에 링크를 내보내지 않는다.
        어느 게임을 공개할지 정해지면 그때 쉼터(`RestGameGrid`)로 승격한다.
*/

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** 게임 키와 문구 네임스페이스. 설명은 각 게임이 자기 문구 파일에 이미 갖고 있다. */
const GAMES = [
  { key: "grid", ns: "gameGrid", origin: "Immaculate Grid" },
  { key: "groups", ns: "gameGroups", origin: "NYT Connections" },
  { key: "proximity", ns: "gameProximity", origin: "Metazooa · Contexto" },
  { key: "travel", ns: "gameTravel", origin: "Travle · Wiki Game" },
  { key: "moreless", ns: "gameMoreless", origin: "More or Less" },
  { key: "topfive", ns: "gameTopfive", origin: "Factle" },
  { key: "redact", ns: "gameRedact", origin: "Redactle · Pedantle" },
] as const;

export const metadata = { title: "Games | Lab" };

// 실험 게임은 매 요청 서버에서 그린다(문구·인물 데이터가 요청 맥락에 의존).
// 선언하지 않으면 Next가 정적 생성을 시도했다 실패하며 빌드 로그에 오류를 남긴다.
export const dynamic = "force-dynamic";

export default async function LabGamesPage() {
  const entries = await Promise.all(
    GAMES.map(async (game) => {
      const t = await getTranslations(game.ns);
      // 게임마다 소개 문구 키 이름이 다르다(intro / description). 있는 것을 쓴 뒤 없으면 비운다.
      let summary = "";
      for (const key of ["intro", "description"]) {
        if (t.has(key)) {
          summary = t(key);
          break;
        }
      }
      return { ...game, title: t("title"), summary };
    }),
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-serif text-2xl text-text-primary">Games</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Lab · {entries.length}
      </p>

      <ul className="mt-8 space-y-3">
        {entries.map((game) => (
          <li key={game.key}>
            <Link
              href={`/lab/games/${game.key}`}
              className="group block rounded-xl border border-border/60 bg-bg-surface/40 p-4 hover:border-accent"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-serif text-lg text-text-primary group-hover:text-accent">
                  {game.title}
                </span>
                <span className="shrink-0 text-[11px] text-text-secondary/70">{game.origin}</span>
              </div>
              {game.summary ? (
                <p className="mt-1.5 line-clamp-2 text-sm text-text-secondary">{game.summary}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
