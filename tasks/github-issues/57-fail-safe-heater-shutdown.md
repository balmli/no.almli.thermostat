# GitHub #57: Heating remains on after controller failure

- Issue: https://github.com/balmli/no.almli.thermostat/issues/57
- Status: Completed 2026-07-20
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

## Done when

The failure can be reproduced and automatically recovered or failed safe, with regression tests for API disconnects, stale sensors, and rejected output writes.

## Resolution

- A VThermo with a configured target but no usable temperature now becomes inactive and sends explicit off requests to every configured heater instead of retaining the last heating command.
- Calculation exceptions now invoke the same conservative heater shutdown path after logging the original failure.
- Orderly app shutdown waits for fail-safe heater writes before destroying the device registry and Homey API connection.
- Fail-safe selection is limited to actively heating VThermos so an inactive controller cannot turn off an independently used heater. Once selected, physical off requests are unconditional because the cached heater value may be stale during a failure. Shared heater requests are de-duplicated before writing.
- The controller stops scheduling retries while it is shutting down; calculation-time failures continue to use the bounded output retry and confirmation behavior delivered with GitHub #49.
- The related all-stale aggregation and awaited physical-write failures were already resolved in their expected-failure tasks and remain covered by the full suite.
- Regression tests cover missing measurements, calculation exceptions, configured-zone selection, inactive-controller isolation, explicit writes despite a stale off cache, awaited shutdown, stale-value fallback, rejected writes, confirmation, and bounded retries.

The fail-safe requires a responsive Homey runtime and device integration. It cannot run during power loss or an immediate runtime/process termination, and software capability confirmation is not proof of physical relay state. Independent hardware temperature limits remain appropriate for safety-critical heating.
