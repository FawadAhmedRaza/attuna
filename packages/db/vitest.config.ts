import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
    testTimeout: 10_000,
    setupFiles: ["./src/test-setup.ts"],
    // Tests share `attuna_test` and truncate tables between cases. Parallel
    // file execution causes one file's beforeEach to wipe rows another
    // file's test is mid-flight on. Single fork keeps it simple; if the
    // suite ever gets slow enough that this matters, give each file its
    // own scratch schema instead.
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
