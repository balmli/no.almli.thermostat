# GitHub #51: Temperature sensor discovery on Homey Pro 2023

- Issue: https://github.com/balmli/no.almli.thermostat/issues/51
- Status: Investigation
- Priority: Normal

## Report

VThermo on Homey Pro 2023 did not find a temperature sensor after the 1.10.4 Homey Pro 2023 compatibility release.

## Investigation

1. Reproduce with a current Homey Pro and a same-zone device exposing `measure_temperature`.
2. Verify `Devices.validAndSupported()`, `DeviceMapper.mapCapabilities()`, zone mapping, and capability subscriptions.
3. Test all Advanced Settings sensor categories: standard sensor, thermostat, VThermo, and other device.
4. Check whether `homey-api` reports a different class, virtual class, zone, readiness, availability, or capability shape for the affected sensor.
5. Add a regression fixture matching the diagnostic data if the reporter can provide it.

## Information needed

- Current Homey firmware and VThermo app version.
- Sensor brand, app, model, class, and zone.
- Relevant VThermo sensor-selection settings.
- A diagnostic report captured while the sensor is missing.

## Done when

The sensor is either discovered correctly with a regression test, or the unsupported device/integration constraint is documented with a practical configuration path.
