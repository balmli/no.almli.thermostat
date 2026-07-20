# GitHub #49: Physical output can remain on after VThermo switches off

- Issue: https://github.com/balmli/no.almli.thermostat/issues/49
- Status: Confirmed reliability investigation
- Priority: Critical

## Report

VThermo can display a cooling or inactive state while the controlled heater remains on. Comments reproduce the mismatch with Aeotec, Shelly, Fibaro, Z-Wave, and Wi-Fi devices, on both Homey generations. Master-to-child thermostat propagation can also be delayed for several minutes.

## Likely failure mode

`DeviceCalculator.updateAndCreateDeviceRequestIfChanged()` updates the in-memory capability before Homey confirms the physical write. `Devices.updateDevices()` also does not await undelayed physical writes. If a write is delayed or rejected, the in-memory state can still contain the intended value, causing later calculations to see no change and suppress the retry.

This overlaps the broader fail-safe work for GitHub #57, but this task specifically owns desired-versus-confirmed output reconciliation.

## Related expected failures

- [Await undelayed physical-device updates](../expected-failures/07-await-undelayed-device-updates.md) confirms that the write path can resolve before Homey accepts or rejects the physical update. Fixing that sequencing bug is a prerequisite for reliable reconciliation, but does not by itself add rollback or retries.

## Investigation and fix

1. Await every physical capability write and preserve error handling and request ordering.
2. Track desired and last-confirmed physical values separately, or roll back/re-read the cached value after a failed write.
3. Add bounded, idempotent retry with backoff for safety-critical `onoff: false` writes.
4. Reconcile actual capability state after timeout or rejection so an intended write cannot permanently suppress later attempts.
5. Apply the same guarantees to master-to-child `target_temperature` writes.
6. Ensure contact-alarm and inactive-state transitions use the reliable shutdown path.
7. Log the controller decision, write attempt, confirmation, retry, and final failure distinctly.

## Regression coverage

- A delayed undelayed write keeps `updateDevices()` pending.
- A rejected off write remains eligible for retry on the next calculation.
- A delayed or failed master-to-child target write is reconciled.
- A stale intended value cannot be mistaken for a confirmed physical value.
- One failing device does not prevent subsequent devices from being updated.

## Done when

VThermo cannot report a successfully applied output state solely from an unconfirmed write, failed writes are retried or surfaced clearly, and the regression cases pass.
