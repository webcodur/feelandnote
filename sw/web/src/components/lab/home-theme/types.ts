export interface HomeThemePerson {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
}

export interface HomeThemeBook {
  id: string;
  title: string;
  creator: string | null;
  thumbnailUrl: string | null;
  coverLocale: 'ko' | 'en' | null;
  review: string;
  sourceUrl: string | null;
  isbn: string | null;
  bookLocale: 'ko' | 'en';
  affiliateUrl?: unknown;
}

export interface HomeThemeData {
  today: HomeThemePerson;
  books: HomeThemeBook[];
  featured: { person: HomeThemePerson; book: HomeThemeBook };
  people: HomeThemePerson[];
}
