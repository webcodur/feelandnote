/*
  기능: 신화·세력 전체 목록 — 신화의 세계·세력도감 화면 아래에 늘 펼쳐 두는 링크 목록
  책임: 모든 신화·세력 주소를 서버 HTML의 실제 <a>로 싣는다. 선택기(AtlasNavigation)는 단추라 검색엔진이 다른 신화·세력으로
        가는 길이 없었다(26.09.29 실측 — 세력 링크 0개). 접지 않는다 — 접힌 링크는 없는 링크다(ops-02-seo 「내부 링크 통로」).
*/ // ------------------------------
import { Fragment } from "react";
import { Link } from "@/i18n/navigation";
import { MYTH_LAYOUT } from "./mythLayout";

export interface AtlasIndexGroup {
  id: string;
  name: string;
  items: Array<{ id: string; name: string; href: string; current?: boolean }>;
}

interface Props {
  heading: string;
  groups: AtlasIndexGroup[];
  stacked?: boolean;
}

export default function AtlasIndex({ heading, groups, stacked = false }: Props) {
  const visible = groups.filter((group) => group.items.length > 0);
  if (visible.length === 0) return null;
  return (
    /* 구획 머리(— NN — 전체)와 앵커는 바깥 HubSection이 쥔다 — 여기서는 목록만 그린다 */
    <nav aria-label={heading} data-atlas-index className={`${MYTH_LAYOUT.container} ${stacked ? "text-center" : "px-4 md:px-6"}`}>
      {/* 세력은 분야명을 별도 행에 두고, 항목은 그 아래 가운데에서 줄바꿈한다. */}
      <div className={stacked ? "space-y-7 md:space-y-8" : "space-y-4"}>
        {visible.map((group) => (
          <section key={group.id} aria-labelledby={`atlas-index-${group.id}`}>
            {stacked && <h3 id={`atlas-index-${group.id}`} className="mb-2 text-sm font-bold text-accent">{group.name}</h3>}
            <p className="text-sm leading-7 text-text-secondary">
              {!stacked && <span id={`atlas-index-${group.id}`} className="me-2 font-bold text-accent">{group.name}</span>}
              {/* 이름과 뒤따르는 가운뎃점을 한 덩어리로 묶는다 — 점이 줄 머리로 넘어가지 않는다 */}
              {group.items.map((item, index) => {
                const sep = index < group.items.length - 1 && <span aria-hidden className="ps-1.5 text-text-tertiary">·</span>;
                return (
                  <Fragment key={item.id}>
                    <span className={stacked ? "inline-block max-w-full break-words align-top" : "whitespace-nowrap"}>
                      {/* 지금 페이지는 accent 글자색이 그룹 표제와 겹치므로 굵은 밑줄로 구별한다 */}
                      <Link href={item.href} aria-current={item.current ? "page" : undefined}
                        className={`outline-none hover:text-accent hover:underline focus-visible:ring-2 focus-visible:ring-accent ${item.current ? "font-bold underline decoration-accent underline-offset-4" : ""} text-text-primary`}>
                        {item.name}
                      </Link>
                      {sep}
                    </span>
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
