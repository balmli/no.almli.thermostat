# Apply measurement age to VThermo MAX calculations

- Status: Completed 2026-07-20

## Problem

The VThermo `MAX` branch calls `math.max(temperatures)` without passing `measurementMaxAge`. A comma expression evaluates the age setting separately and discards it. Stale high readings can therefore control the thermostat indefinitely.

## Evidence

- `tests/vthermo-calculator.test.ts`: `applies maximum-age filtering to the MAX calculation method`
- Production code: `lib/VThermoDeviceCalculator.ts`

## Intended behavior

`MAX` should use the same maximum-age filtering as `AVERAGE` and `MIN`. If at least one recent reading exists, stale readings should not affect the maximum.

## Suggested approach

Pass `tempSettings.measurementMaxAge` as the second argument to `math.max()`. Ensure the all-stale behavior agrees with the separate stale-fallback task.

## Acceptance criteria

- A stale high reading is ignored when a recent lower reading exists.
- With no configured maximum age, all readings remain eligible.
- The all-stale fallback uses the newest reading once task 01 is fixed.
- Change the related test from `it.fails` to `it`.
- `npm test`, `npm run test:coverage`, `npm run lint`, and `npm run build` pass.

## Resolution

The VThermo MAX branch now passes `measurementMaxAge` to `math.max()` instead of discarding it through a comma expression. A stale high reading is excluded when a recent value exists, and the shared all-stale fallback selects the newest reading when none remain within the configured age.
