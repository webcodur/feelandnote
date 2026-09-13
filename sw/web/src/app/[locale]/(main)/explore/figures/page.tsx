import { permanentRedirect } from "next/navigation";

export default async function FiguresRedirectPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach((item) => search.append(key, item));
    else if (value !== undefined) search.set(key, value);
  }
  const path = `${locale === "en" ? "/en" : ""}/explore`;
  permanentRedirect(search.size ? `${path}?${search}` : path);
}
