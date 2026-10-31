import { CACHE_TAGS, itemTag } from '@feelandnote/shared/constants/cache-tags'

/** 같은 회원의 공개 목록과 상태별 개수를 함께 갱신하는 식별자. */
export const memberContentCacheId = (memberId: string) => `member-${memberId}`
export const memberContentCacheTag = (memberId: string) => itemTag(CACHE_TAGS.CONTENTS, memberContentCacheId(memberId))
