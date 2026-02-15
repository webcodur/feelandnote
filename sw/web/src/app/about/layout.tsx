import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "About Us",
};

interface AboutLayoutProps {
  children: ReactNode;
}

export default function AboutLayout({ children }: AboutLayoutProps) {
  return children;
}
