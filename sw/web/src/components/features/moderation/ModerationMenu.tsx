/*
  파일명: /components/features/moderation/ModerationMenu.tsx
  기능: 신고·차단 조작 메뉴
  책임: 게시물·방명록·프로필에 붙여 신고와 차단 창구를 낸다.

  자기 글·자기 프로필에는 아무것도 내지 않는다.
  작성자를 알 수 없는 익명 글은 대상 신고만 내고 작성자 신고·차단은 내지 않는다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Flag, UserX } from "lucide-react";
import DropdownMenu, { type DropdownMenuItem } from "@/components/ui/DropdownMenu";
import { ENUM_REPORT_TARGET_TYPE, type ReportTargetType } from "@/constants/moderation";
import ReportModal from "./ReportModal";
import BlockConfirmModal from "./BlockConfirmModal";

interface ModerationMenuProps {
  targetType: ReportTargetType;
  targetId: string;
  /** 대상 글의 작성자. 익명 글은 null 이다 */
  authorId?: string | null;
  authorNickname?: string;
  /** 화면을 보는 사람. 비로그인은 null */
  viewerId?: string | null;
  targetLabel?: string;
  isAuthorBlocked?: boolean;
  className?: string;
}

type OpenModal = "none" | "reportTarget" | "reportAuthor" | "block";

export default function ModerationMenu({
  targetType,
  targetId,
  authorId = null,
  authorNickname = "",
  viewerId = null,
  targetLabel,
  isAuthorBlocked = false,
  className = "",
}: ModerationMenuProps) {
  const t = useTranslations("moderation");
  const [openModal, setOpenModal] = useState<OpenModal>("none");

  // 자기 글·자기 프로필에는 메뉴를 내지 않는다
  const isOwnContent = viewerId !== null && authorId !== null && viewerId === authorId;
  const isOwnProfile = targetType === ENUM_REPORT_TARGET_TYPE.USER && viewerId === targetId;
  if (isOwnContent || isOwnProfile) return null;

  const isGuest = viewerId === null;
  const isUserTarget = targetType === ENUM_REPORT_TARGET_TYPE.USER;
  const canActOnAuthor = authorId !== null && !isUserTarget;

  const items: DropdownMenuItem[] = [
    {
      label: t(`report.menu.${isUserTarget ? "user" : targetType}`),
      icon: <Flag size={14} />,
      onClick: () => setOpenModal("reportTarget"),
    },
  ];

  if (canActOnAuthor) {
    items.push({
      label: t("report.menu.author"),
      icon: <Flag size={14} />,
      onClick: () => setOpenModal("reportAuthor"),
    });
  }

  if (authorId !== null || isUserTarget) {
    items.push({
      label: isAuthorBlocked
        ? t("block.menu.unblock")
        : t(`block.menu.${isUserTarget ? "block" : "blockAuthor"}`),
      icon: <UserX size={14} />,
      onClick: () => setOpenModal("block"),
      variant: "danger",
    });
  }

  const blockTargetId = isUserTarget ? targetId : (authorId ?? "");

  return (
    <div className={className}>
      <DropdownMenu items={items} />

      <ReportModal
        isOpen={openModal === "reportTarget"}
        onClose={() => setOpenModal("none")}
        targetType={targetType}
        targetId={targetId}
        targetUserId={authorId}
        targetLabel={targetLabel}
        isGuest={isGuest}
      />

      {canActOnAuthor && (
        <ReportModal
          isOpen={openModal === "reportAuthor"}
          onClose={() => setOpenModal("none")}
          targetType={ENUM_REPORT_TARGET_TYPE.USER}
          targetId={authorId}
          targetUserId={authorId}
          targetLabel={authorNickname}
          isGuest={isGuest}
        />
      )}

      {blockTargetId.length > 0 && (
        <BlockConfirmModal
          isOpen={openModal === "block"}
          onClose={() => setOpenModal("none")}
          targetUserId={blockTargetId}
          nickname={authorNickname}
          isBlocked={isAuthorBlocked}
          isGuest={isGuest}
        />
      )}
    </div>
  );
}
