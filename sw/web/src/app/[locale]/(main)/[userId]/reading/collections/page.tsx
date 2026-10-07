import Lane from "@/components/ui/pending/Lane";
import { PendingBlock } from "@/components/ui/pending";
import { getTranslations } from "next-intl/server";
import { getRequestUser } from "@/lib/db/server";
import Flows from "@/components/features/user/flows/Flows";

export async function generateMetadata() {
  const t = await getTranslations("pages");
  return { title: t("collections") };
}

interface PageProps {
  params: Promise<{ userId: string }>;
}

async function PageBody({ params }: PageProps) {
  const { userId } = await params;
  const { data: { user: currentUser } } = await getRequestUser();

  const isOwner = currentUser?.id === userId;

  return <Flows userId={userId} isOwner={isOwner} />;
}

export default function Page(props: PageProps) {
  return <Lane fallback={<PendingBlock variant="grid" count={6} />}><PageBody {...props} /></Lane>;
}
