"use client";

import { useTranslations } from "next-intl";
import type { FeedbackStatus } from '@/types/database'
import { FEEDBACK_STATUS_COLORS } from '@/constants/board'

interface FeedbackStatusBadgeProps {
  status: FeedbackStatus
}

export default function FeedbackStatusBadge({ status }: FeedbackStatusBadgeProps) {
  const t = useTranslations("board.status");
  return (
    <span className={`
      inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border
      ${FEEDBACK_STATUS_COLORS[status]}
    `}>
      {t(status)}
    </span>
  )
}
