import { cache } from 'react'
import { checkAdmin } from './checkAdmin'
import { createClient, getRequestUser } from '@/lib/db/server'

// member_profiles의 「주인장」 계정. 다른 최고 관리자에게도 미공개 장면을 열지 않는다.
const SITE_OWNER_ID = '5e1d704d-c4fc-46c7-a595-513ceeac5bf2'

/** 인증은 공유 데이터 캐시 밖에서, 현재 요청의 세션으로만 판단한다. */
export const canPreviewScenes = cache(async (): Promise<boolean> => {
  const { data: { user }, error } = await getRequestUser()
  if (error || user?.id !== SITE_OWNER_ID) return false
  const admin = await checkAdmin(await createClient())
  return admin.success && admin.role === 'super_admin'
})
