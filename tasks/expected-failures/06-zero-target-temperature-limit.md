# Honor zero target-temperature limits

- Status: Completed 2026-07-20

## Problem

`VThermoDeviceCalculator.calculateTargetTemperature()` checks target minimum and maximum settings using truthiness. A configured boundary of `0` is treated as if it were absent, allowing propagated targets to cross the saved limit.

## Evidence

- `tests/vthermo-calculator.test.ts`: `honors a zero minimum target temperature`
- Production code: `lib/VThermoDeviceCalculator.ts`

## Intended behavior

Zero is a valid minimum or maximum target temperature. Clamping should apply to every defined numeric boundary, including `0` and negative values.

## Suggested approach

Test boundaries explicitly for `undefined` rather than truthiness. Review the offset check at the same time, but do not change its behavior unless a zero offset needs special handling.

## Acceptance criteria

- A minimum of `0` clamps a propagated target of `-5` to `0`.
- A maximum of `0` clamps a propagated target above zero to `0`.
- Negative minimum and maximum values continue to work.
- Undefined limits do not clamp.
- Change the related test from `it.fails` to `it` and add maximum-zero coverage.
- `npm test`, `npm run test:coverage`, `npm run lint`, and `npm run build` pass.

## Resolution

Target minimum and maximum checks now test for numeric values instead of truthiness. Zero and negative boundaries clamp propagated targets correctly, while undefined limits remain inactive. The zero-minimum expected-failure test is now a normal regression test, with additional zero-maximum, negative-boundary, and undefined-limit coverage.
