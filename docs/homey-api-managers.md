# Homey API managers in VThermo

The Homey Web API is the integration boundary between VThermo's local calculation model and the zones, devices, and capabilities managed by Homey. Changes around this boundary should be reviewed against both the installed `homey-api` version and the official API reference.

## Official references

- [HomeyAPIV2.ManagerDevices](https://athombv.github.io/node-homey-api/HomeyAPIV2.ManagerDevices.html)
- [HomeyAPIV2.ManagerDrivers](https://athombv.github.io/node-homey-api/HomeyAPIV2.ManagerDrivers.html)
- [HomeyAPIV2.ManagerZones](https://athombv.github.io/node-homey-api/HomeyAPIV2.ManagerZones.html)

The linked pages describe the V2 manager surface. This repository currently depends on `homey-api` 3.x and annotates returned objects as `HomeyAPIV3Local`. The manager concepts and core operations are similar, but do not assume that V2 and V3 Local payloads, caching, event objects, or TypeScript signatures are identical. Check the installed package declarations or implementation whenever exact behavior matters.

## Two similarly named API families

The app uses two different Homey APIs:

| Access path                          | API family                           | Use in this app                                                                                                                                    |
| ------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HomeyAPI.createAppAPI(...).devices` | `homey-api` Web API `ManagerDevices` | Fetches all devices, fetches individual devices, subscribes to device events, creates capability instances, and writes physical capability values. |
| `HomeyAPI.createAppAPI(...).zones`   | `homey-api` Web API `ManagerZones`   | Fetches the zone map, fetches individual zones, and subscribes to zone events.                                                                     |
| `HomeyAPI.createAppAPI(...).drivers` | `homey-api` Web API `ManagerDrivers` | Not currently used.                                                                                                                                |
| `this.homey.drivers`                 | Homey Apps SDK `ManagerDrivers`      | Enumerates this app's own drivers and paired VThermo/VHumidity devices in `getDeviceByDataId()`.                                                   |

Do not replace the Apps SDK driver lookup with the Web API manager merely because both are called `ManagerDrivers`. The SDK lookup returns this app's live driver/device instances, which expose methods such as `getData()` and `setCapabilityValue()`. The Web API manager returns API resource representations.

## ManagerDevices

### Current data flow

`app.ts` creates the App API, explicitly connects `homeyApi.devices`, and subscribes to `device.create`, `device.update`, and `device.delete`. Initial and periodic refreshes call `getDevices()`, while event handlers may call `getDevice({id})` before forwarding an object to `lib/Devices.ts`.

`lib/Devices.ts` then:

1. filters available devices by class and supported capabilities;
2. maps API payloads into the smaller internal `Device` model;
3. creates capability instances for supported capabilities;
4. updates the internal capability value when an instance emits;
5. schedules a thermostat calculation; and
6. sends physical output changes back through `ManagerDevices.setCapabilityValue()`.

### Things to preserve and verify

- **Connect before relying on events.** `connect()` establishes the manager's Socket.io namespace. A successful REST fetch does not prove that event delivery is active; use `isConnected()` when diagnosing stale subscriptions.
- **Treat snapshots and events as complementary.** Events keep the local model current, while `getDevices()` repairs missed events. A full refresh should reconcile additions, updates, and removals—not only add or replace entries found in the returned object map.
- **Do not assume every event payload is complete.** Refetch the individual device when capability methods, settings, or complete metadata are required. Keep fixtures for both complete resource objects and partial/event-shaped data.
- **Reconcile supported-to-unsupported transitions.** A device becoming unavailable, losing a capability, or changing class must not remain indefinitely in the internal model merely because the new payload fails the initial support filter.
- **Rebuild capability subscriptions when capabilities change.** Destroy instances for removed capabilities, replace instances whose backing API resource changed, and avoid duplicate callbacks. `DeviceCapability.destroy()` must be part of device deletion, refresh replacement, API recreation, and app shutdown.
- **Use stable listener references.** `handler.bind(this)` creates a new function every time. Store each bound callback and pass the same reference to both `on()` and `removeListener()`; otherwise listener removal is ineffective.
- **Await capability writes.** `setCapabilityValue()` is asynchronous. A calculation/update operation should not report completion before Homey accepts or rejects the write. Keep desired state separate from confirmed state so a failed write remains eligible for reconciliation or retry.
- **Handle API creation failure explicitly.** `getOrCreateHomeyApi()` callers currently assume a usable manager. A partially initialized or failed API must not be retained as though both device and zone managers are connected.
- **Serialize refresh and event mutations where needed.** A snapshot registration and a concurrent create/update/delete event can otherwise overwrite newer local state or duplicate subscriptions.
- **Keep API values and metadata intact at the boundary.** Temperature units, `lastUpdated`, availability, readiness, zone, class, virtual class, settings, and capability membership affect selection and control decisions.

### Temperature-unit boundary

VThermo keeps all internal temperature values in Celsius. `DeviceMapper` reads each Web API capability's own `units` metadata and converts `measure_temperature` and `target_temperature` values from Fahrenheit when the capability declares `°F`, `F`, or `Fahrenheit`. Celsius and unknown-unit values pass through unchanged to avoid double conversion.

Capability-instance events use the source unit retained in the internal `DeviceCapability`, so snapshots and live updates follow the same conversion path. Physical `target_temperature` requests are converted from canonical Celsius back to the target capability's declared Fahrenheit unit immediately before `ManagerDevices.setCapabilityValue()`. Pending-write tracking and confirmation remain canonical Celsius, including when Homey confirms the write with a Fahrenheit event value.

Do not apply Homey's global metric/imperial setting as an unconditional conversion rule. A single Homey can contain capabilities with different declared units, and local Apps SDK capability values use the app capability contract rather than this Web API normalization path.

The official manager requires read access for device fetches and control access for capability writes. Those Web API scope names describe API authorization; do not copy them blindly into the Homey app manifest. This app obtains an App API through the Apps SDK and declares `homey:manager:api` in its manifest.

## ManagerZones

### Current data flow

`app.ts` connects `homeyApi.zones`, subscribes to `zone.create`, `zone.update`, and `zone.delete`, and fetches the complete object map through `getZones()`. Create/update handlers refetch with `getZone({id})`. `lib/Zones.ts` maps the flat `id`/`parent` representation into the internal tree used for same-zone, child-zone, descendant, and parent selection.

### Things to preserve and verify

- **Zone identity and parent links are authoritative.** A rename should preserve identity; a parent change must rebuild affected ancestry before recalculation.
- **Support every top-level zone.** `ManagerZones.getZones()` returns an object map, not a single rooted tree. The current `Zones.createTree()` keeps only `toSubTree(...)[0]`; verify the real payload shape and do not silently discard additional `parent: null` roots or orphaned zones.
- **Recalculate after topology changes.** Moving, creating, or deleting a zone can immediately change which sensors and outputs belong to a VThermo. Updating the tree without scheduling calculation can leave control based on the old scope until another event or refresh occurs.
- **Define deletion behavior for children.** If a parent is deleted or moved, ensure children are retained under their API-reported parent rather than disappearing during a local tree rebuild.
- **Reconcile full snapshots.** A periodic `getZones()` result should replace or fully reconcile local topology so missed delete events cannot leave stale zones.
- **Use stable event listener references and clean manager lifecycle.** The same callback object must be removed during API recreation, followed by disconnect/destroy in an awaited shutdown sequence.

Fetch zones before devices during a full refresh, as the app currently does, so device zone IDs are evaluated against the newest topology. Consider a single calculation after both snapshots have been reconciled rather than calculations against a half-refreshed model.

## ManagerDrivers

The official Web API manager exposes driver retrieval, pairing operations, connection state, lifecycle methods, and driver/device/pair-session events. VThermo currently needs none of these through `homey-api`.

`app.ts#getDeviceByDataId()` instead uses the Homey Apps SDK manager to locate local VThermo and VHumidity instances. Preserve this distinction because local instances are needed for app-owned capability updates and Flow trigger calls.

If Web API `ManagerDrivers` is introduced later:

- document why an API resource is needed instead of an Apps SDK driver instance;
- verify driver ID/URI representation for the exact Homey API version;
- call `connect()` only if driver or pairing events are required;
- clean up listeners, pair sessions, and the manager connection deterministically; and
- add API-shaped tests rather than mocking it as the Apps SDK manager.

## Test strategy for manager changes

Use TDD and cover the manager boundary separately from pure thermostat calculations:

- API creation succeeds, fails, and partially connects;
- connect, subscribe, unsubscribe, disconnect, and destroy use the expected order and stable callbacks;
- full snapshot plus concurrent create/update/delete events converge on one correct local model;
- device availability, class, zone, settings, and capability membership transitions reconcile correctly;
- removed/replaced devices destroy their capability instances exactly once;
- capability events schedule calculation and preserve timestamps, including zero values;
- delayed and rejected physical writes remain observable and retryable;
- multiple top-level zones, moves, deletions, and orphaned parent IDs do not lose devices or zones; and
- Apps SDK `this.homey.drivers` test doubles remain distinct from Web API `homeyApi.drivers` test doubles.

For code that depends on undocumented event completeness, cache semantics, or Homey-generation differences, record the assumption in the test and keep the integration behavior marked as unverified until exercised on representative Homey hardware.
