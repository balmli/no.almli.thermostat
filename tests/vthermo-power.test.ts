import {describe, expect, it, vi} from 'vitest';
import {Devices} from '../lib/Devices';
import {DeviceMapper} from '../lib/DeviceMapper';
import {VThermoDeviceCalculator} from '../lib/VThermoDeviceCalculator';
import {Zones} from '../lib/Zones';
import {CAPABILITY_ACTIVE, DeviceClass, DeviceRequests, DRIVER_VTHERMO} from '../lib/types';
import {makeApiDevice, makeZone} from './helpers';

function setup() {
    const thermostat = makeApiDevice({
        id: 'vt',
        dataId: 'vt-data',
        driverId: DRIVER_VTHERMO,
        deviceClass: DeviceClass.thermostat,
        capabilities: {
            onoff: true,
            [CAPABILITY_ACTIVE]: false,
            measure_temperature: 18,
            target_temperature: 20,
            measure_power: null,
        },
    });
    thermostat.settings = {
        collect_power: true,
        energy_exclude: true,
        calc_method: 'MANUAL',
        devices_zone_heaters: true,
        devices_zone_thermostats: true,
        devices_sub_zones_heaters: true,
        devices_sub_zones_thermostats: false,
        onoff_enabled: true,
        contact_alarm: true,
    };
    const heater = makeApiDevice({
        id: 'heater',
        deviceClass: 'socket',
        virtualClass: 'heater',
        capabilities: {onoff: false, measure_power: 800},
    });
    const other = makeApiDevice({id: 'other', deviceClass: 'heater', capabilities: {onoff: false, measure_power: 200}});
    const devices = new Devices({thermostat, heater, other});
    const calculator = new VThermoDeviceCalculator(new Zones(), devices);
    const device = devices.getDevice('vt')!;
    const zone = makeZone('root', undefined, [makeZone('child', 'root', [makeZone('grandchild', 'child')])]);
    const power = () => {
        calculator.calculate(zone);
        return device.getLocalCapabilityValue('measure_power').value;
    };
    return {thermostat, heater, other, devices, calculator, device, zone, power};
}

