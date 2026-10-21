// Keep the historical entry point on the same served-page checks as the shared atlas.
if (process.env.THEME_TEST_URL && !process.env.ATLAS_CHECK_BASE_URL) {
  process.env.ATLAS_CHECK_BASE_URL = process.env.THEME_TEST_URL;
}
await import('../check-atlas-interaction.mjs');
await import('../check-atlas-catalog.mjs');
