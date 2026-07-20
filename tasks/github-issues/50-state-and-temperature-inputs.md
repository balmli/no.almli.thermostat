# GitHub #50: State changes and temperature inputs on Homey 2019

- Issue: https://github.com/balmli/no.almli.thermostat/issues/50
- Status: Investigation
- Priority: High

## Report

On Homey 2019, changing the target across the measured temperature did not reliably change VThermo between heating and cooling/inactive. Newly created devices showed the same behavior. A separate reproduction reported that a new VThermo did not select same-zone sensors and that two Hue temperature sensors produced an unexpected average, including sensors provided by the Home Assistant Community app.

## Expected behavior

- Every supported target change schedules a calculation and changes state when it crosses the configured hysteresis boundary.
- Eligible same-zone temperature sensors are discovered according to the selected sensor categories.
- Multiple eligible sensor values are included exactly once in the configured aggregate calculation.

## Related expected failures

- [Stop duplicating multi-zone temperature readings](../expected-failures/03-duplicate-temperature-readings.md) directly covers the requirement that each selected temperature capability contributes only once. It does not cover sensor discovery or target-change scheduling.

## Investigation

1. Reproduce the complete event path on Homey 2019: target capability listener, `updateByDataId()`, calculation scheduling, state request, and physical output request.
2. Build API-shaped fixtures for native Hue and Home Assistant Community temperature devices, including class, virtual class, zone, availability, and capabilities.
3. Verify sensor-category filters for standard sensors, thermostats, VThermo devices, and other devices.
4. Verify zone traversal and de-duplication before average/minimum/maximum calculation.
5. Confirm that creating a VThermo after app startup registers listeners and refreshes the device and zone maps.
6. Add diagnostics that identify which sensors were considered, excluded, and used without requiring reporter-supplied logs.
7. Coordinate shared fixes with GitHub #51, #52, and #61 rather than introducing issue-specific discovery paths.

## Regression coverage

- Raising or lowering the target across the measured temperature recalculates state immediately.
- A newly created VThermo receives target and temperature events without restarting the app.
- Native Hue and Home Assistant Community fixtures are included when their category is enabled.
- Two same-zone sensors contribute once each and produce the correct aggregate.
- Unsupported or disabled sensor classes are excluded with a specific diagnostic reason.

## Done when

Target changes reliably update state, supported same-zone sensors are selected and aggregated correctly on Homey 2019, and end-to-end regression tests cover both behaviors.
