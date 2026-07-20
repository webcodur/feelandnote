import type { GuestbookEntryWithAuthor } from "@/types/database";

/** 로그인 사용자 id. 비로그인은 null.
 *  방명록은 작성 폼 노출 여부와 본인 글 수정/삭제 판정에만 쓰므로 id 외에는 필요 없다.
 *  작성자 표시는 서버가 내려준 entry.author를 쓴다. */
export type CurrentUserId = string | null;

export interface GuestbookContentProps {
  profileId: string;
  /** 서버에서 주입하지 않으면(undefined) 클라이언트에서 로그인 사용자를 자체 조회한다.
   *  셀럽 페이지처럼 정적 렌더되는 화면은 이 prop을 생략한다. */
  currentUserId?: CurrentUserId;
  isOwner: boolean;
  initialEntries: GuestbookEntryWithAuthor[];
  initialTotal: number;
  /** 방명록이 0건일 때 빈 상태 안내를 그리지 않는다.
   *  셀럽 페이지처럼 색인 대상 화면에서 같은 문구가 전 페이지에 반복 노출되는 것을 막는다. */
  hideEmptyState?: boolean;
}

export interface EntryItemProps {
  entry: GuestbookEntryWithAuthor;
  currentUserId: CurrentUserId;
  isOwner: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string, isPrivate: boolean) => void;
}

export interface WriteFormProps {
  profileId: string;
  onSubmit: (entry: GuestbookEntryWithAuthor) => void;
}
