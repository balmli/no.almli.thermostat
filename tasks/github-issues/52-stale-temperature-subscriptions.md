# GitHub #52: VThermo temperature stops updating

- Issue: https://github.com/balmli/no.almli.thermostat/issues/52
- Status: Completed 2026-07-20
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

## Done when

A long-running subscription test reproduces and fixes the stale state, or diagnostics can distinguish an upstream sensor outage from a VThermo subscription/cache failure.

## Resolution

- Device refreshes now replace supported capability instances and destroy subscriptions for capabilities or devices that disappeared from the authoritative snapshot.
- Unavailable or not-ready devices are removed from the active model and recreated with fresh subscriptions when they recover.
- Refreshed API capability values replace stale cached values even when the capability list itself did not change.
- Homey API device and zone listeners now use stable callback references, partial connection failures are fully destroyed, and app shutdown awaits manager disconnection.
- Subscription logs include the active instance count, and capability-event logs include an event timestamp.
- The related all-stale aggregation and VThermo MAX age-filter failures were fixed in the same branch and pull request.
- Regression tests cover subscription replacement, removed capabilities, full-snapshot removal, unavailable-to-available recovery, stable API listeners, partial initialization, awaited shutdown, stale fallback, and MAX age filtering.

These tests exercise API-shaped manager resources and lifecycle behavior locally. They do not prove event delivery from every physical sensor app or Homey generation; an upstream sensor that stops publishing will still retain its last known reading according to the configured maximum-age behavior.
