SELECT
  p.id,
  p.slug,
  p.nickname,
  p.nickname_en,
  to_jsonb(p)->>'modifier' AS modifier,
  to_jsonb(p)->>'speech_tone' AS speech_tone,
  to_jsonb(p)->>'avatar_url' AS avatar_url
FROM public.profiles p
WHERE p.id IN (
  '78c35399-1a5f-4332-ae3d-ae2db7f425d9'::uuid,
  'a707b645-a310-4c05-a43c-7412a2ffffb8'::uuid
)
ORDER BY p.slug;
