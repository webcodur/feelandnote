-- Retire the former figure-book relationship. Preserve catalog and reading records.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.figure_book_characters IN SHARE ROW EXCLUSIVE MODE;
DO $guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.figure_book_characters r
    WHERE r.relation_type = 'related' AND NOT EXISTS (
      SELECT 1 FROM (VALUES
('8fe7d74d-b743-4d4b-bfbc-167889e4dc45'::uuid, '9b99b459-beb1-5061-a38b-5c4a9119882d'),
('b8c2d865-b6c4-429d-8713-0175e316a8a2'::uuid, 'b4e747ab-ef2a-45eb-959a-d24cfb35d422'),
('af8cb413-2360-4c7a-af2f-7a4df5d80b56'::uuid, '9425ff96-0832-48c7-a1fa-b16b159317e8'),
('b956904f-6ab3-49f0-b254-0137a17a4685'::uuid, 'ac8608af-3229-50e3-a47e-02fed77fa004'),
('def48a1c-e095-4f72-9efb-4cd3cca3f752'::uuid, 'e601261f-6a2d-4abd-8352-ec176c0d5250'),
('25bb7c39-eb77-4cb3-88fd-04c904975adf'::uuid, '47dcbf0b-b942-4e97-9c2f-73e07e0ef66a'),
('43716799-e939-4a17-9de2-5d19bdda9e4e'::uuid, 'e29b3b1e-09fa-4e56-9390-f245bc8f43db'),
('8f1820a6-ede6-4fec-8181-e8e96f535657'::uuid, 'df094f0f-db6b-458f-99bf-66ffdb45de30'),
('52cec583-e239-455d-bacb-948c6ea04fe9'::uuid, '68df6b2b-863f-469c-b854-375ba40de5c0'),
('6690ac96-6a06-475f-95d6-5015d030527a'::uuid, 'f9cca5e0-f0b1-4111-b111-27a35905a8ab'),
('7057df05-dd84-4cb6-87ee-6b72008a9e2e'::uuid, 'e61ecc5e-2d11-528a-b4c5-383ee29d1de4'),
('bbedfaf2-2e89-46ea-9c51-54d227638987'::uuid, '359a096c-bdb9-48c2-8360-40b3ef549c12'),
('cdb70450-2dda-4378-bf8c-09e3134c6ee8'::uuid, '1bff779e-4787-4a8d-92ef-bb3e39488347'),
('e4d90f51-3183-4664-a1d9-5a5b5fd5bfe6'::uuid, 'd4db8b42-3906-427f-8cb5-4486ee274540'),
('fe38edf7-b434-4b95-920f-4025e99aca0a'::uuid, '88b3a8dd-39a2-5b0e-acb7-a652cf1935d1'),
('f9c85a7c-73a9-4174-938f-c666f73c2112'::uuid, 'b5bfef29-0c5b-5f4b-9e6b-78962894b365'),
('f895c45f-d7bf-4c2d-b971-f832f0a211d7'::uuid, '4d20afb5-0b9c-551b-a0d7-49f8bb9afbca'),
('75742ec1-2af7-423e-835d-108ad8662178'::uuid, '3da67591-29da-5c1b-91b1-e394c00ef21d'),
('124a2773-3467-4d79-bbf1-56cc3343da0f'::uuid, 'e70f414e-1bb8-5b4e-bc95-7b8ab60b9521'),
('d70a863a-c228-4803-98fc-50fbbb7dc8e4'::uuid, '790e83c2-c9ca-4cb4-bf5b-aae2b2c270d0'),
('bf055eb6-efbe-429d-b2ba-bb945c5b82db'::uuid, 'aa0d0fab-50da-4daa-abb8-c5a2d3950cb4'),
('bf055eb6-efbe-429d-b2ba-bb945c5b82db'::uuid, 'c6316208-8f63-4b64-abdf-cac45f495fd6'),
('5da29faf-87af-4824-ac11-8caaf10e8521'::uuid, '0818cbb2-d0f5-43d0-b57d-cb3c6d0522bd'),
('228de020-0867-49e5-b49c-91d618836ada'::uuid, '951fe741-2d7b-431c-9646-f09766d2facb'),
('8beb674d-cf49-4d51-bfa5-391ac2caa10e'::uuid, '561f07f4-700f-5e8b-9232-c8faeeceb7e0'),
('af278d21-93fb-4539-9a32-4586b6a2f6df'::uuid, '6b5fe38c-f15e-5947-adf3-f0f919b4fe3c'),
('95d56c56-1fa5-48df-9f41-7cdd8478be62'::uuid, '2432331c-9aca-5eaa-914e-eb4705684885'),
('ae628456-9c22-4267-9ffa-64c71d7a08a7'::uuid, 'feebcec4-0fdd-56d1-9f80-c3954af5e621'),
('ae628456-9c22-4267-9ffa-64c71d7a08a7'::uuid, '773a6565-f0da-5cae-85a7-8a24dd0c735f'),
('293613d1-0d23-4346-b4e3-cbf999561e18'::uuid, '19172319-55ea-5e01-a9dd-cc42b40f1cb5'),
('938d0ad5-57c2-4b5a-9d72-ff768889cfd5'::uuid, '1e762571-69a5-4120-91ab-18d97f552ee7'),
('fb4b0765-06cd-48dc-9a03-07f93addcb32'::uuid, 'ad2e6a58-cdc7-4ab7-a7ab-c828d06b237a'),
('1aad114e-b378-4554-b504-198058dcf119'::uuid, 'c50edf97-4d9c-5142-aecc-7ebe547c32b6'),
('648b6950-7002-4d28-a121-20acf7ca2000'::uuid, 'c4e14745-9889-5cd4-ba9b-2e1528841d53')
      ) reviewed(celeb_id, content_id)
      WHERE reviewed.celeb_id = r.celeb_id AND reviewed.content_id = r.content_id
    )
  ) THEN RAISE EXCEPTION 'Unreviewed obsolete figure-book relationship';
  END IF;
