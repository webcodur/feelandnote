import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const contentLibrarySource = readFileSync(
  fileURLToPath(new URL("./ContentLibrary.tsx", import.meta.url)),
  "utf8",
);
const contentLibraryBodySource = readFileSync(
  fileURLToPath(new URL("./ContentLibraryBody.tsx", import.meta.url)),
  "utf8",
);
const contentLibraryDataSource = readFileSync(
  fileURLToPath(new URL("./useContentLibraryData.ts", import.meta.url)),
  "utf8",
);
const contentLibraryDataCacheSource = readFileSync(
  fileURLToPath(new URL("./contentLibraryDataCache.ts", import.meta.url)),
  "utf8",
);

test("only the latest content request can commit data or completion state", () => {
  assert.match(contentLibraryDataSource, /const requestId = \+\+loadRequestIdRef\.current/);
  assert.equal(
    contentLibraryDataSource.match(
      /if \(requestId !== loadRequestIdRef\.current\) return;/g,
    )?.length,
    3,
  );
  assert.match(
    contentLibraryDataSource,
    /if \(requestId === loadRequestIdRef\.current\) \{/,
  );
  assert.match(contentLibraryDataSource, /setContentsMode\(snapshot\.mode\)/);
});

test("refresh and request errors keep the completed dataset mounted", () => {
  assert.match(
    contentLibraryDataSource,
    /if \(hasLoadedRef\.current\) setIsRefreshing\(true\)/,
  );
  assert.doesNotMatch(contentLibraryDataSource, /setContents\(\[\]\)/);
});

test("view switches restore completed datasets and saved IDs without another request", () => {
  assert.match(contentLibraryDataSource, /void loadContents\(true\)/);
  assert.match(contentLibraryDataSource, /datasetCacheRef\.current\?\.get\(cacheKey\)/);
  assert.match(contentLibraryDataSource, /datasetCacheRef\.current\?\.set\(cacheKey, snapshot\)/);
  assert.match(contentLibraryDataSource, /savedContentIdsCacheRef\.current\.get\(cacheKey\)/);
  assert.match(contentLibraryDataSource, /canPresentCachedRequestedView/);
  assert.match(contentLibraryDataCacheSource, /const viewMode: ViewMode = "list"/);
});

test("ContentLibrary renders completed data through its dataset presenter while refreshing", () => {
  assert.match(
    contentLibrarySource,
    /if \(lib\.isLoading && !hasContents\) return <LoadingState/,
  );
  assert.match(
    contentLibrarySource,
    /presentationViewMode=\{lib\.presentationViewMode\}/,
  );
  assert.match(
    contentLibraryBodySource,
    /data-library-presenter=\{(?:default|desktop)PresenterViewMode\}/,
  );
  assert.doesNotMatch(
    contentLibrarySource,
    /if \(lib\.isLoading\) return <LoadingState/,
  );
});

test("ContentLibrary keeps refresh failures non-destructive and retryable", () => {
  assert.match(
    contentLibrarySource,
    /if \(lib\.error && !hasContents\) return <ErrorState/,
  );
  assert.match(contentLibraryBodySource, /role="alert"/);
  assert.match(
    contentLibraryBodySource,
    /<ErrorState message=\{error\} onRetry=\{loadContents\} compact \/>/,
  );
});

test("content type count failures never render as zero and can retry without a refresh", () => {
  assert.match(
    contentLibraryDataSource,
    /useState<ContentTypeCounts \| null>\(null\)/,
  );
  assert.match(contentLibraryDataSource, /const \[typeCountsError, setTypeCountsError\]/);
  assert.match(contentLibraryDataSource, /const loadTypeCounts = useCallback/);
  assert.match(contentLibraryDataSource, /MAX_COUNT_REQUEST_ATTEMPTS/);
  assert.match(contentLibrarySource, /message=\{lib\.typeCountsError\}/);
  assert.match(contentLibrarySource, /onRetry=\{lib\.loadTypeCounts\}/);
});

test("responsive viewport resolution keeps the same keyed presenter wrappers", () => {
  const presenterBranch = contentLibraryBodySource.slice(
    contentLibraryBodySource.indexOf("{hasFilteredContents"),
    contentLibraryBodySource.indexOf("{!compact"),
  );

  assert.match(
    presenterBranch,
    /responsiveDesktopViewMode !== undefined \? \(\s*<>/,
  );
  assert.equal(presenterBranch.match(/key="responsive-default"/g)?.length, 1);
  assert.equal(presenterBranch.match(/key="responsive-desktop"/g)?.length, 1);
  assert.doesNotMatch(
    presenterBranch,
    /hasResponsiveDefaultView \? \(\s*<>/,
  );
});
