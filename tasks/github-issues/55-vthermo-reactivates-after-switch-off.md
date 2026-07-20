# GitHub #55: VThermo immediately reactivates after switch-off

- Issue: https://github.com/balmli/no.almli.thermostat/issues/55
- Status: Investigation
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

## Information needed

- Whether `On / off enabled` is checked when the issue occurs.
- A fresh diagnostic report captured during the immediate reactivation.
- Whether the switch is changed by UI, Flow, or script.

## Done when

Switch-off remains stable whenever on/off control is enabled, while the intentionally disabled switch behavior remains clear and tested.
