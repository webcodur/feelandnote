import 'server-only'

import { cache } from 'react'
import { connection } from 'next/server'
import { createStaticClient } from '@/lib/db/static'
import { SUPPORT_PRODUCT_KINDS, type SupportProduct } from '@/constants/supportProducts'
import type { Database } from '@/types/database.generated'

type CommerceProductRow = Database['public']['Tables']['commerce_products']['Row']

function toProduct(row: CommerceProductRow): SupportProduct {
  const kind = SUPPORT_PRODUCT_KINDS.find(kind => kind === row.kind)
  if (!kind) throw new Error(`Unknown commerce product kind: ${row.kind}`)

  return {
    kind,
    name: row.name,
    size: row.size_label,
    description: row.description ?? undefined,
    pair: row.pair_key ?? undefined,
    productUrl: row.product_url,
    imageUrl: row.image_url,
    affiliateUrl: row.affiliate_url,
    offer: {
      price: row.price,
      currency: row.currency,
      checkedAt: row.checked_at,
      delivery: row.delivery,
      reviewCount: row.review_count,
      rating: row.rating ?? undefined,
      monthlyPurchaseCount: row.monthly_purchase_count ?? undefined,
      priceCondition: row.price_condition ?? undefined,
    },
  }
}

/** 상품 수정은 다음 페이지 요청에 반영한다. 요청 사이에 목록을 캐시하지 않는다. */
export const getCommerceProducts = cache(async (locale: 'ko' | 'en', collection: 'support' | 'shop'): Promise<SupportProduct[]> => {
  await connection()
  const { data, error } = await createStaticClient()
    .from('commerce_products')
    .select('*')
    .eq('collection', collection)
    .eq('locale', locale)
    .eq('is_active', true)
    .order('sort_order')
    .order('id')
    .returns<CommerceProductRow[]>()

  if (error) throw new Error(`Failed to load commerce products: ${error.message}`)
  return (data ?? []).map(toProduct)
})
