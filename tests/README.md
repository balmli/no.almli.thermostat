# Tests

The `lib/` unit suite uses Vitest. Run it with:

- `npm test` for the test suite followed by Homey validation.
- `npm run test:watch` while developing.
- `npm run test:coverage` for terminal and HTML coverage reports.
- `npm run test:typecheck` to type-check production and test sources without emitting files.

The coverage baseline requires at least 90% statements, functions, and lines, plus 75% branches.

## Expected failures

Tests marked with `it.fails` specify intended behavior that the production code does not currently satisfy. They count as passing only while the assertion fails. When fixing one of these defects, change its test from `it.fails` to `it`.

Detailed implementation tasks live in `tasks/expected-failures/`. The current expected failures document these suspected bugs:

1. [All-stale measurement fallback](../tasks/expected-failures/01-stale-measurement-fallback.md)
2. [Zero-valued humidity history](../tasks/expected-failures/02-zero-humidity-history.md)
3. [Duplicated multi-zone temperature readings](../tasks/expected-failures/03-duplicate-temperature-readings.md)
4. [Duplicated multi-zone humidity readings](../tasks/expected-failures/04-duplicate-humidity-readings.md)
5. [Missing maximum-age filtering for VThermo MAX](../tasks/expected-failures/05-vthermo-max-measurement-age.md)
6. [Ignored zero target-temperature limits](../tasks/expected-failures/06-zero-target-temperature-limit.md)
7. [Unawaited physical-device updates](../tasks/expected-failures/07-await-undelayed-device-updates.md)
8. [Broken invalid logger-level message](../tasks/expected-failures/08-invalid-logger-level-message.md)
