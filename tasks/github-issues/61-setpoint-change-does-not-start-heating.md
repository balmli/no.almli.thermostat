# GitHub #61: Setpoint change does not start heating

- Issue: https://github.com/balmli/no.almli.thermostat/issues/61
- Status: Investigation
- Priority: High

## Report

With measured temperature around 10 °C and target temperature at 20 °C, heating remained idle until VThermo was switched off and on.

## Expected behavior

When VThermo is enabled and the measured value is below target minus hysteresis, changing the target should schedule a calculation and activate configured heaters.

## Related expected failures

- [Await undelayed physical-device updates](../expected-failures/07-await-undelayed-device-updates.md) covers the downstream physical-write path after a target change produces an output request. It can explain an unconfirmed heater command, but not a failure to schedule the calculation or create the request.

## Investigation

1. Test target changes from UI, Flow, script, and master thermostat.
2. Verify the local capability listener calls `updateByDataId()` and that the mapped device can be found by data id.
3. Verify calculation debounce/timer behavior after target updates.
4. Confirm `onoff_enabled`, active `onoff`, contact-alarm, sensor validity, zone scope, and heater class filtering.
5. Add integration-style regression tests from target capability event through output request.
6. Improve logs when a controller has a large temperature deficit but produces no output request.

## Information needed

- App/Homey versions, target-change source, relevant Advanced Settings, heater device class/app, and a diagnostic report before toggling VThermo.

## Done when

Every supported target-change path reliably schedules heating outside the hysteresis band, or diagnostics clearly identify the configuration/input preventing activation.
