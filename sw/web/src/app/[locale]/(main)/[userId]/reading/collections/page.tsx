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

export default async function Page({ params }: PageProps) {
  const { userId } = await params;
  const { data: { user: currentUser } } = await getRequestUser();

  const isOwner = currentUser?.id === userId;

  return <Flows userId={userId} isOwner={isOwner} />;
}
