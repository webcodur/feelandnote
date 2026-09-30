/*
  기능: 신화·세력 전체 목록 — 신화의 세계·세력도감 화면 아래에 늘 펼쳐 두는 링크 목록
  책임: 모든 신화·세력 주소를 서버 HTML의 실제 <a>로 싣는다. 선택기(AtlasNavigation)는 단추라 검색엔진이 다른 신화·세력으로
        가는 길이 없었다(26.09.29 실측 — 세력 링크 0개). 접지 않는다 — 접힌 링크는 없는 링크다(ops-02-seo 「내부 링크 통로」).
*/ // ------------------------------
import { Fragment } from "react";
import { Link } from "@/i18n/navigation";

export interface AtlasIndexGroup {
  id: string;
  name: string;
  items: Array<{ id: string; name: string; href: string; headline?: string | null; current?: boolean }>;
}

interface Props {
  heading: string;
  groups: AtlasIndexGroup[];
  /** 이름만 잇는다 — 세력처럼 항목이 많을 때. 기본은 이름 뒤에 한 줄 정의까지 같은 흐름으로 싣는다 */
  dense?: boolean;
}

export default function AtlasIndex({ heading, groups, dense = false }: Props) {
  const visible = groups.filter((group) => group.items.length > 0);
  if (visible.length === 0) return null;
  return (
    <nav aria-label={heading} data-atlas-index className="mx-auto mt-10 max-w-[1040px] border-t border-white/10 px-1 pt-8 md:mt-14 md:pt-10">
      <h2 className="text-lg font-bold text-text-primary md:text-xl">{heading}</h2>
      {/* 열을 나누지 않는다 — 그룹 길이가 들쭉날쭉이라 격자를 쓰면 빈칸이 생긴다. 그룹 표제 아래 가로로 흘려 쓴다 */}
      <div className="mt-5 space-y-6">
        {visible.map((group) => (
          <section key={group.id} aria-labelledby={`atlas-index-${group.id}`}>
            <h3 id={`atlas-index-${group.id}`} className="text-sm font-bold text-accent">{group.name}</h3>
            <p className="mt-2 text-sm leading-7 text-text-secondary">
              {/* 이름과 뒤따르는 가운뎃점을 한 덩어리로 묶는다 — 점이 줄 머리로 넘어가지 않는다 */}
              {group.items.map((item, index) => {
                const sep = index < group.items.length - 1 && <span aria-hidden className="ps-1.5 text-text-tertiary">·</span>;
                return (
                  <Fragment key={item.id}>
                    <span className="whitespace-nowrap">
                      <Link href={item.href} aria-current={item.current ? "page" : undefined}
                        className={`outline-none hover:text-accent hover:underline focus-visible:ring-2 focus-visible:ring-accent ${item.current ? "text-accent" : ""}`}>
                        {item.name}
                      </Link>
                      {(dense || !item.headline) && sep}
                    </span>
                    {!dense && item.headline && <span className="text-xs text-text-tertiary"> {item.headline}{sep}</span>}
                    {index < group.items.length - 1 && " "}
                  </Fragment>
                );
              })}
            </p>
          </section>
        ))}
      </div>
    </nav>
  );
}
