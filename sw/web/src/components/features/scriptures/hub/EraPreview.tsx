import HubCelebGrid from "@/components/features/user/explore/hub/HubCelebGrid";

interface TopCeleb {
  id: string;
  nickname: string;
  nickname_en: string | null;
  avatar_url: string | null;
  title: string | null;
  title_en: string | null;
  influence: number | null;
  count: number;
}

interface EraPreviewProps {
  celebs: TopCeleb[];
}

export default function EraPreview({ celebs }: EraPreviewProps) {
  if (!celebs || celebs.length === 0) return null;

  const mappedCelebs = celebs.slice(0, 6).map(c => ({
    ...c,
    content_count: c.count,
    title: c.title || "",
  }));

  return (
    <div className="relative">
      <HubCelebGrid celebs={mappedCelebs as any} />
    </div>
  );
}
