# Fix all-stale measurement fallback

- Status: Completed 2026-07-20

## Problem

When every reading is older than `measurementMaxAge`, `math.values()` returns the newest reading as a scalar. The aggregation functions (`average`, `min`, and `max`) expect `values()` to return an array, so the average path throws `TypeError: vals.reduce is not a function`.

This affects both temperature and humidity calculations that use age filtering.

## Evidence

- `tests/math.test.ts`: `falls back to the newest reading when all readings are stale`
- `tests/vhumidity-calculator.test.ts`: `falls back to the newest reading when every reading is old`
- Production code: `lib/math.ts`

## Intended behavior

If all readings are stale, keep using the single newest reading as a last-known fallback. All aggregation methods should return that reading's numeric value without throwing.

## Suggested approach

Keep the return type of `values()` consistent by wrapping the newest value in an array. Verify the behavior for `average`, `min`, and `max`, including date-string timestamps and numeric timestamps.

## Acceptance criteria

- All-stale average, minimum, and maximum calculations return the newest value.
- A single stale reading continues to work.
- Recent readings still exclude stale readings normally.
- Change both related tests from `it.fails` to `it`.
- `npm test`, `npm run test:coverage`, `npm run lint`, and `npm run build` pass.

## Resolution

The age-filter helper now always returns an array. When every value is stale, that array contains the single newest reading, so average, minimum, and maximum calculations share the intended fallback without throwing. Tests cover numeric and date-string timestamps, all three aggregations, the humidity calculation path, and a sole old reading.
