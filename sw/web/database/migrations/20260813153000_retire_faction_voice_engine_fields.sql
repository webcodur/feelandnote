-- 팩션 음성 공급자는 별도 엔진 필드가 아니라 ElevenLabs voice ID 존재 여부로 판정한다.
-- Gemini 모델은 합성 요청 시에만 선택하므로 과거 JSONB 엔진 표기를 모두 폐기한다.

with affected_episodes as (
  select distinct faction_groups.episode_id
  from public.faction_people
  join public.faction_clusters
    on faction_clusters.id = faction_people.cluster_id
  join public.faction_groups
    on faction_groups.id = faction_clusters.group_id
  where faction_people.data ?| array[
    'quoteEngine',
    'quoteEngineEn',
    'epithetEngine',
    'epithetEngineEn'
  ]::text[]
)
update public.faction_episodes
set updated_at = now()
from affected_episodes
where faction_episodes.id = affected_episodes.episode_id;

update public.faction_people
set data = data - array[
  'quoteEngine',
  'quoteEngineEn',
  'epithetEngine',
  'epithetEngineEn'
]::text[]
where data ?| array[
  'quoteEngine',
  'quoteEngineEn',
  'epithetEngine',
  'epithetEngineEn'
]::text[];

-- 공통 나레이터는 에피소드 JSONB 안에 중첩돼 있다. 현재 저장 경로의 네 키도 함께 지운다.
update public.faction_episodes
set data = data
  #- '{narrator,logline,quoteEngine}'
  #- '{narrator,logline,quoteEngineEn}'
  #- '{narrator,logline,epithetEngine}'
  #- '{narrator,logline,epithetEngineEn}',
  updated_at = now()
where (data #> '{narrator,logline}') ?| array[
  'quoteEngine',
  'quoteEngineEn',
  'epithetEngine',
  'epithetEngineEn'
]::text[];
