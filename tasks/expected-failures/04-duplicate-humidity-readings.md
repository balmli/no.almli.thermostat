# Stop duplicating multi-zone humidity readings

## Problem

`VHumidityDeviceCalculator.getHumiditiesInZone()` loops over every requested zone while querying the entire zone array in each iteration. Every selected humidity reading is consequently duplicated once per zone.

## Evidence

- `tests/vhumidity-calculator.test.ts`: `does not duplicate readings when several zones are selected`
- Production code: `lib/VHumidityDeviceCalculator.ts`

## Intended behavior

Each humidity sensor capability should appear once for the supplied zone scope.

## Suggested approach

Query the complete zone array once, or use the current loop zone for each iteration. Continue limiting inputs to devices whose class is `sensor` and that expose `measure_humidity`.

## Acceptance criteria

- Two selected zones with one humidity sensor each return exactly two readings.
- Non-sensor humidity capabilities remain excluded.
- Empty and undefined scopes still return an empty array.
- Change the related test from `it.fails` to `it`.
- `npm test`, `npm run test:coverage`, `npm run lint`, and `npm run build` pass.
