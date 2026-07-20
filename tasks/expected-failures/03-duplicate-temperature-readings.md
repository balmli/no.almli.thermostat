# Stop duplicating multi-zone temperature readings

## Problem

`VThermoDeviceCalculator.getTemperaturesInZone()` loops over each requested zone but fetches devices from the complete zone array during every iteration. With two zones, every selected reading is returned twice; with three zones, every reading is returned three times.

Duplicated readings can distort aggregation when zones contain different numbers of sensors and do unnecessary work even when the final value happens to be unchanged.

## Evidence

- `tests/vthermo-calculator.test.ts`: `does not duplicate readings when several zones are selected`
- Production code: `lib/VThermoDeviceCalculator.ts`

## Intended behavior

Each matching sensor capability should appear once for the supplied zone scope.

## Suggested approach

Either fetch from the complete zone array once without a loop, or fetch from the loop's current zone. Retain the existing sensor-category filters for sensors, physical thermostats, virtual thermostats, and other devices.

## Acceptance criteria

- Two selected zones with one sensor each return exactly two readings.
- Empty zones and undefined scopes still return an empty array.
- Category filtering remains unchanged.
- Change the related test from `it.fails` to `it`.
- `npm test`, `npm run test:coverage`, `npm run lint`, and `npm run build` pass.
