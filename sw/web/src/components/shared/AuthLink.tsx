"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { useLocale } from "next-intl";
import { getPathname, usePathname } from "@/i18n/navigation";

/** Login and signup keep the work, filters and section that led to authentication. */
export default function AuthLink({ href, onClick, onAuxClick, ...props }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: "/login" | "/signup" }) {
  const locale = useLocale();
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const target = getPathname({ href, locale });
  const prepare = (event: MouseEvent<HTMLAnchorElement>) => {
    const destination = isAuthPage ? new URLSearchParams(window.location.search).get("redirect")
      : window.location.pathname + window.location.search + window.location.hash;
    event.currentTarget.href = destination ? `${target}?${new URLSearchParams({ redirect: destination })}` : target;
  };
  return <a {...props} href={isAuthPage ? target : `${target}?${new URLSearchParams({ redirect: pathname })}`}
    onClick={event => { prepare(event); onClick?.(event); }}
    onAuxClick={event => { prepare(event); onAuxClick?.(event); }} />;
}
