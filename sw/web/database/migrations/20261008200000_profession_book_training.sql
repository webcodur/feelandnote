-- 직업 훈련 / 직업 수업 / 직업 탐구. 코드 허용값: packages/shared/src/constants/profession-books.ts
-- 기존 작품·선정 이유·관계를 유지하고 분류와 훈련 읽기 순서만 정비한다.
-- 공통 과학 4권은 Kakao/OpenLibrary로 검증·등록된 기존 content_id를 참조한다.
BEGIN;
LOCK TABLE public.profession_book_picks IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE public.profession_book_picks DROP CONSTRAINT IF EXISTS profession_book_picks_category_check;
ALTER TABLE public.profession_book_picks ADD CONSTRAINT profession_book_picks_category_check
  CHECK (category IN ('train', 'become', 'about'));

CREATE TEMP TABLE profession_training_changes (
  profession text, old_category text, new_category text, content_id text,
  old_sort integer, new_sort integer, source_url text,
  PRIMARY KEY (profession, content_id)
) ON COMMIT DROP;
INSERT INTO profession_training_changes VALUES
  ('leader', 'become', 'train', '51255fb5-315a-461e-b8e6-af84aa5ed5f9', 64, 1, 'https://search.daum.net/search?w=bookpage&bookId=5060316&q=%ED%94%BC%ED%84%B0+%EB%93%9C%EB%9F%AC%EC%BB%A4+%EC%9E%90%EA%B8%B0%EA%B2%BD%EC%98%81%EB%85%B8%ED%8A%B8'),
  ('leader', 'become', 'train', '4e880e7a-1071-4983-9608-0eb9fb663b3d', 1, 2, 'https://www.penguinrandomhouse.com/books/72467/high-output-management-by-andrew-s-grove-former-chairman-and-ceo-of-intel/'),
  ('leader', 'become', 'train', '81992acc-4c81-42db-8f61-0719406a4ced', 0, 3, 'https://www.leadershipchallenge.com/five-practices/books'),
  ('politician', 'become', 'train', '315bf118-4e16-471a-974b-f7a0d3f67063', 69, 1, 'https://www.penguinrandomhouse.com/books/324551/getting-to-yes-by-roger-fisher-and-william-ury/9781101539545/'),
  ('politician', 'become', 'train', '5e93115b-e3b4-5a72-ae3c-546d4cecd084', 71, 2, 'https://search.daum.net/search?w=bookpage&bookId=6749588&q=%EC%8B%B8%EC%9A%B0%EC%A7%80+%EC%95%8A%EA%B3%A0+%EC%9D%B4%EA%B8%B0%EB%8A%94+%EA%B8%B0%EC%88%A0'),
  ('commander', 'become', 'train', '0925e1cc-92c1-4b74-b691-f125bde6ccde', 8, 1, 'https://www.penguinrandomhouse.com/books/600221/the-art-of-war-by-sun-tzu-translated-and-introduced-by-peter-harris/'),
  ('commander', 'become', 'train', 'e4d868f1-a867-419c-a078-23bc5910697a', 9, 2, 'https://www.penguinrandomhouse.com/books/28520/on-war-by-carl-von-clausewitz-translated-by-michael-howard-and-peter-paret-introduction-by-michael-howard/'),
  ('commander', 'become', 'train', '05caac08-29c6-4c8d-b451-dcfcdd1c3573', 77, 3, 'https://search.daum.net/search?w=bookpage&bookId=3753288&q=%EC%A0%84%EB%9E%B5%EB%A1%A0'),
  ('commander', 'become', 'train', '9b1ba670-72e9-4800-a34c-19fdcb88c5b8', 180, 4, 'https://search.daum.net/search?w=bookpage&bookId=5035038&q=%EC%A0%84%EB%9E%B5%EC%9D%98+%EA%B1%B0%EC%9E%A5%EC%9C%BC%EB%A1%9C%EB%B6%80%ED%84%B0+%EB%B0%B0%EC%9A%B0%EB%8A%94+%EC%A2%8B%EC%9D%80+%EC%A0%84%EB%9E%B5+%EB%82%98%EC%81%9C+%EC%A0%84%EB%9E%B5'),
  ('entrepreneur', 'become', 'train', '6a9fabf7-8597-4b0b-a4c0-5e1cf7b7ed6b', 183, 1, 'https://search.daum.net/search?w=bookpage&bookId=6545154&q=%ED%8D%BC%EC%8A%A4%EB%84%90+MBA%2810%EC%A3%BC%EB%85%84+%EA%B8%B0%EB%85%90+%EC%A6%9D%EB%B3%B4%ED%8C%90%29'),
  ('entrepreneur', 'become', 'train', 'd7284ef0-6027-437d-9028-5cb8b8b35ee4', 87, 2, 'https://openlibrary.org/isbn/9781492180746'),
  ('entrepreneur', 'become', 'train', 'a15d0aef-9abc-44d0-aa75-c5bb4d023445', 84, 3, 'https://www.strategyzer.com/library/business-model-generation'),
  ('entrepreneur', 'become', 'train', 'a3cb2080-f395-46fa-9d7a-d0abd9bea3b7', 85, 4, 'https://search.daum.net/search?w=bookpage&bookId=837987&q=%EA%B8%B0%EC%97%85+%EC%B0%BD%EC%97%85%EA%B0%80+%EB%A7%A4%EB%89%B4%EC%96%BC'),
  ('entrepreneur', 'become', 'train', 'b1484837-3252-4c0a-8739-8a044f0fb6de', 182, 5, 'https://search.daum.net/search?w=bookpage&bookId=7073133&q=%EC%8A%A4%ED%83%80%ED%8A%B8%EC%97%85+%EB%B0%94%EC%9D%B4%EB%B8%94%2810%EC%A3%BC%EB%85%84+%ED%99%95%EC%9E%A5%EC%A6%9D%EB%B3%B4%ED%8C%90%29'),
  ('investor', 'become', 'train', 'c21ca51c-a7ab-4c8d-b842-46f3f7f6a682', 16, 1, 'https://jasonzweig.com/books/the-intelligent-investor/'),
  ('investor', 'become', 'train', 'a870ce31-9656-4417-8a24-e626303f7419', 17, 2, 'https://www.wiley-vch.de/en/areas-interest/finance-economics-law/common-stocks-and-uncommon-profits-and-other-writings-978-0-471-44550-0'),
  ('investor', 'become', 'train', 'cbaabc51-53e7-4d6a-b3f7-26d7d28b1086', 93, 3, 'https://search.daum.net/search?w=bookpage&bookId=1212807&q=%EC%A6%9D%EA%B6%8C%EB%B6%84%EC%84%9D'),
  ('scientist', 'become', 'train', '7c9b0c46-a855-4f36-a409-1d952c334562', 184, 5, 'https://search.daum.net/search?w=bookpage&bookId=6222190&q=%ED%95%99%EC%88%A0+%EC%97%B0%EA%B5%AC+%EC%B2%AB%EA%B1%B8%EC%9D%8C'),
  ('scientist', 'become', 'train', 'a900475d-bbd8-4ab0-b12b-5f5ffb6e4a75', 21, 6, 'https://press.uchicago.edu/ucp/books/book/chicago/C/bo215874008'),
  ('scientist', 'become', 'train', 'c5bc4142-1ca7-4895-b3a6-1cad9a2cb78a', 185, 7, 'https://search.daum.net/search?w=bookpage&bookId=983319&q=%EB%B9%84%ED%8C%90%EC%A0%81+%EC%82%AC%EA%B3%A0%EC%99%80+%EA%B3%BC%ED%95%99+%EA%B8%80%EC%93%B0%EA%B8%B0'),
  ('scientist', 'become', 'train', 'f5aa0851-0396-492d-8b2f-71908a57970b', 101, 8, 'https://openlibrary.org/books/OL28980192M'),
  ('humanities_scholar', 'become', 'train', '7c6751a6-1e2c-4a16-a081-23e37be0554d', 24, 1, 'https://www.simonandschuster.com/books/How-to-Read-a-Book/Mortimer-J-Adler/9780671212094'),
  ('humanities_scholar', 'become', 'train', 'd3e82bda-834a-412b-a084-4f64ce7db189', 187, 2, 'https://search.daum.net/search?w=bookpage&bookId=5038139&q=%EB%85%BC%EC%A6%9D%EC%9D%98+%EA%B8%B0%EC%88%A0'),
  ('humanities_scholar', 'become', 'train', '7c9b0c46-a855-4f36-a409-1d952c334562', 186, 3, 'https://search.daum.net/search?w=bookpage&bookId=6222190&q=%ED%95%99%EC%88%A0+%EC%97%B0%EA%B5%AC+%EC%B2%AB%EA%B1%B8%EC%9D%8C'),
  ('humanities_scholar', 'become', 'train', 'a900475d-bbd8-4ab0-b12b-5f5ffb6e4a75', 25, 4, 'https://press.uchicago.edu/ucp/books/book/chicago/C/bo215874008'),
  ('humanities_scholar', 'become', 'train', '2a238e5f-c4ec-4973-813b-416f96350ca6', 106, 5, 'https://openlibrary.org/books/OL56976514M'),
  ('humanities_scholar', 'become', 'train', 'd654b2b7-e972-52fa-9703-d8d727ffab6b', 108, 6, 'https://mitpress.mit.edu/9780262527132/how-to-write-a-thesis/'),
  ('humanities_scholar', 'become', 'train', '24b453fb-1d8b-419f-b09a-2ed2f67a6dd8', 110, 7, 'https://search.daum.net/search?w=bookpage&bookId=1445538&q=%EC%98%81%EC%96%B4+%EA%B8%80%EC%93%B0%EA%B8%B0%EC%9D%98+%EA%B8%B0%EB%B3%B8%28THE+ELEMENTS+OF+STYLE%29'),
  ('social_scientist', 'become', 'train', '64bf3b2e-96a6-4c23-9ad9-046e42019c4e', 117, 1, 'https://search.daum.net/search?w=bookpage&bookId=862452&q=%EC%82%AC%ED%9A%8C%EC%A1%B0%EC%82%AC%EB%B0%A9%EB%B2%95%EB%A1%A0'),
  ('social_scientist', 'become', 'train', 'eefe9b12-2c43-41f0-86ee-7f30d9dd4860', 115, 2, 'https://catalog.princeton.edu/catalog/SCSB-14174026'),
  ('social_scientist', 'become', 'train', 'f2f35e45-7342-4fc7-8b8a-ec3b4ec37614', 116, 3, 'https://search.daum.net/search?w=bookpage&bookId=5613915&q=%EC%82%AC%EB%A1%80%EC%97%B0%EA%B5%AC%EB%B0%A9%EB%B2%95'),
  ('social_scientist', 'become', 'train', 'a900475d-bbd8-4ab0-b12b-5f5ffb6e4a75', 28, 4, 'https://press.uchicago.edu/ucp/books/book/chicago/C/bo215874008'),
  ('social_scientist', 'become', 'train', 'f78e130a-f6db-475a-ace2-cb84ec801d91', 118, 5, 'https://search.daum.net/search?w=bookpage&bookId=575514&q=%EA%B3%84%EB%9F%89%EA%B2%BD%EC%A0%9C%ED%95%99'),
  ('director', 'become', 'train', '95eee06d-208c-40fe-ab57-b3f58d965572', 127, 1, 'https://search.daum.net/search?w=bookpage&bookId=1475288&q=%EC%98%81%ED%99%94+%EC%98%88%EC%88%A0%28Film+Art%29%28%EC%BB%AC%EB%9F%AC%ED%8C%90%29'),
  ('director', 'become', 'train', 'e1be0d6d-daed-4d0f-b741-5f132d0f6673', 125, 2, 'https://search.daum.net/search?w=bookpage&bookId=1158928&q=Story%3A+%EC%8B%9C%EB%82%98%EB%A6%AC%EC%98%A4+%EC%96%B4%EB%96%BB%EA%B2%8C+%EC%93%B8+%EA%B2%83%EC%9D%B8%EA%B0%80'),
  ('director', 'become', 'train', '39efe8cb-9db4-49b1-90c5-38b3d316f868', 33, 3, 'https://mwp.com/product/film-directing-shot-shot-25th-anniversary-edition-visualizing-concept-screen/'),
  ('director', 'become', 'train', '6dda116f-de8a-455d-83de-dcbbb2d1ab2e', 123, 4, 'https://www.judithweston.com/web/'),
  ('director', 'become', 'train', '7dd1fc2d-0d3e-46d2-9c19-fe1f4d71e1a9', 124, 5, 'https://search.daum.net/search?w=bookpage&bookId=1377610&q=%EB%88%88+%EA%B9%9C%EB%B0%95%ED%95%A0+%EC%82%AC%EC%9D%B4%282%ED%8C%90%29'),
  ('musician', 'become', 'train', 'b2642c5d-77ac-4234-91df-68eb81f61123', 189, 1, 'https://search.daum.net/search?w=bookpage&bookId=1284230&q=%ED%99%94%EC%84%B1%ED%95%99'),
  ('musician', 'become', 'train', '02c70566-a142-4ca2-a2e1-e4ed000845ab', 190, 2, 'https://search.daum.net/search?w=bookpage&bookId=5061160&q=%EC%8B%A4%EC%9A%A9%EC%9D%8C%EC%95%85+%ED%99%94%EC%84%B1%ED%95%99'),
  ('musician', 'become', 'train', 'c83eec17-290b-4143-8d66-c9c23a752874', 36, 3, 'https://www.penguinrandomhouse.com/books/670253/how-to-write-one-song-by-jeff-tweedy/'),
  ('musician', 'become', 'train', 'eb6a2b5b-d18e-4e03-b05c-e30b1ec3b4e7', 191, 4, 'https://search.daum.net/search?w=bookpage&bookId=3943034&q=%EA%B9%80%EB%8F%84%ED%9B%88+%EC%9E%91%EA%B3%A1%EB%B2%95'),
  ('musician', 'become', 'train', 'ff4ca6ba-2293-4550-bcfc-663e880325ba', 134, 5, 'https://openlibrary.org/books/OL22658210M'),
  ('musician', 'become', 'train', '28e60455-5140-44ef-b792-3c271cf7d6eb', 37, 6, 'https://wwnorton.co.uk/books/9780393283730-the-study-of-orchestration-0675df45-d3d3-415e-9e42-9c331b5c46c7'),
  ('visual_artist', 'become', 'train', 'a5a3d061-26cc-46c4-8097-737e5436dc42', 40, 1, 'https://www.penguinrandomhouse.com/books/310367/drawing-on-the-right-side-of-the-brain-by-betty-edwards/'),
  ('visual_artist', 'become', 'train', '4af2504a-c79e-4e47-a4d1-cca25394e47e', 141, 2, 'https://search.daum.net/search?w=bookpage&bookId=1108764&q=%EC%9D%B8%EB%AC%BC%ED%99%94%28%EC%95%8C%EA%B8%B0%EC%89%AC%EC%9A%B4%29%282%ED%8C%90%29'),
  ('visual_artist', 'become', 'train', '729e9e82-6fc6-40bc-8f75-7f60a9985703', 41, 3, 'https://yalebooks.yale.edu/book/9780300146936/interaction-of-color/'),
  ('visual_artist', 'become', 'train', 'e6e4b725-9a3a-406f-a124-50c23e7361bf', 142, 4, 'https://publishing.andrewsmcmeel.com/book/color-and-light/'),
  ('author', 'become', 'train', '8d697ea8-5360-42ca-a0ea-91d803079a69', 148, 1, 'https://search.daum.net/search?w=bookpage&bookId=4366667&q=%EB%BC%9B%EC%86%8D%EA%B9%8C%EC%A7%80+%EB%82%B4%EB%A0%A4%EA%B0%80%EC%84%9C+%EC%8D%A8%EB%9D%BC'),
  ('author', 'become', 'train', '817a0a79-e964-4013-8ad8-b16e897f7bff', 147, 2, 'https://search.daum.net/search?w=bookpage&bookId=6835162&q=%EA%B8%80%EC%93%B0%EA%B8%B0+%EC%83%9D%EA%B0%81%EC%93%B0%EA%B8%B0'),
  ('author', 'become', 'train', '7e34f8a9-2581-45b2-b58d-54c46869df62', 149, 3, 'https://www.ursulakleguin.com/steering-the-craft'),
  ('author', 'become', 'train', '6b83b30c-3d4e-4145-abd7-3e1ff935eb1d', 150, 4, 'https://search.daum.net/search?w=bookpage&bookId=5103471&q=%EC%9E%91%EA%B0%80+%EC%88%98%EC%97%85%282018+%EB%A6%AC%EB%94%94%EC%9E%90%EC%9D%B8+%EA%B0%9C%EC%A0%95+%ED%8A%B9%EB%B3%84%ED%8C%90%29'),
  ('actor', 'become', 'train', '1022c98b-c21f-4f57-a8d3-7cb257f8549d', 48, 1, 'https://www.bloomsbury.com/uk/actor-prepares-9781780937335/'),
  ('actor', 'become', 'train', 'ed5eb119-46f1-494c-a23d-91125dd864df', 49, 2, 'https://www.wiley-vch.de/en/areas-interest/hobby-leisure/lifestyles-18lf/popular-culture-18lf1/television-movies-theatre-18lf13/respect-for-acting-978-1-119-91357-3'),
  ('actor', 'become', 'train', '797fb880-1977-4cb8-aa16-3dbdb92f30b3', 153, 3, 'https://openlibrary.org/books/OL1537499M'),
  ('actor', 'become', 'train', '24c47946-fd1d-4d79-b015-93d07e5507d2', 155, 4, 'https://search.daum.net/search?w=bookpage&bookId=702890&q=%EB%B0%B0%EC%9A%B0%EC%97%90%EA%B2%8C%28%EB%AF%B8%ED%95%98%EC%9D%BC+%EC%B2%B4%ED%99%89%EC%9D%98%29'),
  ('actor', 'become', 'train', '523cfdc3-a9df-467a-86dd-9c5f5b0fd3d2', 154, 5, 'https://mdsam.net/meisner-technique-definition/'),
  ('actor', 'become', 'train', 'b271bbf4-c585-5127-a31b-d1a7d39f86aa', 196, 6, 'https://search.daum.net/search?w=bookpage&bookId=715037&q=%EB%A7%88%EC%9D%B4%ED%81%B4+%EC%BC%80%EC%9D%B8%EC%9D%98+%EC%97%B0%EA%B8%B0+%EC%88%98%EC%97%85'),
  ('actor', 'become', 'train', 'bcb1d9e9-c0a5-4888-9775-3e81dd5f6f21', 197, 7, 'https://search.daum.net/search?w=bookpage&bookId=5174800&q=%EC%97%B0%EA%B8%B0%ED%95%98%EC%A7%80+%EC%95%8A%EB%8A%94+%EC%97%B0%EA%B8%B0'),
  ('influencer', 'become', 'train', 'a90154a5-a769-4cd3-a3d9-e4be3590b3ae', 55, 1, 'https://heathbrothers.com/books/made-to-stick/'),
  ('influencer', 'become', 'train', 'a10029d5-bc31-4ba9-934c-e6dd723ce7de', 163, 2, 'https://willbookspub.com/willbook/detail.php?idx=92'),
  ('influencer', 'become', 'train', '53b892f8-981a-4869-a35d-7dbd4f4a7917', 161, 3, 'https://search.daum.net/search?w=bookpage&bookId=5923862&q=%EC%BD%98%ED%85%90%EC%B8%A0+%EB%B0%94%EC%9D%B4%EB%B8%94'),
  ('athlete', 'become', 'train', '2fb7025e-ece3-49b1-a527-de2bd0a99751', 58, 1, 'https://www.penguinrandomhouse.com/books/57757/the-inner-game-of-tennis-50th-anniversary-edition-by-w-timothy-gallwey/9780307758859/'),
  ('athlete', 'become', 'train', '85bd6cfc-5272-4748-babc-ace6b3503c3a', 169, 2, 'https://search.daum.net/search?w=bookpage&bookId=4831959&q=%EB%A7%88%EC%9D%B8%EB%93%9C+%EC%8A%A4%ED%8F%AC%EC%B8%A0'),
  ('athlete', 'become', 'train', 'c46173a2-125b-4984-ba03-49e288bdaa78', 59, 3, 'https://us.humankinetics.com/products/periodization-6th-edition-pdf'),
  ('politician', 'about', 'become', '423ada98-f396-4367-ba98-a513875bc808', 74, 74, 'https://search.daum.net/search?w=bookpage&bookId=3759691&q=%EC%96%B4%EB%96%BB%EA%B2%8C+%EB%AF%BC%EC%A3%BC%EC%A3%BC%EC%9D%98%EB%8A%94+%EB%AC%B4%EB%84%88%EC%A7%80%EB%8A%94%EA%B0%80'),
  ('politician', 'about', 'become', '98c662e9-c546-47b1-968f-b4216250ebe0', 178, 178, 'https://search.daum.net/search?w=bookpage&bookId=350670&q=%EC%A0%95%EC%B9%98+%EC%A7%88%EC%84%9C%EC%9D%98+%EA%B8%B0%EC%9B%90'),
  ('politician', 'about', 'become', '3f2ce20f-d10b-5c15-9fe8-185910f9a588', 179, 179, 'https://search.daum.net/search?w=bookpage&bookId=7212431&q=%EB%AF%B8%EA%B5%AD%EC%9D%98+%EB%AF%BC%EC%A3%BC%EC%A3%BC%EC%9D%98+1'),
  ('commander', 'about', 'become', '82cda999-bd06-4125-b48b-583eb325ee0d', 82, 82, 'https://search.daum.net/search?w=bookpage&bookId=3755622&q=%EC%84%B8%EA%B3%84%EC%A0%84%EC%9F%81%EC%82%AC'),
  ('scientist', 'about', 'become', '7eb19b6a-d973-40a6-bec2-26f332e07cfb', 104, 104, 'https://search.daum.net/search?w=bookpage&bookId=1011222&q=%EA%B3%BC%ED%95%99%ED%98%81%EB%AA%85%EC%9D%98+%EA%B5%AC%EC%A1%B0'),
  ('scientist', 'about', 'become', '5aba36e7-a205-499d-95ca-3a98edaf63fe', 107, 107, 'https://search.daum.net/search?w=bookpage&bookId=5346983&q=%EA%B1%B0%EC%9D%98+%EB%AA%A8%EB%93%A0+%EA%B2%83%EC%9D%98+%EC%97%AD%EC%82%AC%28%EA%B0%9C%EC%97%AD%ED%8C%90%29'),
  ('humanities_scholar', 'about', 'become', 'e3942652-9a5a-4987-90ff-97b636603ab5', 27, 27, 'https://www.penguinrandomhouse.com/books/159790/representations-of-the-intellectual-by-edward-w-said/'),
  ('humanities_scholar', 'about', 'become', '38f901af-0971-454c-a93f-1763f6945dad', 112, 112, 'https://search.daum.net/search?w=bookpage&bookId=541524&q=%EC%99%9C+%EA%B3%A0%EC%A0%84%EC%9D%84+%EC%9D%BD%EB%8A%94%EA%B0%80'),
  ('humanities_scholar', 'about', 'become', 'b568f83a-6701-4644-ac09-df55df880e52', 111, 111, 'https://search.daum.net/search?w=bookpage&bookId=970938&q=%EC%98%A4%EB%A6%AC%EC%97%94%ED%83%88%EB%A6%AC%EC%A6%98'),
  ('humanities_scholar', 'about', 'become', 'ca18921d-e3fe-4295-acd1-c749521eff85', 113, 113, 'https://search.daum.net/search?w=bookpage&bookId=541526&q=%EB%A7%90%EA%B3%BC+%EC%82%AC%EB%AC%BC'),
  ('social_scientist', 'about', 'become', '3625eafd-9436-4d1d-8f36-76d2108dc473', 30, 30, 'https://www.penguinrandomhouse.com/books/12385/invitation-to-sociology-by-peter-l-berger/'),
  ('social_scientist', 'about', 'become', '86a1c4b2-28c7-453a-8ee0-db8aa459d678', 120, 120, 'https://search.daum.net/search?w=bookpage&bookId=6425246&q=%ED%94%84%EB%A1%9C%ED%85%8C%EC%8A%A4%ED%83%84%ED%8A%B8+%EC%9C%A4%EB%A6%AC%EC%99%80+%EC%9E%90%EB%B3%B8%EC%A3%BC%EC%9D%98+%EC%A0%95%EC%8B%A0'),
  ('musician', 'about', 'become', 'f3838f7a-4a2a-456e-bb62-bae881791ae7', 38, 38, 'https://www.oliversacks.com/oliver-sacks-books/musicophilia-oliver-sacks/'),
  ('visual_artist', 'about', 'become', 'dcfafdf5-56ad-4925-9fde-9074f8736867', 42, 42, 'https://www.phaidon.com/en-ca/products/the-story-of-art-16th-edition'),
  ('visual_artist', 'about', 'become', 'aed6c25e-8e66-4087-8274-20710a2a454f', 43, 43, 'https://www.penguinrandomhouse.com/books/324430/ways-of-seeing-by-john-berger/'),
  ('visual_artist', 'about', 'become', '0bc36bf9-0ea0-4e29-986c-5b504972b401', 144, 144, 'https://search.daum.net/search?w=bookpage&bookId=471847&q=%EC%98%88%EC%88%A0%EC%97%90%EC%84%9C%EC%9D%98+%EC%A0%95%EC%8B%A0%EC%A0%81%EC%9D%B8+%EA%B2%83%EC%97%90+%EB%8C%80%ED%95%98%EC%97%AC%28%EC%97%B4%ED%99%94%EB%8B%B9%EB%AF%B8%EC%88%A0%EC%B1%85%EB%B0%A9+010%29'),
  ('author', 'about', 'become', '924ee5b3-4f5b-4b68-845c-56eca6e41fd5', 152, 152, 'https://search.daum.net/search?w=bookpage&bookId=7151891&q=%EC%A0%8A%EC%9D%80+%EC%8B%9C%EC%9D%B8%EC%97%90%EA%B2%8C+%EB%B3%B4%EB%82%B4%EB%8A%94+%ED%8E%B8%EC%A7%80'),
  ('author', 'about', 'become', '51cf4413-7c8a-40f3-b3af-364043c2c22a', 195, 195, 'https://search.daum.net/search?w=bookpage&bookId=714791&q=%EC%A0%8A%EC%9D%80+%EC%86%8C%EC%84%A4%EA%B0%80%EC%97%90%EA%B2%8C+%EB%B3%B4%EB%82%B4%EB%8A%94+%ED%8E%B8%EC%A7%80'),
  ('author', 'about', 'become', '4be15318-307f-4c2a-8a17-dfa217395498', 203, 203, 'https://www.penguinrandomhouse.com/books/212709/the-naive-and-the-sentimental-novelist-by-orhan-pamuk-translated-by-nazim-dikbas/9780307745248/'),
  ('actor', 'about', 'become', '55be804e-918d-432d-9de2-92c2281df76d', 198, 198, 'https://openlibrary.org/books/OL28946895M'),
  ('influencer', 'about', 'become', '8abc86a9-5015-4fec-b155-4a326f7c4c1b', 57, 57, 'https://www.penguinrandomhouse.com/books/231788/the-content-trap-by-bharat-anand/'),
  ('influencer', 'about', 'become', 'b66c5598-c11d-4c55-8e98-d87261f47794', 164, 164, 'https://search.daum.net/search?w=bookpage&bookId=5003509&q=%EC%A3%BC%EB%AA%A9%ED%95%98%EC%A7%80+%EC%95%8A%EC%9D%84+%EA%B6%8C%EB%A6%AC'),
  ('influencer', 'about', 'become', 'be81701d-0981-4854-87c8-baa675796e6b', 168, 168, 'https://search.daum.net/search?w=bookpage&bookId=644806&q=%EC%83%9D%EA%B0%81+%EC%A1%B0%EC%A2%85%EC%9E%90%EB%93%A4'),
  ('athlete', 'about', 'become', '79626c70-3d60-4dd0-8f6d-812828a44d7c', 174, 174, 'https://search.daum.net/search?w=bookpage&bookId=507031&q=%EC%8A%A4%ED%8F%AC%EC%B8%A0+%EC%9C%A0%EC%A0%84%EC%9E%90%28%EC%96%91%EC%9E%A5%EB%B3%B8+HardCover%29'),
  ('commander', 'become', 'about', '06a53965-0106-49dd-90e2-c978826b7a2a', 80, 80, 'https://search.daum.net/search?w=bookpage&bookId=512311&q=%EB%A1%AC%EB%A9%9C+%EB%B3%B4%EB%B3%91%EC%A0%84%EC%88%A0'),
  ('director', 'become', 'about', '4b42e7a2-06a1-4ba9-9259-e2b80672e1c9', 32, 32, 'https://www.penguinrandomhouse.com/books/104488/making-movies-by-sidney-lumet/9780679756606/'),
  ('athlete', 'become', 'about', '36e11238-9b59-4f57-a253-94399ed71ea0', 172, 172, 'https://openlibrary.org/books/OL27197152M');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM profession_training_changes c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.profession_book_picks p
      WHERE p.profession = c.profession AND p.content_id = c.content_id
        AND ((p.category = c.old_category AND p.sort_order = c.old_sort AND p.source_url = c.source_url)
          OR (p.category = c.new_category AND p.sort_order = c.new_sort))
    )
  ) THEN RAISE EXCEPTION '직업 도서가 검토 당시와 달라졌습니다. 변경 대상을 다시 확인하세요.'; END IF;
