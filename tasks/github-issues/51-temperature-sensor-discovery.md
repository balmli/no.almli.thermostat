# GitHub #51: Temperature sensor discovery on Homey Pro 2023

- Issue: https://github.com/balmli/no.almli.thermostat/issues/51
- Status: Closed as configuration/user error 2026-07-20
- Priority: Normal

## Report

VThermo on Homey Pro 2023 did not find a temperature sensor after the 1.10.4 Homey Pro 2023 compatibility release.

## Investigation

1. Reproduce with a current Homey Pro and a same-zone device exposing `measure_temperature`.
2. Verify `Devices.validAndSupported()`, `DeviceMapper.mapCapabilities()`, zone mapping, and capability subscriptions.
3. Test all Advanced Settings sensor categories: standard sensor, thermostat, VThermo, and other device.
4. Check whether `homey-api` reports a different class, virtual class, zone, readiness, availability, or capability shape for the affected sensor.
5. Add a regression fixture matching the diagnostic data if the reporter can provide it.

## Done when

The sensor is either discovered correctly with a regression test, or the unsupported device/integration constraint is documented with a practical configuration path.

## Resolution

Closed without a code change. The report is most consistent with VThermo not having an eligible temperature sensor in its configured zone scope rather than a Homey Pro 2023 discovery defect.

The intended sensor and VThermo should be placed in the same Homey zone, with “standard temperature sensors in the same zone” enabled in VThermo Advanced Settings. If Homey exposes the device as a thermostat or another device class, the matching thermostat or “other devices with a temperature capability” category must be enabled instead. Parent- or child-zone sensors require their corresponding zone-scope setting.

No production behavior changed, so no new regression test is required for this configuration resolution.
