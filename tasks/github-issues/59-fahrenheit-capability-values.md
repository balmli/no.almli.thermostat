# GitHub #59: Fahrenheit capability values are interpreted as Celsius

- Issue: https://github.com/balmli/no.almli.thermostat/issues/59
- Status: Investigation
- Priority: High

## Report

On a US Homey configured for Fahrenheit, VThermo averages two sensor values but appears to treat Fahrenheit numeric values as Celsius, producing an implausible displayed temperature.

## Investigation

1. Capture the Homey API capability payload for Fahrenheit and Celsius system settings, including value, units, and capability metadata.
2. Determine whether Homey API values are canonical Celsius or localized Fahrenheit on each Homey generation/API version.
3. Inspect target and measured temperature capability options to avoid converting already canonical values.
4. Add paired Celsius/Fahrenheit fixtures covering average, validation bounds, hysteresis, manual update, target propagation, and physical thermostat control.
5. Keep all internal calculations in one documented canonical unit and convert only at the API boundary if conversion is required.

## Information needed

- Homey model/firmware and VThermo version.
- Sensor brands/apps/models and their displayed readings.
- A diagnostic report captured with Fahrenheit enabled.

## Done when

VThermo displays and controls equivalent physical temperatures correctly under both Celsius and Fahrenheit Homey configurations without double conversion.