END $$;

UPDATE public.profession_book_picks p
SET category = c.new_category, sort_order = c.new_sort
FROM profession_training_changes c
WHERE p.profession = c.profession AND p.content_id = c.content_id AND p.category = c.old_category;

INSERT INTO public.profession_book_picks (profession, category, content_id, note, note_en, source_url, sort_order) VALUES
  ('scientist', 'train', '9ca83f8b-d286-5b6a-ab5d-9262b46e54b3', '고교 수준의 함수·대수·삼각함수를 알고 있다면 미분적분부터 시작해 보세요. 극한, 도함수와 적분을 공부하며 변화와 누적량을 수식으로 읽는 기초를 쌓습니다. 다음 물리학 교재를 읽는 데도 도움이 됩니다.', 'Start with calculus if you are comfortable with high-school functions, algebra, and trigonometry. Study limits, derivatives, and integrals to describe change and accumulation mathematically. This foundation also supports the physics book that follows.', 'https://www.kocw.net/home/common/contents/syllabus/1335313_20190917102227277.pdf', 1),
  ('scientist', 'train', '57843e15-98d0-5957-9243-6c4a03547d06', '운동과 힘, 에너지부터 파동과 전자기까지 일반물리학의 공통 기초를 다룹니다. 앞서 익힌 미분적분을 물리 현상에 적용하며 설명과 예제를 따라 읽어 보세요. 특정 공학 분야로 들어가기 전 자연 현상을 수식으로 이해하는 연습입니다.', 'Build a common foundation in physics, from motion, forces, and energy to waves and electromagnetism. Work through the explanations and examples while applying calculus to physical phenomena, before moving into a specialized engineering field.', 'https://www.yes24.com/product/goods/141905954', 2),
  ('scientist', 'train', '0f13457a-bcd6-5d4d-8157-c4483393463b', '원자와 분자, 화학량론과 결합, 반응과 평형을 공부하는 일반화학 교재입니다. 물질의 구조와 변화를 설명하는 기초를 쌓으며, 물리학과 병행해 읽어도 좋습니다. 뒤의 생명과학에서 세포와 대사를 이해할 때 바탕이 됩니다.', 'Study atoms and molecules, stoichiometry, bonding, reactions, and equilibrium. This general chemistry textbook builds a foundation for understanding matter and its transformations. It can be read alongside physics and prepares you for the cellular processes and metabolism in biology.', 'https://www.cengage.com/c/chemistry-10e-zumdahl/zumdahl/decoste/9781305957404/', 3),
  ('scientist', 'train', 'cd8e48ac-8afd-527b-9924-dbb966f8260a', '세포와 대사, 유전과 진화, 생물의 다양성과 생태를 폭넓게 공부하는 생명과학 교재입니다. 기초 화학을 익힌 뒤 생명 현상을 구조와 과정으로 연결해 읽어 보세요. 컴퓨터 과학이나 개별 연구 전공으로 갈라지기 전 공통 기초를 마무리합니다.', 'Study cells, metabolism, genetics, evolution, biological diversity, and ecology. With basic chemistry in place, connect the structures of living systems to the processes that sustain them. This completes the shared science foundation before branching into a research specialty.', 'https://www.pearson.com/en-ca/subject-catalog/p/campbell-biology/P200000007019?view=educator', 4)
