# GitHub #54: Current temperature as status indicator

- Issue: https://github.com/balmli/no.almli.thermostat/issues/54
- Status: Feature investigation
- Priority: Normal

## Request

Allow `measure_temperature` to be shown as the VThermo tile's status indicator instead of always showing `target_temperature`.

## Investigation

1. Check the current Homey SDK and app manifest support for configurable device status indicators.
2. Determine whether capability order, a driver manifest option, or a device-level user setting controls the indicator.
3. Verify behavior in both the Homey mobile app and web app.
4. Prefer a user-selectable option if Homey supports it without capability migration.
5. Document platform limitations if the tile indicator is selected entirely by Homey.

## Done when

Users can select current temperature without breaking existing paired devices, or the Homey platform limitation and best alternative are documented.