describe('VThermo measured heater power', () => {
    it('sums only switch-controlled heaters and physical thermostats in the existing scopes', () => {
        const {devices, power} = setup();
        devices.createOrUpdateDevice(
            makeApiDevice({id: 'child', zone: 'child', deviceClass: 'heater', capabilities: {measure_power: 50}}),
        );
        devices.createOrUpdateDevice(
            makeApiDevice({id: 'thermostat', deviceClass: 'thermostat', capabilities: {measure_power: 100}}),
        );
        for (const [id, zone, deviceClass] of [
            ['grandchild', 'grandchild', 'heater'],
            ['parent', 'parent', 'heater'],
            ['socket', 'root', 'socket'],
            ['child-th', 'child', 'thermostat'],
        ]) {
            devices.createOrUpdateDevice(makeApiDevice({id, zone, deviceClass, capabilities: {measure_power: 999}}));
        }
        expect(power()).toBe(1150);
    });

    it.each([undefined, null, NaN, Infinity, -1, '800', false])(
        'invalidates a valid sum when a reading becomes %s, then recovers',
        value => {
            const {devices, other, power} = setup();
            expect(power()).toBe(1000);
            other.capabilitiesObj.measure_power.value = value;
            devices.createOrUpdateDevice(other);
            expect(power()).toBeNull();
            other.capabilitiesObj.measure_power.value = 0;
            devices.createOrUpdateDevice(other);
            expect(power()).toBe(800);
        },
    );

    it('reports unknown if one controlled heater has no power capability', () => {
        const {devices, other, power} = setup();
        expect(power()).toBe(1000);
        delete other.capabilitiesObj.measure_power;
        other.capabilities = ['onoff'];
        devices.createOrUpdateDevice(other);
        expect(power()).toBeNull();
    });

    it.each(['available', 'ready'])(
        'does not turn an %s heater into a partial total, including full refresh and initial load',
        field => {
            const {devices, thermostat, heater, other, power} = setup();
            expect(power()).toBe(1000);
            other[field] = false;
            devices.createOrUpdateDevice(other);
            expect(power()).toBeNull();
            expect(devices.getDevice('other')).toBeUndefined();
            devices.registerDevices({thermostat, heater, other});
            const fresh = new VThermoDeviceCalculator(new Zones(), devices);
            fresh.calculate(makeZone('root'));
            expect(devices.getDevice('vt')!.getLocalCapabilityValue('measure_power').value).toBeNull();
            const initial = new Devices({thermostat, heater, other});
            new VThermoDeviceCalculator(new Zones(), initial).calculate(makeZone('root'));
            expect(initial.getDevice('vt')!.getLocalCapabilityValue('measure_power').value).toBeNull();
            other[field] = true;
            devices.createOrUpdateDevice(other);
            fresh.calculate(makeZone('root'));
            expect(devices.getDevice('vt')!.getLocalCapabilityValue('measure_power').value).toBe(1000);
        },
    );

    it('keeps zero as a measured total even when plugs and thermostat are on', () => {
        const {devices, heater, other, power} = setup();
        for (const source of [heater, other]) {
            source.capabilitiesObj.measure_power.value = 0;
            source.capabilitiesObj.onoff.value = true;
            devices.createOrUpdateDevice(source);
        }
        expect(power()).toBe(0);
    });

    it('retains source membership after a partial unavailable event', () => {
        const {devices, other, power} = setup();
        expect(power()).toBe(1000);
        devices.createOrUpdateDevice({id: other.id, available: false} as any);
        expect(power()).toBeNull();
        devices.createOrUpdateDevice(other);
        expect(power()).toBe(1000);
    });

    it('reports unknown for a missing power entry and accepts deletion or a move as a change of controlled loads', () => {
        const {devices, other, power} = setup();
        expect(power()).toBe(1000);
        other.capabilitiesObj.measure_power = null;
        devices.createOrUpdateDevice(other);
        expect(power()).toBeNull();
        other.zone = 'elsewhere';
        devices.createOrUpdateDevice(other);
        expect(power()).toBe(800);
        devices.deleteDevice({id: 'heater'} as any);
        expect(power()).toBeNull();
    });

    it('keeps old change-only readings but rejects missing timestamps and non-watt units', () => {
        const {devices, other, power} = setup();
        other.capabilitiesObj.measure_power.lastUpdated = '2000-01-01T00:00:00Z';
        devices.createOrUpdateDevice(other);
        expect(power()).toBe(1000);
        for (const lastUpdated of [null, undefined, 'invalid', false, [], {}]) {
            other.capabilitiesObj.measure_power.lastUpdated = lastUpdated;
            devices.createOrUpdateDevice(other);
            expect(power()).toBeNull();
        }
        other.capabilitiesObj.measure_power = {value: 0.2, lastUpdated: new Date().toISOString(), units: 'kW'};
        devices.createOrUpdateDevice(other);
        expect(power()).toBeNull();
    });

    it('publishes no total with no controlled sources or when collection is off', () => {
        const {device, power} = setup();
        expect(power()).toBe(1000);
        device.deviceSettings!.collectPower = false;
        expect(power()).toBeNull();
        device.deviceSettings!.collectPower = true;
        device.deviceSettings!.zone = {};
        device.deviceSettings!.sub_zones = {};
        expect(power()).toBeNull();
    });

    it.each([true, false, undefined])(
        'keeps measured power independent of VThermo Energy exclusion %s',
        energyExclude => {
            const {thermostat, heater, other, devices, power} = setup();
            const settings = {...thermostat.settings, energy_exclude: energyExclude};
            devices.updateSettingsByDataId('vt-data', settings);
            // Excluded physical meters still provide readings to an included aggregate.
            for (const source of [heater, other]) {
                source.settings = {energy_exclude: true};
                devices.createOrUpdateDevice(source);
            }
            expect(power()).toBe(1000);
            for (const source of [heater, other]) {
                source.capabilitiesObj.measure_power.value = 0;
                devices.createOrUpdateDevice(source);
            }
            expect(power()).toBe(0);
            other.capabilitiesObj.measure_power.value = null;
            devices.createOrUpdateDevice(other);
            expect(power()).toBeNull();
        },
    );

    it('does not collect by default on existing devices', () => {
        const {device, power} = setup();
        DeviceMapper.mapSettings(device, DRIVER_VTHERMO, {devices_zone_heaters: true});
        expect(power()).toBeNull();
    });

    it('never reads another VThermo, itself or a VHumidity as a heater source', () => {
        const {devices, power} = setup();
        devices.createOrUpdateDevice(
            makeApiDevice({
                id: 'other-vt',
                driverId: DRIVER_VTHERMO,
                deviceClass: 'heater',
                capabilities: {measure_power: 999},
            }),
        );
        devices.createOrUpdateDevice(
            makeApiDevice({
                id: 'vh',
                driverId: 'homey:app:no.almli.thermostat:VHumidity',
                deviceClass: 'heater',
                capabilities: {measure_power: 999},
            }),
        );
        expect(power()).toBe(1000);
    });

    it('rejects a selected Group instead of double counting its underlying heater or forming a feedback loop', () => {
        const {devices, power} = setup();
        devices.createOrUpdateDevice(
            makeApiDevice({
                id: 'group',
                driverId: 'homey:app:com.swttt.devicegroups:fused',
                deviceClass: 'thermostat',
                capabilities: {measure_power: 1000},
            }),
        );
        expect(power()).toBeNull();
    });

    it('deduplicates a device selected through both heater and thermostat classes', () => {
        const {devices, other, power} = setup();
        other.class = 'thermostat';
        other.virtualClass = 'heater';
        devices.createOrUpdateDevice(other);
        expect(power()).toBe(1000);
    });

    it('keeps temperature regulation and contact shutdown independent of unknown power', () => {
        const {devices, other, heater, calculator, device, zone} = setup();
        other.capabilitiesObj.measure_power.value = null;
        devices.createOrUpdateDevice(other);
        let requests = calculator.calculate(zone).getRequests();
        expect(requests).toContainEqual(expect.objectContaining({id: 'heater', capabilityId: 'onoff', value: true}));
        heater.capabilitiesObj.onoff.value = true;
        devices.createOrUpdateDevice(heater);
        devices.createOrUpdateDevice(makeApiDevice({id: 'contact', capabilities: {alarm_contact: true}}));
        requests = calculator.calculate(zone).getRequests();
        expect(requests).toContainEqual(
            expect.objectContaining({id: device.id, capabilityId: CAPABILITY_ACTIVE, value: false}),
        );
        expect(requests).toContainEqual(expect.objectContaining({id: 'heater', capabilityId: 'onoff', value: false}));
        expect(device.getLocalCapabilityValue('measure_power').value).toBeNull();
    });

    it('invalidates and restores through realtime capability subscriptions, then cleans them up', () => {
        const {thermostat, heater, other} = setup();
        const callbacks = new Map<string, (value: unknown) => void>();
        const destroy = vi.fn();
        other.makeCapabilityInstance = vi.fn((id: string, callback: (value: unknown) => void) => {
            callbacks.set(id, callback);
            return {destroy};
        });
        const devices = new Devices({thermostat, heater, other});
        const calculator = new VThermoDeviceCalculator(new Zones(), devices);
        const run = () => {
            calculator.calculate(makeZone('root'));
            return devices.getDevice('vt')!.getLocalCapabilityValue('measure_power').value;
        };
        expect(run()).toBe(1000);
        callbacks.get('measure_power')!(undefined);
        expect(run()).toBeNull();
        callbacks.get('measure_power')!(0);
        expect(run()).toBe(800);
        devices.destroy();
        expect(destroy).toHaveBeenCalledTimes(2);
    });

    it('does not create a non-finite sum or repeatedly write unchanged totals', () => {
        const {devices, other, heater, calculator, device, zone, power} = setup();
        expect(power()).toBe(1000);
        expect(
            calculator
                .calculate(zone)
                .getRequests()
                .filter(r => r.capabilityId === 'measure_power'),
        ).toEqual([]);
        for (const source of [other, heater]) {
            source.capabilitiesObj.measure_power.value = Number.MAX_VALUE;
            devices.createOrUpdateDevice(source);
        }
        expect(power()).toBeNull();
        expect(device.getLocalCapabilityValue('measure_power').value).toBeNull();
    });

    it('publishes sum, unknown and recovery through the SDK and retries a rejected invalidation', async () => {
        const {thermostat, heater, other} = setup();
        let published: number | null = null;
        const local = {
            setCapabilityValue: vi.fn(async (_id: string, value: number | null) => {
                published = value;
            }),
            getCapabilityValue: vi.fn(() => published),
            getName: () => 'VThermo',
        };
        const devices = new Devices({thermostat, heater, other}, {app: {getDeviceByDataId: () => local}});
        const calculator = new VThermoDeviceCalculator(new Zones(), devices);
        const update = async () => {
            const requests = new DeviceRequests();
            requests.addRequest(calculator.calculateMeasurePower(devices.getDevice('vt')!, makeZone('root')));
            await devices.updateDevices(requests);
        };
        await update();
        expect(published).toBe(1000);
        other.available = false;
        devices.createOrUpdateDevice(other);
        local.setCapabilityValue.mockRejectedValueOnce(new Error('Temporary SDK error'));
        await update();
        expect(published).toBe(1000);
        await update();
        expect(published).toBeNull();
        other.available = true;
        other.capabilitiesObj.measure_power.value = 0;
        devices.createOrUpdateDevice(other);
        await update();
        expect(published).toBe(800);
        expect(local.setCapabilityValue.mock.calls).toEqual([
            ['measure_power', 1000],
            ['measure_power', null],
            ['measure_power', null],
            ['measure_power', 800],
        ]);
    });
});