ON CONFLICT (profession, category, content_id) DO UPDATE
SET note = EXCLUDED.note, note_en = EXCLUDED.note_en, source_url = EXCLUDED.source_url, sort_order = EXCLUDED.sort_order;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM profession_training_changes c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.profession_book_picks p
      WHERE p.profession = c.profession AND p.content_id = c.content_id
        AND p.category = c.new_category AND p.sort_order = c.new_sort
    )
  ) THEN RAISE EXCEPTION '직업 도서 재분류 검증에 실패했습니다.'; END IF;
END $$;

-- 기존 작품의 빠진 언어판만 보완한다. 반대 언어의 대표 판본은 그대로 유지한다.
CREATE TEMP TABLE profession_locale_repairs AS
SELECT * FROM jsonb_to_recordset($locale$[{"content_id":"55be804e-918d-432d-9de2-92c2281df76d","locale":"ko","title":"스텔라 애들러","creator":"배리 패리스","description":null,"isbn":"9788957864661","publisher":"연극과인간","thumbnail_url":"https://t1.daumcdn.net/lbook/image/767418?timestamp=20241008114119","affiliate_url":null,"sources":{"primary":"kakao_book","title":"https://search.daum.net/search?w=bookpage&bookId=767418&q=%EC%8A%A4%ED%85%94%EB%9D%BC+%EC%95%A0%EB%93%A4%EB%9F%AC","creator":"https://search.daum.net/search?w=bookpage&bookId=767418&q=%EC%8A%A4%ED%85%94%EB%9D%BC+%EC%95%A0%EB%93%A4%EB%9F%AC","isbn":"https://search.daum.net/search?w=bookpage&bookId=767418&q=%EC%8A%A4%ED%85%94%EB%9D%BC+%EC%95%A0%EB%93%A4%EB%9F%AC","publisher":"https://search.daum.net/search?w=bookpage&bookId=767418&q=%EC%8A%A4%ED%85%94%EB%9D%BC+%EC%95%A0%EB%93%A4%EB%9F%AC","thumbnail":"https://search.daum.net/search?w=bookpage&bookId=767418&q=%EC%8A%A4%ED%85%94%EB%9D%BC+%EC%95%A0%EB%93%A4%EB%9F%AC","translators":["정윤경"],"description":"https://dapi.kakao.com/v3/search/book?target=isbn&query=9788957864661"},"verified":true},{"content_id":"76289736-a82e-44f0-94d8-190721216153","locale":"en","title":"Understanding movies","creator":"Louis D. Giannetti","description":null,"isbn":"9780131890985","publisher":"Pearson/Prentice Hall","thumbnail_url":"https://covers.openlibrary.org/b/id/88808-L.jpg","affiliate_url":null,"sources":{"primary":"openlibrary","title":"https://openlibrary.org/books/OL3693687M","creator":"https://openlibrary.org/books/OL3693687M","isbn":"https://openlibrary.org/books/OL3693687M","publisher":"https://openlibrary.org/books/OL3693687M","thumbnail":"https://openlibrary.org/books/OL3693687M","description":"https://openlibrary.org/works/OL550723W"},"verified":true}]$locale$::jsonb) AS r(
  content_id text, locale text, title text, creator text, description text, isbn text,
  publisher text, thumbnail_url text, affiliate_url jsonb, sources jsonb, verified boolean
);
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM profession_locale_repairs r JOIN public.content_locales c USING (content_id, locale)
    WHERE c.isbn IS NOT NULL AND c.isbn IS DISTINCT FROM r.isbn
  ) THEN RAISE EXCEPTION '보완할 언어판이 이미 변경되었습니다.'; END IF;
