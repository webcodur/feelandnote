import { getTranslations } from "next-intl/server";
import MessageScope from "@/components/shared/MessageScope";

export async function generateMetadata() {
  const t = await getTranslations("pages");
  return { title: t("notifications"), robots: { index: false, follow: false } };
}

function NotificationsLayoutBody({ children }: { children: React.ReactNode }) {
  return children;
}

// 이 묶음은 화면마다 쓰는 문구 폭이 넓어 공통 뼈대에 남은 문구를 통째로 덧댄다.
export default function NotificationsLayout(props: { children: React.ReactNode }) {
  return (
    <MessageScope>
      <NotificationsLayoutBody {...props} />
    </MessageScope>
  );
}
