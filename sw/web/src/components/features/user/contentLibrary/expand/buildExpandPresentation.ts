import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import { CATEGORIES } from "@/constants/categories";
import { getLocalizedContent } from "@/lib/utils/editions";

import { groupExpandIndexItems } from "./groupExpandIndexItems";

const CATEGORY_DB_ORDER = CATEGORIES.map((category) => category.dbType);

export function buildExpandPresentation(items: UserContentWithContent[], locale: string) {
  const localized = items.map((item) => getLocalizedContent(item.content, locale));
  const titles = localized.map((content) => content.title);
  return {
    titles,
    creators: localized.map((content) => content.creator?.replace(/\^/g, ", ") ?? null),
    groups: groupExpandIndexItems(
      {
        itemIds: items.map((item) => item.id),
        titles,
        contentTypes: items.map((item) => item.content.type),
      },
      CATEGORY_DB_ORDER,
    ),
  };
}
