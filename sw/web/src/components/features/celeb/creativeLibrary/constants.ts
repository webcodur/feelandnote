export const ROLE_I18N_MAP: Record<string, string> = {
  author: "roleAuthor",
  director: "roleDirector",
  composer: "roleComposer",
  artist: "roleArtist",
  editor: "roleEditor",
  screenwriter: "roleScreenwriter",
  developer: "roleDeveloper",
  performer: "rolePerformer",
  notable: "roleNotable",
  creator: "roleCreator",
};

export const WORK_TYPE_TABS = [
  { value: "all", i18nKey: "worksTypeAll" },
  { value: "BOOK", i18nKey: "worksTypeBook" },
  { value: "VIDEO", i18nKey: "worksTypeVideo" },
  { value: "MUSIC", i18nKey: "worksTypeMusic" },
  { value: "GAME", i18nKey: "worksTypeGame" },
  { value: "ART", i18nKey: "worksTypeArt" },
];

// work_type → i18n 키 (배지 표시용)
export const WORK_TYPE_I18N: Record<string, string> = {
  BOOK: "worksTypeBook",
  VIDEO: "worksTypeVideo",
  MUSIC: "worksTypeMusic",
  GAME: "worksTypeGame",
  ART: "worksTypeArt",
};

export const WORK_TYPE_EMOJI: Record<string, string> = {
  BOOK: "📖",
  VIDEO: "🎬",
  MUSIC: "🎵",
  ART: "🎨",
};

export const PAGE_SIZE = 20;
