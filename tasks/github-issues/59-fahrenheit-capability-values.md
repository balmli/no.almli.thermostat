# GitHub #59: Fahrenheit capability values are interpreted as Celsius

- Issue: https://github.com/balmli/no.almli.thermostat/issues/59
- Status: Completed 2026-07-20
- Priority: High

## Report

On a US Homey configured for Fahrenheit, VThermo averages two sensor values but appears to treat Fahrenheit numeric values as Celsius, producing an implausible displayed temperature.

## Investigation

1. Capture the Homey API capability payload for Fahrenheit and Celsius system settings, including value, units, and capability metadata.
2. Determine whether Homey API values are canonical Celsius or localized Fahrenheit on each Homey generation/API version.
3. Inspect target and measured temperature capability options to avoid converting already canonical values.
4. Add paired Celsius/Fahrenheit fixtures covering average, validation bounds, hysteresis, manual update, target propagation, and physical thermostat control.
5. Keep all internal calculations in one documented canonical unit and convert only at the API boundary if conversion is required.

## Done when

VThermo displays and controls equivalent physical temperatures correctly under both Celsius and Fahrenheit Homey configurations without double conversion.

## Resolution

- The internal device model now uses Celsius as its documented canonical temperature unit.
- Web API `measure_temperature` and `target_temperature` snapshots declaring Fahrenheit units are converted to Celsius during device mapping.
- Live capability events use the retained source-unit metadata and are normalized through the same boundary before comparison, calculation, and write confirmation.
- Physical thermostat targets are converted from canonical Celsius back to the capability's declared Fahrenheit unit immediately before the Homey API write.
- Celsius and unknown-unit capability values pass through unchanged, avoiding global-unit assumptions and double conversion.
- Local VThermo Apps SDK capability values remain on the SDK path and are not treated as Web API Fahrenheit payloads.
- Regression tests cover Fahrenheit freezing/room/boiling values, mixed-unit averaging, snapshots, live events, Celsius pass-through, unknown units, physical target writes, and Fahrenheit confirmation events. Existing validation, hysteresis, manual-input, target-propagation, and physical-thermostat tests continue to exercise canonical Celsius behavior.

The automated suite uses API-shaped capability fixtures that match the reported Fahrenheit values and `units` metadata. Final display behavior and third-party driver metadata remain unverified on a physical US Homey.
