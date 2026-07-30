'use server'

import { createClient } from '@/lib/supabase/server'
import { type ActionResult, failure, success, handleSupabaseError } from '@/lib/errors'
import {
  ENUM_REPORT_REASON,
  ENUM_REPORT_TARGET_TYPE,
  REPORT_DESCRIPTION_MAX_LENGTH,
  REPORT_DESCRIPTION_MIN_LENGTH_FOR_OTHER,
  isReportReason,
  isReportTargetType,
  type ReportReason,
  type ReportTargetType,
} from '@/constants/moderation'

interface CreateReportParams {
  targetType: ReportTargetType
  targetId: string
  // 신고 대상 글의 작성자. 운영 화면이 반복 신고·악용을 집계하는 축이라 가능하면 항상 채운다.
  targetUserId?: string | null
  reason: ReportReason
  description?: string
}

interface CreateReportData {
  reportId: string | null
  // 같은 대상을 이미 신고했다는 뜻. 실패가 아니라 정상 결과로 돌려준다.
  alreadyReported: boolean
}

export async function createReport(
  params: CreateReportParams
): Promise<ActionResult<CreateReportData>> {
  const { targetType, targetId, targetUserId = null, reason } = params
  const description = params.description?.trim() ?? ''

  // #region 입력 검증
  if (!isReportTargetType(targetType)) {
    return failure('INVALID_INPUT', '신고 대상 종류가 올바르지 않다.')
  }

  if (!isReportReason(reason)) {
    return failure('INVALID_INPUT', '신고 사유가 올바르지 않다.')
  }

  if (targetId.trim().length === 0) {
    return failure('VALIDATION_ERROR', '신고 대상이 지정되지 않았다.')
  }

  if (description.length > REPORT_DESCRIPTION_MAX_LENGTH) {
    return failure(
      'LIMIT_EXCEEDED',
      `상세 설명은 ${REPORT_DESCRIPTION_MAX_LENGTH}자까지 입력할 수 있다.`
    )
  }

  if (
    reason === ENUM_REPORT_REASON.OTHER &&
    description.length < REPORT_DESCRIPTION_MIN_LENGTH_FOR_OTHER
  ) {
    return failure('VALIDATION_ERROR', '사유를 기타로 고르면 상세 설명을 입력해달라.')
  }
  // #endregion

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return failure('UNAUTHORIZED')

  // #region 자기 신고 차단
  if (targetType === ENUM_REPORT_TARGET_TYPE.USER && targetId === user.id) {
    return failure('SELF_ACTION', '자기 자신은 신고할 수 없다.')
  }

  if (targetUserId && targetUserId === user.id) {
    return failure('SELF_ACTION', '자기가 쓴 글은 신고할 수 없다.')
  }
  // #endregion

  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId.trim(),
      // 사용자 신고는 대상 자체가 사용자다
      target_user_id:
        targetType === ENUM_REPORT_TARGET_TYPE.USER ? targetId.trim() : targetUserId,
      reason,
      description: description.length > 0 ? description : null,
    })
    .select('id')
    .single()

  // 중복 신고(unique reporter_id + target_type + target_id)는 오류가 아니라 안내 대상이다
  if (error?.code === '23505') {
    return success({ reportId: null, alreadyReported: true })
  }

  if (error) {
    return handleSupabaseError(error, { logPrefix: '[신고 접수]' })
  }

  return success({ reportId: data.id, alreadyReported: false })
}
