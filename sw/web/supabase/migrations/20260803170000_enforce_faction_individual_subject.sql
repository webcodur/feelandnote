-- faction_people는 자연인 또는 하나의 이름·행위 주체를 가진 개별 허구 인물만 담는다.
-- 회사·조직·제품·기계·기체·부대·종족·듀오는 faction_groups와 미디어 문맥으로 관리한다.

create or replace function public.assert_faction_individual_subject()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_name text := lower(trim(coalesce(new.name, '')));
  v_name_en text := lower(trim(coalesce(new.name_en, '')));
begin
  if v_name = '' then
    raise exception 'faction_people.name은 비울 수 없다';
  end if;

  if new.name ~ '(&|[[:space:]]/[[:space:]])'
     or coalesce(new.name_en, '') ~ '(&|[[:space:]]/[[:space:]])'
     or new.name ~ '(형제|자매|족$|조직|단체|집단|협회|재단|위원회|교단|부대|특임단|군단|함대|자주포|전투기|폭격기|미사일|전차|로봇)'
     or coalesce(new.name_en, '') ~* '\m(brothers|sisters|twins|collective|organization|association|foundation|committee|systems|technologies|motors|airlines|airways|corporation|company|group|team|brigade|battalion|missile|bomber|fighter aircraft|tank|robot|harpies|sirens|lotus-eaters|laestrygonians)\M'
     or v_name = any(array[
       'waymo','tesla (fsd)','cruise','boeing','airbus','c919','shield ai','bae systems','rheinmetall',
       'dji','skydio','nuscale','terrapower','x-energy','commonwealth fusion','helion energy','tae technologies',
       'quantumscape','catl','byd','rivian','lucid motors','lg에너지솔루션','panasonic','cia','mi6 (sis)',
       'mossad','sas','devgru (seal team 6)','어나니머스','럴즈섹','다크사이드','죽은 소의 교단',
       '하르피이아','라이스트뤼고네스','라이스트뤼고네스족','세이렌','로토스파고스족','기주키의 형제들'
     ])
     or v_name ~ '^(f-[0-9]|b-[0-9]|k[29]([^[:alnum:]]|$)|m1([^[:alnum:]]|$)|falcon (9|heavy)$|starship$|dragon$|new (shepard|glenn)$|saturn v$|sls$|atlas v$|vulcan centaur$|electron$|neutron$|figure [0-9]|neo beta$|unitree g1$)'
  then
    raise exception 'faction_people에는 개별 인물만 등록할 수 있다: %. 회사·조직·제품·기계·부대·집단은 faction_groups로 관리하라', new.name;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_faction_people_individual_subject on public.faction_people;
create trigger trg_faction_people_individual_subject
before insert or update of name, name_en on public.faction_people
for each row execute function public.assert_faction_individual_subject();

comment on function public.assert_faction_individual_subject() is
  'faction_people에 명백한 회사·조직·집단·기계·제품 행이 들어오는 것을 차단한다. 의미 경계는 팩션 UI의 개별 인물 확인과 함께 적용한다.';
