"use client";

import { redirect } from "@/i18n/navigation";
import { useLocale } from "next-intl";

export default function BackgroundsRedirectPage() {
  const locale = useLocale();
  redirect({ href: "/lab/backgrounds/deep-sea", locale });
}
