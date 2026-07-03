import type { GuestbookEntryWithAuthor } from "@/types/database";

export type CurrentUser = { id: string; nickname: string | null; avatar_url: string | null } | null;

export interface GuestbookContentProps {
  profileId: string;
  /** 서버에서 주입하지 않으면(undefined) 클라이언트에서 로그인 사용자를 자체 조회한다.
   *  셀럽 페이지처럼 정적 렌더되는 화면은 이 prop을 생략한다. */
  currentUser?: CurrentUser;
  isOwner: boolean;
  initialEntries: GuestbookEntryWithAuthor[];
  initialTotal: number;
}

export interface EntryItemProps {
  entry: GuestbookEntryWithAuthor;
  currentUser: CurrentUser;
  isOwner: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string, isPrivate: boolean) => void;
}

export interface WriteFormProps {
  profileId: string;
  onSubmit: (entry: GuestbookEntryWithAuthor) => void;
}
