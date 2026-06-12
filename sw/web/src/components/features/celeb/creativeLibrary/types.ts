export interface LiveWorkItem {
  id: string;
  title_en: string;
  title_ko: string;
  work_type: string | null;
  role: string;
  release_year: number | null;
  props: string[];
  image: string | null;
  genre: string | null;
  genre_ko: string | null;
  imdb_id: string | null;
  poster: string | null;
  duration: number | null;
  publisher: string | null;
  pages: number | null;
  isbn: string | null;
  record_label: string | null;
  music_duration: number | null;
  collection: string | null;
  collection_ko: string | null;
  material: string | null;
  material_ko: string | null;
  location: string | null;
  location_ko: string | null;
}

export interface ResolvedWorkItem {
  title: string;
  subTitle: string | null;
  yearStr: string | null;
  thumbnail: string | null;
  genreLabel: string | null;
  durationStr: string | null;
  collectionLabel: string | null;
  materialLabel: string | null;
  locationLabel: string | null;
}
