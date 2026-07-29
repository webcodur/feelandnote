SELECT
  c.id,
  c.type,
  c.external_source,
  c.external_id,
  c.user_count,
  cl.locale,
  cl.title,
  cl.creator,
  cl.isbn
FROM public.contents c
LEFT JOIN public.content_locales cl ON cl.content_id = c.id
WHERE c.external_id IN (
    'spotify-6XAGnK6Cviwpvlzjjbe7qZ',
    '6XAGnK6Cviwpvlzjjbe7qZ',
    '9791128823107'
  )
   OR cl.isbn = '9791128823107'
   OR lower(cl.title) IN (
     lower('Il Parnaso confuso'),
     lower('혼란에 빠진 파르나소스'),
     lower('유종원 시선'),
     lower('柳宗元詩選')
   )
ORDER BY c.id, cl.locale;
