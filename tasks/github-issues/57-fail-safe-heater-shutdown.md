# GitHub #57: Heating remains on after controller failure

- Issue: https://github.com/balmli/no.almli.thermostat/issues/57
- Status: Safety/reliability investigation
- Priority: Critical

## Report

The app reportedly stopped responding several times while heaters remained on beyond the target temperature. Restarting Homey restored control.

## Related expected failures

- [Fix all-stale measurement fallback](../expected-failures/01-stale-measurement-fallback.md) covers an exception in temperature aggregation that can interrupt a calculation and leave the previous heater command in effect.
- [Await undelayed physical-device updates](../expected-failures/07-await-undelayed-device-updates.md) covers shutdown writes completing outside the awaited control path, weakening error handling and recovery.

## Investigation

1. Correlate app lifecycle, Homey API connectivity, calculation scheduling, and device-write failures.
2. Verify that rejected writes and disconnected API managers cannot silently stop future calculations.
3. Test refresh/reconnect behavior and watchdog recovery after simulated API and capability-subscription failures.
4. Evaluate a conservative fail-safe option that turns controlled heaters off when sensor data is missing/stale or the controller is being uninitialized, without creating unsafe reconnect loops.
5. Add explicit health logging for last successful calculation, last sensor update, and last output write.
6. Document that VThermo is automation software rather than a certified safety controller and recommend independent hardware limits.

## Information needed

- Diagnostic report captured while the failure is active, before restarting.
- Homey model/firmware, app version, heater devices/apps, calculation method, and stale-measurement settings.
- Whether the VThermo tile, sensor values, and other apps remain responsive during the event.

## Done when

The failure can be reproduced and automatically recovered or failed safe, with regression tests for API disconnects, stale sensors, and rejected output writes.