END;
$guard$;
-- Title collision and influence/translation/continuation links do not establish appearance.
DELETE FROM public.figure_book_characters r
USING (VALUES
('def48a1c-e095-4f72-9efb-4cd3cca3f752'::uuid, 'e601261f-6a2d-4abd-8352-ec176c0d5250'),
('25bb7c39-eb77-4cb3-88fd-04c904975adf'::uuid, '47dcbf0b-b942-4e97-9c2f-73e07e0ef66a'),
('43716799-e939-4a17-9de2-5d19bdda9e4e'::uuid, 'e29b3b1e-09fa-4e56-9390-f245bc8f43db'),
('8f1820a6-ede6-4fec-8181-e8e96f535657'::uuid, 'df094f0f-db6b-458f-99bf-66ffdb45de30'),
('6690ac96-6a06-475f-95d6-5015d030527a'::uuid, 'f9cca5e0-f0b1-4111-b111-27a35905a8ab'),
('d70a863a-c228-4803-98fc-50fbbb7dc8e4'::uuid, '790e83c2-c9ca-4cb4-bf5b-aae2b2c270d0'),
('bf055eb6-efbe-429d-b2ba-bb945c5b82db'::uuid, 'aa0d0fab-50da-4daa-abb8-c5a2d3950cb4'),
('bf055eb6-efbe-429d-b2ba-bb945c5b82db'::uuid, 'c6316208-8f63-4b64-abdf-cac45f495fd6'),
('5da29faf-87af-4824-ac11-8caaf10e8521'::uuid, '0818cbb2-d0f5-43d0-b57d-cb3c6d0522bd'),
('8beb674d-cf49-4d51-bfa5-391ac2caa10e'::uuid, '561f07f4-700f-5e8b-9232-c8faeeceb7e0')
) invalid(celeb_id,content_id)
WHERE r.celeb_id=invalid.celeb_id AND r.content_id=invalid.content_id AND r.relation_type='related';
-- Shadow Moon credits George Lucas and Chris Claremont as coauthors.
-- https://books.google.com/books?id=01XKgiuFbMAC
UPDATE public.figure_book_characters SET relation_type='authored', description=NULL, description_en=NULL
WHERE celeb_id='124a2773-3467-4d79-bbf1-56cc3343da0f'::uuid AND content_id='e70f414e-1bb8-5b4e-bc95-7b8ab60b9521' AND relation_type='related';
UPDATE public.figure_book_characters SET relation_type='appearance', description=NULL, description_en=NULL
WHERE relation_type='related';
ALTER TABLE public.figure_book_characters DROP CONSTRAINT IF EXISTS fiction_source_characters_relation_type_check;
ALTER TABLE public.figure_book_characters DROP CONSTRAINT IF EXISTS figure_book_characters_relation_type_check;
ALTER TABLE public.figure_book_characters ADD CONSTRAINT figure_book_characters_relation_type_check
CHECK (relation_type IN ('appearance','authored'));
DO $constraint$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.figure_book_characters'::regclass AND conname='fiction_source_characters_related_description_check') THEN
  ALTER TABLE public.figure_book_characters RENAME CONSTRAINT fiction_source_characters_related_description_check TO figure_book_characters_description_check;
 END IF;
END;
$constraint$;
DO $rpc$
DECLARE body text;
BEGIN
 SELECT pg_get_functiondef('public.set_figure_book_relations(text,jsonb)'::regprocedure) INTO body;
 body := replace(body, '''appearance'', ''related'', ''authored''', '''appearance'', ''authored''');
 body := replace(body, 'appearance|related|authored', 'appearance|authored');
 EXECUTE body;
 IF EXISTS (SELECT 1 FROM public.figure_book_characters WHERE relation_type NOT IN ('appearance','authored')) THEN
  RAISE EXCEPTION 'Unexpected figure-book relationship after migration';
 END IF;
END;
$rpc$;
NOTIFY pgrst, 'reload schema';
COMMIT;

