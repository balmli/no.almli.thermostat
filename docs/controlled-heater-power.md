# Controlled heater power

## Measurement

`collect_power` defaults to false. Opt-in adds `measure_power`; opt-out clears its value but retains the capability and Energy settings. Startup clears a persisted aggregate before recalculation.

Sources use the existing heater and physical-thermostat switching selectors: same zone and/or direct child zones, independently configured. Target-only master propagation adds no sources. Unavailable sources remain in the power inventory so their loss cannot produce a misleading partial sum.

| Sources                                                                  | Published watts |
| ------------------------------------------------------------------------ | --------------- |
| 800 W + 200 W                                                            | 1000 W          |
| 800 W + measured 0 W                                                     | 800 W           |
| All sources measure 0 W                                                  | 0 W             |
| Any missing/invalid reading, unavailable/not-ready source, or no sources | `null`          |

Readings must be finite, non-negative watts with valid timestamps. Old change-only readings remain valid while the source is available. Silent failure that Homey does not detect cannot be distinguished from stable consumption. No nameplate, on/off or Energy estimates are used.

IDs are deduplicated. Self and other VThermo/VHumidity devices are excluded; selected Group app devices invalidate the total. Other aliases or overlapping meters cannot be identified automatically: use direct, non-overlapping physical loads. Unknown power does not affect temperature regulation or window shutdown. Rejected SDK power writes can be retried on the next calculation.

## Homey Energy

| Accounting                  | Physical sources                 | VThermo  |
| --------------------------- | -------------------------------- | -------- |
| Intended initial setup      | Included                         | Excluded |
| Optional aggregate consumer | All represented sources excluded | Included |

When first adding power, VThermo calls `setSettings({energy_exclude: true})` and checks the SDK value. Failure produces a device warning; measurement continues. This default is not reapplied to existing power devices, at restart or on collection toggles. Source settings are untouched.

The native switch retains Homey's label. The collection hint explains advanced inclusion; switching exclusion off returns a non-blocking “Here be dragons” message. Count each physical load once. The aggregate forwards watts, not individual kWh counters or histories.

Writing this built-in setting and displaying the saved message are SDK-mock-tested, **not hardware-verified**. Check the value after the complete save; immediate SDK readback does not prove Energy exclusion. `setEnergy()` is not used as an exclusion mechanism.

## PELS 3.34.1

Separate tests against tag `v3.34.1` (`4c5d51bd4`) establish:

| Transition                                       | PELS result                          |
| ------------------------------------------------ | ------------------------------------ |
| 1000 W → `null`, via refresh or realtime updates | Retains 1000 W and its old timestamp |
| Subsequent valid 900 W / real 0 W                | Accepts the new reading              |
| Cold `null` with Energy watts available          | Can use Energy as replacement        |

Without retained or alternate power, temperature remains usable without measured watts. Whether Homey actually supplies alternate Energy watts requires hardware observation. This VThermo patch does not fix PELS's invalidation handling; Energy exclusion does not solve it either.

Manual load is outside this patch. PELS already reads positive `settings.load` in watts as expected power, below its own manual override; no new capability is needed.

## Hardware checks

1. Verify first-activation exclusion after the full settings save, inclusion warning and persistence of the user's choice after restart/toggles. Exercise rejected default writes and manual fallback.
2. Test both Energy configurations, single counting, and what Energy/PELS retain when a source becomes unreadable.
3. Check sum → unknown → recovery, measured zero, source/zone changes, subscriptions, restart and window shutdown.

No development build or live automation was changed. Keep an existing Group-based PELS setup until its replacement passes these checks.

References: [Homey Energy](https://apps.developer.homey.app/the-basics/devices/energy), [Device SDK](https://apps-sdk-v3.developer.homey.app/Device.html), [VThermo API boundary](homey-api-managers.md).
