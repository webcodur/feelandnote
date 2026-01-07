import type { GuestbookEntryWithAuthor } from "@/types/database";

export type CurrentUser = { id: string; nickname: string | null; avatar_url: string | null } | null;

export interface GuestbookContentProps {
  profileId: string;
  currentUser: CurrentUser;
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
