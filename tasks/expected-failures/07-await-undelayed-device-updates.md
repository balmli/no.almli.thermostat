# Await undelayed physical-device updates

- Status: Completed 2026-07-20

## Problem

`Devices.updateDevices()` awaits physical capability writes only when a device delay is configured. In the undelayed branch it starts a promise chain without awaiting it, so `updateDevices()` can resolve before Homey has accepted or rejected the write.

This makes sequencing and error observation inconsistent between delayed and undelayed requests.

## Evidence

- `tests/devices.test.ts`: `does not resolve until an undelayed physical update completes`
- Production code: `lib/Devices.ts`

## Intended behavior

The returned promise should settle only after every requested update has settled. One unavailable device should still be logged without aborting the remaining request loop.

## Suggested approach

Await the undelayed `setCapabilityValue()` call inside a `try/catch`, matching the delayed branch's error handling. Preserve request order unless intentionally changing the method to a documented parallel strategy.

## Acceptance criteria

- `updateDevices()` remains pending while an undelayed capability write is pending.
- Rejected writes are logged and later requests continue.
- Delayed requests still wait for both the write and configured delay.
- Change the related test from `it.fails` to `it`.
- `npm test`, `npm run test:coverage`, `npm run lint`, and `npm run build` pass.

## Resolution

Undelayed physical updates now use the same awaited helper as delayed updates. Rejections are caught per request so later device requests continue, and the former `it.fails` assertion is now a normal passing regression test. The shared GitHub #49 fix also keeps intended physical values separate from observed values and adds bounded confirmation retries.
