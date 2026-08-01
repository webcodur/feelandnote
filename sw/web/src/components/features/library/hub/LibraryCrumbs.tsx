/*
  파일명: /components/features/library/hub/LibraryCrumbs.tsx
  기능: 서가 배너 breadcrumb에 하위 화면이 자기 이름을 알리는 통로
  책임: 주소에 식별자만 있는 화면(기관·목록처럼 이름이 자료에 있는 곳)이
        배너에 표시할 이름을 넘긴다. 배너는 경로만으로는 이 이름을 알 수 없다.
*/ // ------------------------------

"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface ExtraCrumb {
  label: string;
  href: string;
}

interface Store {
  crumbs: ExtraCrumb[];
  setCrumbs: (v: ExtraCrumb[]) => void;
}

const Ctx = createContext<Store>({ crumbs: [], setCrumbs: () => {} });

export function LibraryCrumbProvider({ children }: { children: ReactNode }) {
  const [crumbs, setCrumbs] = useState<ExtraCrumb[]>([]);
  return <Ctx.Provider value={{ crumbs, setCrumbs }}>{children}</Ctx.Provider>;
}

export function useExtraCrumbs() {
  return useContext(Ctx).crumbs;
}

/**
 * 하위 화면이 렌더하는 알림표. 화면에는 아무것도 그리지 않는다.
 * 화면을 벗어나면 비워, 다른 화면의 배너에 남은 이름이 따라붙지 않게 한다.
 */
export default function SetLibraryCrumbs({ crumbs }: { crumbs: ExtraCrumb[] }) {
  const { setCrumbs } = useContext(Ctx);
  const key = JSON.stringify(crumbs);

  useEffect(() => {
    setCrumbs(JSON.parse(key) as ExtraCrumb[]);
    return () => setCrumbs([]);
  }, [key, setCrumbs]);

  return null;
}
