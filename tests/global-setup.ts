import { execFileSync } from "node:child_process";

/** Builds a throwaway SQLite database from the schema before the suite runs. */
export default function setup() {
  execFileSync(
    "npx",
    ["prisma", "db", "push", "--force-reset", "--skip-generate"],
    { stdio: "inherit", env: { ...process.env, DATABASE_URL: "file:./test.db" } },
  );
}
