import "dotenv/config";

// Vitest setup file. Ensures DATABASE_URL points at the test database
// for the duration of the test run, falling back to a local Docker
// default so a fresh checkout can `pnpm test` after `docker compose up`.
const DEFAULT_TEST_URL = "postgres://attuna:attuna@localhost:5432/attuna_test";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? DEFAULT_TEST_URL;
}
