/*
  파일명: /components/features/moderation/reportResultMessage.ts
  기능: 신고·차단 결과 문구 선택
  책임: 서버가 돌려준 실패 코드를 사용자에게 보여줄 문구 키로 옮긴다.
*/ // ------------------------------

import type { ErrorCode } from '@/lib/errors/types'

// 실패 코드별 문구 키. moderation.json 의 report.result.* / block.result.* 와 짝을 이룬다.
const REPORT_ERROR_KEYS: Partial<Record<ErrorCode, string>> = {
  UNAUTHORIZED: 'loginRequired',
  SELF_ACTION: 'selfTarget',
  VALIDATION_ERROR: 'detailMissing',
  LIMIT_EXCEEDED: 'detailTooLong',
}

const BLOCK_ERROR_KEYS: Partial<Record<ErrorCode, string>> = {
  UNAUTHORIZED: 'loginRequired',
  SELF_ACTION: 'selfTarget',
  NOT_FOUND: 'notFound',
}

export function reportErrorKey(code: ErrorCode): string {
  return REPORT_ERROR_KEYS[code] ?? 'error'
}

export function blockErrorKey(code: ErrorCode): string {
  return BLOCK_ERROR_KEYS[code] ?? 'error'
}
