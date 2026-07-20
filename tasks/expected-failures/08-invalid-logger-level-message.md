# Fix invalid logger-level error reporting

Status: Completed 2026-07-20

## Problem

When `Logger.setLogLevel()` receives an unsupported value, it tries to call `.map()` directly on the iterator returned by `logLevelMap.entries()`. Iterators do not provide `.map()`, so the method throws an unrelated `TypeError` while constructing the intended validation error.

## Evidence

- `tests/logger.test.ts`: `reports supported values when an invalid log level is provided`
- Production code: `lib/Logger.js`

## Intended behavior

Invalid input should throw an explanatory error that names the unsupported value and lists the supported named and numeric levels.

## Suggested approach

Convert the entries iterator to an array before mapping, or construct the list with `Array.from(logLevelMap.entries(), mapper)`.

## Acceptance criteria

- Unsupported input throws an `Error` beginning with `Unsupported loglevel`.
- The message lists all six supported levels and their numeric ids.
- Named and numeric valid levels continue to work.
- Change the related test from `it.fails` to `it`.
- `npm test`, `npm run test:coverage`, `npm run lint`, and `npm run build` pass.

## Resolution

`Logger.setLogLevel()` now converts the supported-level entries iterator to an array while formatting the validation message. Invalid values therefore throw the intended explanatory `Error`, including all six supported names and numeric ids. The expected-failure test is now a passing regression test that verifies the complete message.
