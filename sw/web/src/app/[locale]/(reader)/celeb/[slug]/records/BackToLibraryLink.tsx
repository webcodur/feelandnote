/* ─────────────────────────────────────────────
 * [celeb 상세] records — 서가로 돌아가기
 * - 목차 위치: records (감상 기록 전체보기 페이지)
 * - 데이터: 없음
 * - 함께 보기: RecordsPageBody.tsx, [locale]/layout.tsx(instantScrollOnce 스크립트)
 * ───────────────────────────────────────────── */
import { ArrowLeft } from "lucide-react";

interface Props {
  href: string;
  label: string;
  className?: string;
}

/**
 * history.back()로 되짚어 봤지만 스크롤이 여전히 스무스하게 애니메이션됐다 — 복원 주체가
 * 브라우저 자체 스크롤인지 Next.js의 해시 스크롤(전역 scroll-behavior: smooth를 따라간다)인지
 * 확실치 않았다. 그래서 그냥 새로 이동하는 편한 링크로 되돌리고, 착지 쪽(루트 레이아웃의
 * 인라인 스크립트)에서 이 순간만 스크롤을 즉시로 강제한다 — 사이트 전역 스무스 값은 그대로 둔다.
 */
export default function BackToLibraryLink({ href, label, className }: Props) {
  return (
    <a href={href} aria-label={label} title={label} className={className}>
      <ArrowLeft size={18} aria-hidden />
    </a>
  );
}
