# GitHub #58: Allow zero hysteresis

- Issue: https://github.com/balmli/no.almli.thermostat/issues/58
- Status: Confirmed bug
- Priority: Normal

## Cause

`VThermoDeviceCalculator.resolveOnOff()` uses `deviceSettings.hysteresis || 0.5`. A configured value of `0` is falsy and is replaced by `0.5`. VHumidity has the same pattern with a fallback of `1`.

## Related expected failures

- [Honor zero target-temperature limits](../expected-failures/06-zero-target-temperature-limit.md) is a separate setting affected by the same underlying truthiness bug: a valid numeric zero is treated as absent. The fixes should use the same explicit defined-value convention.

## Fix

1. Replace truthiness fallback with nullish/default handling so an explicit zero is retained.
2. Decide whether zero hysteresis is supported for both VThermo and VHumidity.
3. Add boundary tests for zero, undefined, and configured positive hysteresis.
4. Update README wording, which currently says hysteresis must be greater than zero.
5. Consider warning users that zero hysteresis can cause rapid switching and may reduce relay/heater lifetime.

## Done when

An explicit zero switches at the target threshold, undefined values retain the existing defaults, documentation explains the tradeoff, and the full test suite passes.