END $$;
UPDATE public.content_locales c
SET title=r.title, creator=r.creator, description=COALESCE(r.description, c.description), isbn=r.isbn, publisher=r.publisher,
  thumbnail_url=r.thumbnail_url, sources=r.sources, verified=r.verified, updated_at=now()
FROM profession_locale_repairs r
WHERE c.content_id=r.content_id AND c.locale=r.locale AND c.isbn IS NULL;
INSERT INTO public.figure_book_editions
  (content_id, locale, title, creator, description, isbn, publisher, thumbnail_url, edition_kind, text_scope, sort_order, sources, verified)
SELECT r.content_id, r.locale, r.title, r.creator, r.description, r.isbn, r.publisher, r.thumbnail_url,
  'full', 'complete', 0, r.sources, true
FROM profession_locale_repairs r
WHERE NOT EXISTS (SELECT 1 FROM public.figure_book_editions e WHERE e.content_id=r.content_id AND e.locale=r.locale);
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM profession_locale_repairs r
    WHERE NOT EXISTS (SELECT 1 FROM public.figure_book_editions e WHERE e.content_id=r.content_id AND e.locale=r.locale AND e.isbn=r.isbn)
  ) THEN RAISE EXCEPTION '빠진 언어판 보완 검증에 실패했습니다.'; END IF;
END $$;
DROP TABLE profession_locale_repairs;
-- 원서의 발행 연도만 확인된 경우 국문판의 발행일을 복사해 표시하지 않는다.
UPDATE public.figure_book_editions e
SET release_date = NULL, sources = e.sources || jsonb_build_object('provider_publish_date', d.publish_year)
FROM (VALUES
  ('9ca83f8b-d286-5b6a-ab5d-9262b46e54b3', '9781285740621', '2015'),
  ('57843e15-98d0-5957-9243-6c4a03547d06', '9781119454014', '2020'),
  ('0f13457a-bcd6-5d4d-8157-c4483393463b', '9780669417944', '1997'),
  ('cd8e48ac-8afd-527b-9924-dbb966f8260a', '9780321775658', '2013')
) AS d(content_id, isbn, publish_year)
WHERE e.content_id = d.content_id AND e.isbn = d.isbn AND e.locale = 'en';
UPDATE public.figure_book_editions SET release_date = '2013-09-23'
WHERE content_id = '55be804e-918d-432d-9de2-92c2281df76d' AND locale = 'ko' AND isbn = '9788957864661';
COMMIT;
