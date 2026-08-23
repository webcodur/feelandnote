import {
  CACHE_TAGS,
  domainRevalidationTags,
  revalidationApiPathForTags,
} from '@feelandnote/shared/constants/cache-tags'

/** 활성화 일괄 반영은 인물 관련 상세 전량 요청이므로 versioned bulk endpoint만 사용한다. */
export function activationRevalidationRequest() {
  const tags = domainRevalidationTags([
    CACHE_TAGS.CELEBS,
    CACHE_TAGS.DIALOGUES,
    CACHE_TAGS.SPECTRUM,
    CACHE_TAGS.TAGS,
  ])
  return { tags, endpoint: revalidationApiPathForTags(tags) }
}
