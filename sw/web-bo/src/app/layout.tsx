import { ProfessionProvider } from "@feelandnote/shared/hooks/use-professions";
import { getCelebProfessions } from "@/lib/celeb-professions";
import type { Metadata } from "next";
import "./globals.css";
import { ADMIN_NAME, SITE_NAME } from "@feelandnote/shared/constants/site-brand";

export const metadata: Metadata = {
  title: {
    template: '%s',
    default: ADMIN_NAME,
  },
  description: `${SITE_NAME} Back Office`,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const professions = await getCelebProfessions();
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>
        <ProfessionProvider professions={professions}>{children}</ProfessionProvider>
      </body>
    </html>
  );
}
