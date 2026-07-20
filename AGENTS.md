# AGENTS.md

## Project overview

This repository contains `no.almli.thermostat`, a local Homey SDK v3 app written in TypeScript. It exposes two virtual thermostat-class drivers:

- `VThermo`: derives a room temperature from selected sensors and controls heaters or physical thermostats by zone.
- `VHumidity`: derives humidity from sensors and controls fans or humidifiers by zone.

The app listens to Homey device and zone changes through `homey-api`, keeps a local model, calculates desired capability changes, and then applies only changed requests.

## Runtime and tooling

- Use Node 24 as specified by `.nvmrc`; the project uses Homey SDK v3 and TypeScript 6. Do not upgrade dependencies or the TypeScript target as part of an unrelated change.
- The Homey Web API is a core integration dependency. Before changing device discovery, capability subscriptions/writes, driver lookup, zone topology, refresh, or API lifecycle code, read [Homey API managers in VThermo](docs/homey-api-managers.md) and consult the official [ManagerDevices](https://athombv.github.io/node-homey-api/HomeyAPIV2.ManagerDevices.html), [ManagerDrivers](https://athombv.github.io/node-homey-api/HomeyAPIV2.ManagerDrivers.html), and [ManagerZones](https://athombv.github.io/node-homey-api/HomeyAPIV2.ManagerZones.html) references.
- The official links above describe `HomeyAPIV2`, while this app currently uses `homey-api` 3.x and `HomeyAPIV3Local` types. Verify version-specific signatures and payload behavior in the installed package; do not assume V2 and V3 Local are identical.
- Install dependencies with `npm ci` when a clean install is needed.
- Useful commands:
    - `npm run build` — TypeScript compilation to `.homeybuild/`.
    - `npm run format` — format supported repository files with Prettier.
    - `npm run format:check` — verify Prettier formatting without changing files.
    - `npm run lint` — run the Prettier check followed by ESLint.
    - `npm test` — run the Vitest suite, followed by `homey app validate` through the `posttest` script.
    - `npm run test:watch` — run Vitest in watch mode.
    - `npm run test:coverage` — run Vitest with V8 coverage reporting.
    - `npm run test:typecheck` — type-check application and test sources without emitting files.
    - `npx homey app validate` — validate the composed Homey manifest.
    - `npx homey app run` — run the app on a configured Homey for integration testing.
- `tests/` contains the committed unit suite. Suspected production defects may be captured with Vitest's `it.fails` so their intended behavior is explicit without making the baseline suite unusable.

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
- `tests/` — Vitest unit tests, fixtures, and the virtual Homey SDK boundary used by framework-facing tests.
- `docs/homey-api-managers.md` — how this app uses the Homey Web API device and zone managers, why its Apps SDK driver manager is different, and the lifecycle/reconciliation risks to test.
- `tasks/` — repository-only implementation tasks and issue documentation; excluded from Homey app packages through `.homeyignore`.

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

- Prettier owns formatting. Run `npm run format` after editing supported files and avoid manual formatting that conflicts with `.prettierrc.json`.
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

## Issue-task workflow

- Handle one GitHub issue task at a time. Finish its branch, investigation, regression test, implementation, verification, documentation, atomic commits, pull request, and GitHub response before starting another issue.
- Before changing code for a task in `tasks/github-issues/`, create a dedicated branch from the intended base branch. Name it `fix/<github-issue-slug>`, where the slug is the GitHub task filename without `.md`; for example, `tasks/github-issues/50-state-and-temperature-inputs.md` uses `fix/50-state-and-temperature-inputs`. Do not implement GitHub issue fixes directly on the default branch or reuse one issue branch for another issue.
- Keep the branch and pull request limited to that one GitHub issue and any directly related task in `tasks/expected-failures/` that must be resolved by the same fix.
- Use atomic commits: each commit should contain one coherent issue fix together with its tests and any directly required documentation or task updates. Do not combine multiple issue fixes or unrelated cleanup in the same commit.
- Commit only after the relevant focused tests and required project checks pass. If preparatory refactoring is independently useful and behavior-preserving, keep it in a separate atomic commit.
- After verification, push the issue branch and create a pull request targeting the intended base branch. Include the GitHub issue, related expected-failure task, behavior change, TDD regression coverage, verification results, and any hardware limitations in the pull-request description.
- Push any later atomic commits for that issue to the same branch so the existing pull request is updated. Do not begin another GitHub issue until the current issue's commits are pushed and its pull request has been created.
- Use test-driven development when solving tasks in both `tasks/expected-failures/` and `tasks/github-issues/`: first add or identify a focused regression test that demonstrates the intended behavior and fails for the expected reason, then make the smallest production change that passes it, and finally refactor while keeping the suite green.
- An existing `it.fails` test in an expected-failure task is the red phase. When fixing that defect, change it to a normal passing test and add any boundary cases required by the task. Do not weaken or delete the assertion merely to make the suite pass.
- A GitHub issue fix must include regression coverage for the reported behavior whenever it can be tested locally. Keep platform- or hardware-only verification requirements explicit when they cannot be automated.
- When completing a task in `tasks/github-issues/`, comment on the linked GitHub issue with a concise summary of the fix, its tests, and any relevant release status. Keep the comment polite, appreciative, and helpful.
- Do not ask issue reporters or other users for more information, logs, diagnostics, reproduction details, or follow-up work. Base issue comments and implementation decisions on the available report, repository evidence, and tests.

## Change discipline

- Preserve backward compatibility for paired devices, saved settings, capability IDs, and Flow cards.
- If a stored setting or capability shape changes, implement migration in the relevant driver's `migrate()` method and make it idempotent.
- Do not edit generated folders such as `build/`, `.homeybuild/`, or installed dependencies.
- Keep repository-only directories such as `tests/`, `tasks/`, and documentation workspaces in `.homeyignore`. When adding a new non-runtime directory, update `.homeyignore` and confirm Homey validation still passes.
- Do not commit credentials, Homey tokens, `env.json`, device IDs, or diagnostic data that identifies a user's home.
- Update `README.md` and `.homeychangelog.json` when a user-visible behavior change warrants release documentation; do not invent a version bump unless requested.
