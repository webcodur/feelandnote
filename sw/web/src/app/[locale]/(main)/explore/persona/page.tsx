/*
  Legacy compatibility route: /explore/persona -> /explore/spectrum
*/

import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function LegacySpectrumRedirectPage() {
  const locale = await getLocale();
  redirect({ href: "/explore/spectrum", locale });
}
