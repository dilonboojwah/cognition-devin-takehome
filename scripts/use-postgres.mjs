import { readFileSync, writeFileSync } from "node:fs";

/**
 * The schema is authored for SQLite so a clean clone runs with no setup. A
 * hosted deployment needs a real database, so the build swaps the datasource
 * provider to PostgreSQL before `prisma generate`. Nothing else differs: every
 * model uses types both providers share.
 */

const PATH = "prisma/schema.prisma";
const schema = readFileSync(PATH, "utf8");
const swapped = schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');

if (swapped === schema) {
  console.log("Datasource provider is already postgresql; nothing to do.");
} else {
  writeFileSync(PATH, swapped);
  console.log("Datasource provider set to postgresql for this build.");
}
