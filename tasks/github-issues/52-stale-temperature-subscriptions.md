# GitHub #52: VThermo temperature stops updating

- Issue: https://github.com/balmli/no.almli.thermostat/issues/52
- Status: Investigation
- Priority: High

## Report

Several users report that VThermo eventually shows a stale or incorrect temperature, especially with multiple sensors and average calculation. Restarting the app or Homey restores updates.

## Related expected failures

- [Fix all-stale measurement fallback](../expected-failures/01-stale-measurement-fallback.md) covers a calculation failure when every subscribed reading has become stale. It is a possible downstream consequence of stopped subscriptions, not the subscription-lifecycle fix itself.
- [Apply measurement age to VThermo MAX calculations](../expected-failures/05-vthermo-max-measurement-age.md) covers stale values continuing to affect the MAX calculation even when fresher readings exist.

## Investigation

1. Exercise capability subscriptions for multiple sensors over long-running refresh and Homey API reconnect cycles.
2. Verify that replacing a device's capability map also destroys and recreates the corresponding capability instances.
3. Check Homey API recreation and listener cleanup for stale bound listener references or duplicate subscriptions.
4. Verify refresh behavior when devices temporarily become unavailable or not ready.
5. Add tests for subscription replacement, reconnect, unavailable-to-available transitions, and multi-sensor updates.
6. Improve diagnostic logging around last capability event, last refresh, sensor timestamps, and active subscription count.

## Information needed

- Diagnostic report captured immediately while values are stale, before restarting.
- Homey model/firmware, app version, calculation method, sensor list, and old-measurement setting.

## Done when

A long-running subscription test reproduces and fixes the stale state, or diagnostics can distinguish an upstream sensor outage from a VThermo subscription/cache failure.
