begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.fiction_source_products
  drop constraint if exists fiction_source_products_coupang_verification_check;

alter table public.fiction_source_products
  add constraint fiction_source_products_coupang_verification_check
  check (
    platform <> 'coupang'
    or (
      product_id is not null
      and product_url ~ '^https://(www\.)?coupang\.com/vp/products/[0-9]+'
      and substring(product_url from '/vp/products/([0-9]+)') = product_id
      and affiliate_url ~ '^https://link\.coupang\.com/a/[A-Za-z0-9]+/?$'
      and jsonb_array_length(quality_evidence) > 0
      and checked_at is not null
    )
  );

commit;
