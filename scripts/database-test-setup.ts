// This runs before importing any database integration test module.
if (process.env.NODE_ENV === "production" || process.env.WNSP_PUBLISH_BUILD === "1") {
  throw new Error("Database-writing tests are development-only and forbidden during publishing");
}
if (!process.env.DATABASE_URL) {
  throw new Error("A development DATABASE_URL is required for database integration tests");
}
