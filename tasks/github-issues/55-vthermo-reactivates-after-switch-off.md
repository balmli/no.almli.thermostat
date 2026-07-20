# GitHub #55: VThermo immediately reactivates after switch-off

- Issue: https://github.com/balmli/no.almli.thermostat/issues/55
- Status: Completed 2026-07-20
- Priority: High

## Report

VThermo sometimes cannot be switched off because it reactivates immediately. Restarting the app temporarily resolves the behavior.

## Known configuration behavior

When Advanced Settings → `On / off enabled` is unchecked, the capability listener intentionally forces `onoff` back to true. Confirm this setting first.

## Investigation

1. Reproduce with `onoff_enabled` both true and false and document the expected behavior.
2. Trace all writes to the local `onoff` capability and distinguish UI, Flow, migration, and settings callbacks.
3. Check whether stale settings are retained in the local mapped device after Homey settings events.
4. Add regression tests for switch-off, app refresh, setting changes, and repeated Flow writes.
5. Review whether the setting name and hint make the forced-on behavior sufficiently clear.

## Done when

Switch-off remains stable whenever on/off control is enabled, while the intentionally disabled switch behavior remains clear and tested.

## Resolution

- VThermo settings changes now update the app's mapped device settings immediately instead of waiting for a later Homey Web API `device.update` event.
- Recalculation is scheduled only after the complete new settings object has been mapped, preventing a newly enabled on/off switch from being evaluated with the stale disabled value.
- The intentional behavior remains unchanged when `On / off enabled` is unchecked: switch-off is rejected and the device switch returns to on.
- The setting hint now explicitly says that the on/off switch remains on while switching is disabled.
- Regression tests cover stable switch-off when enabled, forced-on behavior when disabled, and immediate settings-cache refresh before recalculation.

The tests exercise the Homey device callback and API-shaped local registry in isolation. A real Homey timing test remains outside the automated suite.
