/*
  Legacy compatibility route: /lab/persona -> /lab/spectrum
*/

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function LegacySpectrumLabRedirectPage() {
  const locale = await getLocale();
  redirect({ href: "/lab/spectrum", locale });
}
