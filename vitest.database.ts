// Database-writing tests must never be part of the publish build.
export const databaseTestFiles = [
  "server/**/*.integration.test.ts",
  "server/founder-wallet-lock.test.ts",
  "server/founder-wallet-debit-boundary.test.ts",
];
