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

- Missing target or temperature input deliberately retains the current heater output. Automatically forcing heaters off is not a safe universal default because a sensor outage could leave a home cold or cause frozen pipes.
- Calculation exceptions are logged and receive bounded automatic recovery attempts after 5 seconds, 30 seconds, and 2 minutes. A later device event starts a fresh calculation sequence.
- App shutdown remains non-intrusive and does not change heater outputs.
- Physical capability writes continue to use the confirmation and latest-command reconciliation delivered with GitHub #49, so an unconfirmed off command is not mistaken for physical state and obsolete commands cannot override newer intent.
- The related all-stale aggregation and awaited physical-write failures were already resolved in their expected-failure tasks and remain covered by the full suite.
- Regression tests cover output retention for missing inputs, transient calculation recovery, bounded calculation retries, stale-value fallback, rejected writes, capability confirmation, rapid reversals, and duplicate output suppression.

There is no software-only default that eliminates both overheating and loss-of-heating risk. VThermo does not claim certified safety behavior; independent hardware minimum/maximum temperature protection remains appropriate for the installation.
