"use client";

import { createContext, useContext, useLayoutEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import type { BannerCrumb } from "./BannerHeading";

interface Entry {
  locale: string;
  pathname: string;
  crumbs: BannerCrumb[];
}

interface Store {
  entry: Entry | null;
  setEntry: Dispatch<SetStateAction<Entry | null>>;
}

const Context = createContext<Store | null>(null);
const EMPTY: BannerCrumb[] = [];

function routePath(href: string) {
  const path = href.split(/[?#]/)[0].replace(/\/$/, "");
  try { return decodeURIComponent(path); } catch { return path; }
}

/** 이름이 자료에 있는 하위 화면과 공통 배너를 연결한다. */
export function BannerCrumbProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const store = useMemo(() => ({ entry, setEntry }), [entry]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}

export function useBannerCrumbs() {
  const store = useContext(Context);
  const pathname = usePathname();
  const locale = useLocale();
  const entry = store?.entry;
  // 자료가 도착하기 전에는 이전 주소·언어의 이름을 새 화면에 붙이지 않는다.
  return entry?.locale === locale && entry.pathname === routePath(pathname) ? entry.crumbs : EMPTY;
}

export default function SetBannerCrumbs({ crumbs }: { crumbs: BannerCrumb[] }) {
  const setEntry = useContext(Context)?.setEntry;
  const locale = useLocale();
  const serialized = JSON.stringify(crumbs);

  useLayoutEffect(() => {
    if (!setEntry) return;
    const value = JSON.parse(serialized) as BannerCrumb[];
    const entry: Entry = { locale, pathname: routePath(value.at(-1)?.href ?? ""), crumbs: value };
    setEntry(entry);
    return () => setEntry(current => current === entry ? null : current);
  }, [locale, serialized, setEntry]);

  return null;
}
