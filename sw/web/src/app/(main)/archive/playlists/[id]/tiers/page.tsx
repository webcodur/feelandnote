import TierEditView from "@/components/views/main/archive/TierEditView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TierEditPage({ params }: PageProps) {
  const { id } = await params;
  return <TierEditView playlistId={id} />;
}
