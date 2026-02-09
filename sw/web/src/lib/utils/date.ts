// 날짜 및 시간 관련 유틸리티 함수

/**
 * 상대 시간 포맷 (ex: "방금 전", "3분 전", "2일 전")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "방금 전";
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

/**
 * UTC 날짜를 KST(UTC+9) Date 객체로 변환 (표시용)
 * 주의: 이 함수는 화면 표시만을 위해 시간을 9시간 더합니다.
 * 실제 시간대 계산이 필요한 경우 다른 방식을 권장합니다.
 */
export function toKST(date: string | Date | number): Date {
  const d = new Date(date);
  // UTC 기준으로 9시간을 더함
  return new Date(d.getTime() + (9 * 60 * 60 * 1000));
}

/**
 * UTC 날짜를 KST 기준으로 포맷팅하여 반환
 */
export function formatKST(
  date: string | Date | number, 
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul'
  }
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ko-KR', options).format(d);
}

