/*
  파일명: /components/features/moderation/BlockedUsersCard.tsx
  기능: 차단한 사용자 관리 카드
  책임: 내가 차단한 사람을 보여주고 해제할 수 있게 한다.

  목록은 서버 화면에서 받아 넘긴다(본인 데이터라 캐시하지 않는다).
  해제는 이 자리에서 처리하고 화면을 다시 읽어 목록을 맞춘다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, UserX } from "lucide-react";
import ClassicalBox from "@/components/ui/ClassicalBox";
import { DecorativeLabel } from "@/components/ui";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { unblockUser } from "@/actions/moderation";
import type { BlockedUser } from "@/actions/moderation";

interface BlockedUsersCardProps {
  users: BlockedUser[];
  total: number;
}

export default function BlockedUsersCard({ users, total }: BlockedUsersCardProps) {
  const t = useTranslations("moderation.blockedList");
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  const handleUnblock = async (userId: string) => {
    setPendingId(userId);
    setErrorId(null);

    const result = await unblockUser(userId);

    setPendingId(null);

    if (!result.success) {
      setErrorId(userId);
      return;
    }

    router.refresh();
  };

  return (
    <ClassicalBox className="p-0 md:p-8">
      <div className="flex justify-center mb-6">
        <DecorativeLabel label={t("title")} />
      </div>

      <p className="text-sm text-text-secondary">{t("description")}</p>

      {users.length === 0 && (
        <div className="mt-4 space-y-1">
          <p className="text-sm text-text-primary">{t("empty")}</p>
          <p className="text-sm text-text-secondary">{t("emptyGuide")}</p>
        </div>
      )}

      {users.length > 0 && (
        <>
          <p className="mt-4 text-sm text-accent">{t("count", { count: total })}</p>

          <ul className="mt-3 space-y-2">
            {users.map((user) => (
              <li
                key={user.blockId}
                className="flex items-center gap-3 rounded-sm border border-border px-3 py-2"
              >
                <Avatar url={user.avatarUrl} name={user.nickname} size="sm" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-primary">{user.nickname}</p>
                  {user.blockedAt && (
                    <p className="text-sm text-text-tertiary">
                      {t("blockedAt", { date: user.blockedAt.slice(0, 10) })}
                    </p>
                  )}
                  {errorId === user.userId && (
                    <p className="text-sm text-status-paused">{t("loadError")}</p>
                  )}
                </div>

                <Button
                  unstyled
                  onClick={() => handleUnblock(user.userId)}
                  disabled={pendingId === user.userId}
                  className="flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-sm text-text-secondary hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  {pendingId === user.userId ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <UserX size={14} />
                  )}
                  {t("unblock")}
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </ClassicalBox>
  );
}
