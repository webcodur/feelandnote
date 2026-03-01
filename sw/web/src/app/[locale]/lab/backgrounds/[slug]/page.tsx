import fs from "fs";
import path from "path";
import BackgroundsLabClient from "./BackgroundsLabClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function BackgroundsLabPage({ params }: PageProps) {
  const { slug } = await params;

  const dir = path.join(process.cwd(), "public/images/backgrounds");
  let imageFiles: string[] = [];
  try {
    imageFiles = fs
      .readdirSync(dir)
      .filter((f) => /\.(webp|png|jpg|jpeg)$/i.test(f))
      .sort();
  } catch {
    // directory not found — no image backgrounds
  }

  return <BackgroundsLabClient slug={slug} imageFiles={imageFiles} />;
}
