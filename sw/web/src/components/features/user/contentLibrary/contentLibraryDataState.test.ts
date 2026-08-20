import assert from "node:assert/strict";
import test from "node:test";

import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";

import {
  createContentRequest,
  createLibrarySeed,
  isInitialSeedQuery,
  resolveDatasetPresentation,
  type ContentLibraryDataOptions,
} from "./contentLibraryDataState";

const initialContents: GetUserContentsResponse = {
  items: [{
    id: "entry-1",
    content_id: "content-1",
    status: "FINISHED",
    is_recommended: true,
    visibility: "public",
    created_at: "2026-08-21T00:00:00.000Z",
    source_url: null,
    content: {
      id: "content-1",
      type: "BOOK",
      title: "Test book",
      creator: "Test author",
      thumbnail_url: null,
      metadata: null,
      user_count: 1,
      title_ko: "테스트 책",
      title_en: "Test book",
      creator_en: "Test author",
      isbn_en: null,
      thumbnail_en: null,
      has_en_edition: false,
    },
    public_record: null,
  }],
  total: 9,
  page: 1,
  totalPages: 3,
  hasMore: true,
};

const baseOptions: ContentLibraryDataOptions = {
  activeTab: "all",
  appliedSearchQuery: "",
  compact: false,
  currentPage: 1,
  defaultPageSize: 4,
  initialContents,
  initialSearchQuery: "",
  isViewer: true,
  isResponsiveViewPending: false,
  ownerKind: "celeb",
  pageSize: 4,
  reviewFilter: "all",
  sortOption: "recent",
  targetUserId: "celeb-1",
  viewMode: "list",
};

test("an eligible server response becomes the immutable first-query seed", () => {
  const seed = createLibrarySeed(baseOptions);

  assert.equal(seed?.contents[0]?.user_id, "celeb-1");
  assert.equal(seed?.totalPages, 3);
  assert.equal(seed?.total, 9);
  assert.equal(createLibrarySeed({ ...baseOptions, initialSearchQuery: "ab" }), null);
  assert.equal(createLibrarySeed({ ...baseOptions, targetUserId: undefined }), null);
});

test("list request arguments preserve pagination, filters, and member sorting", () => {
  const request = createContentRequest({
    activeTab: "book",
    appliedSearchQuery: "  ada ",
    compact: false,
    currentPage: 3,
    ownerKind: "member",
    pageSize: 4,
    reviewFilter: "no_review",
    sortOption: "rating_desc",
    viewMode: "list",
  });

  assert.deepEqual(request, {
    type: "BOOK",
    page: 3,
    limit: 4,
    search: "ada",
    hasReview: false,
    sortBy: "rating_desc",
  });
});

test("expand requests one full page and celeb requests force recent sorting", () => {
  const request = createContentRequest({
    activeTab: "all",
    appliedSearchQuery: "x",
    compact: false,
    currentPage: 8,
    maxItems: 12,
    ownerKind: "celeb",
    pageSize: 4,
    reviewFilter: "has_review",
    sortOption: "title",
    viewMode: "expand",
  });

  assert.deepEqual(request, {
    type: undefined,
    page: 1,
    limit: 200,
    search: undefined,
    hasReview: true,
    sortBy: "recent",
  });
});

test("only the untouched list query can reuse the initial seed", () => {
  assert.equal(isInitialSeedQuery(baseOptions), true);
  assert.equal(isInitialSeedQuery({ ...baseOptions, viewMode: "expand" }), false);
  assert.equal(isInitialSeedQuery({ ...baseOptions, currentPage: 2 }), false);
  assert.equal(isInitialSeedQuery({ ...baseOptions, appliedSearchQuery: "ab" }), false);
});

test("expand to list keeps the completed expand presenter until list data is ready", () => {
  const state = resolveDatasetPresentation("expand", "list", false);

  assert.equal(state.presentationViewMode, "expand");
  assert.equal(state.shouldKeepContents, true);
  assert.equal(state.shouldShowBlockingLoading, false);
  assert.equal(state.isStaleExpandDatasetForList, true);
});

test("a completed list response swaps the presenter to list without blocking loading", () => {
  const state = resolveDatasetPresentation("list", "list", false);

  assert.equal(state.presentationViewMode, "list");
  assert.equal(state.shouldKeepContents, true);
  assert.equal(state.shouldShowBlockingLoading, false);
  assert.equal(state.isStaleExpandDatasetForList, false);
});

test("the first request without a completed dataset still uses blocking loading", () => {
  const state = resolveDatasetPresentation(null, "list", true);

  assert.equal(state.presentationViewMode, "list");
  assert.equal(state.shouldKeepContents, false);
  assert.equal(state.shouldShowBlockingLoading, true);
});

test("list to expand can use the current list page as an immediate expand seed", () => {
  const state = resolveDatasetPresentation("list", "expand", false);

  assert.equal(state.presentationViewMode, "expand");
  assert.equal(state.shouldKeepContents, true);
  assert.equal(state.shouldShowBlockingLoading, false);
});
