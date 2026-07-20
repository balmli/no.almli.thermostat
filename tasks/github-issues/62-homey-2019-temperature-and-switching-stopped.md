# GitHub #62: Homey 2019 temperature and switching stopped

- Issue: https://github.com/balmli/no.almli.thermostat/issues/62
- Status: Investigation
- Priority: Critical

## Report

On Homey 2019, automatic temperature updates and heater switching stopped. Manual temperature updates also did not trigger heaters, and restarting apps/Homey did not recover operation.

## Related expected failures

- [Fix all-stale measurement fallback](../expected-failures/01-stale-measurement-fallback.md) covers a temperature aggregation exception that can stop a calculation after readings age out.
- [Await undelayed physical-device updates](../expected-failures/07-await-undelayed-device-updates.md) covers physical heater commands running outside the awaited update sequence. These failures address concrete calculation and output-path risks but do not replace the Homey 2019 compatibility investigation.

## Investigation

1. Establish the installed VThermo version, Homey firmware, and whether the failure began after a platform/app update.
2. Inspect diagnostics for app initialization, Homey API creation/connectivity, zone/device refresh, calculation scheduling, and capability writes.
3. Verify that manual temperature mode updates the mapped local device and schedules calculation.
4. Check compatibility of the upgraded `homey-api` runtime with Homey 2019 before publishing a new release.
5. Reproduce on the oldest supported Homey runtime or a representative API fixture.
6. Add startup and manual-update integration tests covering missing API managers, disconnected subscriptions, and unavailable devices.

## Information needed

- Homey firmware, installed VThermo version, sensor/heater apps and models, Advanced Settings, and a fresh diagnostic report.
- Whether VThermo's on/off and active/idle capabilities still respond.

## Done when

The supported Homey 2019 path starts, refreshes inputs, processes manual updates, and controls heaters with regression coverage—or the minimum compatible Homey version is explicitly updated and communicated.
