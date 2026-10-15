// Run the live-Postgres tests that are skipped by default (the `remembering` doctor tests).
// Needs a reachable Postgres with the `vector` and `pg_trgm` extensions installed.
//
// Usage:  npm run test:postgres
// Override the database with MEMORY_BASELINE_DSN. The default is the local development database
// postgresql://language:language@localhost:5432/language and nothing else.
import { spawnSync } from "node:child_process";

const dsn = process.env.MEMORY_BASELINE_DSN ?? "postgresql://language:language@localhost:5432/language";
const r = spawnSync(process.execPath, ["--experimental-transform-types", "--test", "core/remembering/src/engine/doctor.test.ts"], {
	stdio: "inherit",
	env: { ...process.env, REMEMBERING_INTEGRATION_TESTS: "1", MEMORY_BASELINE_DSN: dsn },
});
process.exit(r.status ?? 1);
