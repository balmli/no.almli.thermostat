# AGENTS.md

## Project overview

This repository contains `no.almli.thermostat`, a local Homey SDK v3 app written in TypeScript. It exposes two virtual thermostat-class drivers:

- `VThermo`: derives a room temperature from selected sensors and controls heaters or physical thermostats by zone.
- `VHumidity`: derives humidity from sensors and controls fans or humidifiers by zone.

The app listens to Homey device and zone changes through `homey-api`, keeps a local model, calculates desired capability changes, and then applies only changed requests.

## Runtime and tooling

- Use the Node/npm versions compatible with this repository's Homey SDK v3 and TypeScript 4 setup. Do not upgrade dependencies or the TypeScript target as part of an unrelated change.
- Install dependencies with `npm ci` when a clean install is needed.
- Useful commands:
  - `npm run build` — TypeScript compilation to `build/`.
  - `npm run lint` — ESLint using the Athom configuration.
  - `npm test` — Mocha tests followed by `homey app validate`.
  - `npx homey app validate` — validate the composed Homey manifest.
  - `npx homey app run` — run the app on a configured Homey for integration testing.
- `tests/` is ignored and is not currently checked in. If tests are added for a change, confirm they are intentionally included rather than assuming `npm test` exercises repository tests.

## Repository map

- `app.ts` — app lifecycle, Flow card listeners, Homey API connection, device/zone refresh, and Homey event handling.
- `lib/Calculator.ts` — debounces calculations, combines thermostat and humidity requests, de-duplicates them, and applies updates.
- `lib/VThermoDeviceCalculator.ts` — temperature selection, validation, target propagation, hysteresis, alarm behavior, and heater/thermostat control.
- `lib/VHumidityDeviceCalculator.ts` — humidity selection and fan/humidifier control.
- `lib/Devices.ts` and `lib/Zones.ts` — local Homey device and zone models plus capability subscriptions.
- `lib/DeviceMapper.ts` and `lib/*SettingsMapper.ts` — translate Homey API data/settings into the internal types in `lib/types.ts`.
- `drivers/VThermo/` and `drivers/VHumidity/` — Homey driver/device lifecycle and driver-specific settings composition.
- `.homeycompose/` — source fragments for app metadata, capabilities, settings, and Flow cards.
- `app.json` — generated/composed Homey manifest. Prefer editing `.homeycompose/**` and driver compose files, then regenerate/validate instead of editing only `app.json`.
- `locales/en.json` — user-facing strings.
- `assets/` and `drivers/*/assets/` — app and driver artwork.

## Architecture and data flow

Preserve this flow when changing behavior:

1. `app.ts` fetches and subscribes to Homey zones/devices.
2. `Zones` builds the zone tree; `Devices` maps supported devices and tracks capability values locally.
3. A relevant device, capability, zone, setting, or Flow change schedules `Calculator.startCalculation()`.
4. Each device calculator returns `DeviceRequest` objects and updates the local model only when a value changed.
5. `DeviceRequests.unique()` resolves duplicate requests by device and capability; the last request wins.
6. `Devices.updateDevices()` writes supported capabilities and fires requested Flow triggers.

Keep calculations deterministic and side-effect-light. New calculation logic should return requests rather than writing to Homey directly. Homey I/O belongs in the app/device integration layer and `Devices` update path.

## Homey manifest and Flow changes

- Treat `.homeycompose/` and `drivers/*/*.compose.json` as the editable manifest sources.
- When adding or renaming a capability, setting, Flow trigger, condition, or action, update all connected pieces:
  - the appropriate compose JSON;
  - `locales/en.json` labels/errors;
  - the listener or trigger registration in `app.ts` or a driver device;
  - mapper/internal types when settings affect calculation;
  - README documentation when the behavior is user-visible.
- Keep Flow card IDs and capability IDs stable unless a migration is included. Existing Homey devices and user Flows depend on them.
- Driver `class` is `thermostat` for both virtual drivers. Internal detection uses the full driver IDs in `lib/types.ts`; do not infer virtual-device identity from class alone.
- After compose changes, run Homey validation and inspect the generated `app.json` diff for unintended changes.

## Coding conventions

- Follow the style in the file being edited. The codebase contains both two-space and four-space indentation; avoid broad reformatting.
- Keep changes narrowly scoped. Do not modernize unrelated legacy code, convert module systems, or remove existing `@ts-ignore`/`@ts-nocheck` directives without proving the affected paths still build and run.
- Use TypeScript types from `lib/types.ts` for calculation-domain data. Avoid spreading new `any` types into pure logic when a concrete type is practical.
- Use the app/device logger rather than `console.*`. Include device/zone/capability context in failure logs without logging secrets.
- Await Homey writes when ordering matters. Handle rejected capability writes so a single unavailable device does not terminate the refresh/calculation loop.
- Use `this.homey.setTimeout`/`clearTimeout` in Homey-owned classes so timers follow the Homey runtime lifecycle.
- Clean up timers, capability instances, and API subscriptions in `destroy`/`onUninit` paths.
- Be careful with event listener removal: adding and removing listeners must use the same function reference.

## Thermostat and humidity invariants

- Preserve hysteresis and the current on/off state around thresholds; avoid logic that rapidly toggles devices.
- Respect `invert`, contact-alarm, motion-alarm, and `onoff_enabled` behavior when changing thermostat switching.
- Treat missing, `null`, unavailable, stale, or invalid sensor values explicitly. Do not coerce an absent reading into zero.
- Preserve manual temperature mode: automatic sensor aggregation must not overwrite a manually supplied temperature.
- Apply target-temperature offsets and min/max limits before producing propagation requests.
- Respect zone scope exactly: same zone, direct child zones, and all descendants are distinct settings.
- Exclude the controlling virtual device from its own inputs/outputs and avoid target-update feedback loops between thermostats.
- Keep physical-thermostat control separate from heater `onoff` control; physical thermostats are simulated on/off by moving their target temperature relative to their measured temperature.
- Device update delays are milliseconds and sensor maximum ages are stored as milliseconds internally. Verify conversions at settings boundaries.

## Testing and verification

For all code changes, run at least:

1. `npm run build`
2. `npm run lint`

Also run `npx homey app validate` for changes to manifests, drivers, capabilities, settings, locales, permissions, or Flow cards.

For calculation changes, add focused tests where practical using small mapped `Device` and `Zone` fixtures. Cover boundary behavior, including:

- values exactly at and immediately around hysteresis thresholds;
- inverted switching;
- missing and stale sensor readings;
- validation min/max boundaries;
- same-zone versus child/descendant selection;
- duplicate output requests and target-propagation loops;
- humidity fan versus humidifier behavior.

Homey hardware/API behavior cannot be established by compilation alone. For integration-sensitive changes, state what was tested on a real Homey and what remains unverified.

## Change discipline

- Preserve backward compatibility for paired devices, saved settings, capability IDs, and Flow cards.
- If a stored setting or capability shape changes, implement migration in the relevant driver's `migrate()` method and make it idempotent.
- Do not edit generated folders such as `build/`, `.homeybuild/`, or installed dependencies.
- Do not commit credentials, Homey tokens, `env.json`, device IDs, or diagnostic data that identifies a user's home.
- Update `README.md` and `.homeychangelog.json` when a user-visible behavior change warrants release documentation; do not invent a version bump unless requested.
