import PlaylistDetailView from "@/components/views/main/archive/PlaylistDetailView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlaylistDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <PlaylistDetailView playlistId={id} />;
}
