# Preserve zero-valued humidity history

Status: Completed 2026-07-20

## Problem

`ValueStore.changePctPointsLastMinutes()` uses truthiness to decide whether current and historical values exist. A valid reading of `0` is therefore treated as missing, and the method returns `undefined` instead of the percentage-point change.

## Evidence

- `tests/value-store.test.ts`: `supports legitimate zero-valued humidity readings`
- Production code: `lib/ValueStore.ts`

## Intended behavior

Zero is a valid stored value. The method should distinguish an absent value (`undefined`) from any numeric value, including `0`.

## Suggested approach

Replace truthiness checks with explicit `undefined` checks. Preserve positive and negative changes and the existing behavior when the requested historical reading is genuinely unavailable.

## Acceptance criteria

- A history changing from `0` to `5` returns `5`.
- A history changing from `5` to `0` returns `-5`.
- Missing current or historical readings still return `undefined`.
- Change the related test from `it.fails` to `it` and add the reverse zero case.
- `npm test`, `npm run test:coverage`, `npm run lint`, and `npm run build` pass.

## Resolution

`ValueStore.changePctPointsLastMinutes()` now checks explicitly for `undefined`, preserving zero as a valid current or historical value. Regression coverage verifies changes from `0` to `5`, changes from `5` to `0`, and genuinely missing readings.
