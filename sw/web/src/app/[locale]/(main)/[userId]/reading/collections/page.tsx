import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/db/server";
import Flows from "@/components/features/user/flows/Flows";

export async function generateMetadata() {
  const t = await getTranslations("pages");
  return { title: t("collections") };
}

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { userId } = await params;
  const db = await createClient();
  const { data: { user: currentUser } } = await db.auth.getUser();

  const isOwner = currentUser?.id === userId;

  return <Flows userId={userId} isOwner={isOwner} />;
}
