import {describe, expect, it, vi} from 'vitest';
import * as VThermoDeviceModule from '../drivers/VThermo/device';

const VThermoDevice = (VThermoDeviceModule as any).default ?? VThermoDeviceModule;

function makeDevice({onoffEnabled, onoff}: {onoffEnabled: boolean; onoff: boolean}) {
    const listeners = new Map<string, (value: unknown, opts: unknown) => Promise<void>>();
    const updateByDataId = vi.fn();
    const updateSettingsByDataId = vi.fn();
    const setCapabilityValue = vi.fn().mockResolvedValue(undefined);
    const device = Object.assign(Object.create(VThermoDevice.prototype), {
        homey: {
            __: vi.fn().mockReturnValue('Switching disabled'),
            app: {updateByDataId, updateSettingsByDataId},
            setTimeout: vi.fn(),
        },
        logger: {error: vi.fn(), info: vi.fn()},
        getData: vi.fn().mockReturnValue({id: 'data-id'}),
        getSetting: vi.fn().mockReturnValue(onoffEnabled),
        getCapabilityValue: vi.fn().mockReturnValue(onoff),
        setCapabilityValue,
        getCapabilityOptions: vi.fn().mockReturnValue({min: 1, max: 40, step: 0.5, decimals: 1}),
        setCapabilityOptions: vi.fn().mockResolvedValue(undefined),
        registerCapabilityListener: vi.fn((capabilityId, listener) => listeners.set(capabilityId, listener)),
    });
    return {device, listeners, setCapabilityValue, updateByDataId, updateSettingsByDataId};
}

describe('VThermo Homey device', () => {
    it('keeps switch-off stable when on/off control is enabled', async () => {
        const {device, listeners, setCapabilityValue, updateByDataId} = makeDevice({
            onoffEnabled: true,
            onoff: true,
        });
        await device.initialize();

        await expect(listeners.get('onoff')!(false, {})).resolves.toBeUndefined();
        expect(setCapabilityValue).not.toHaveBeenCalled();
        expect(updateByDataId).toHaveBeenCalledWith('data-id', 'onoff', false);
    });

    it('restores on and rejects switch-off when on/off control is disabled', async () => {
        const {device, listeners, setCapabilityValue} = makeDevice({onoffEnabled: false, onoff: false});
        await device.initialize();

        await expect(listeners.get('onoff')!(false, {})).rejects.toThrow('Switching disabled');
        expect(setCapabilityValue).toHaveBeenCalledWith('onoff', true);
    });

    it('refreshes mapped settings before recalculating after a settings change', async () => {
        const {device, updateSettingsByDataId} = makeDevice({onoffEnabled: true, onoff: false});
        const newSettings = {onoff_enabled: true, target_step: 'step050'};

        await device.onSettings({oldSettings: {onoff_enabled: false}, newSettings, changedKeys: ['onoff_enabled']});

        expect(updateSettingsByDataId).toHaveBeenCalledWith('data-id', newSettings);
        expect(device.homey.setTimeout).not.toHaveBeenCalled();
    });

    it('migrates missing thermostat_mode, preset, and cooling capabilities', async () => {
        const hasCapability = vi.fn().mockReturnValue(false);
        const addCapability = vi.fn().mockResolvedValue(undefined);
        const setCapabilityOptions = vi.fn().mockResolvedValue(undefined);
        const setCapabilityValue = vi.fn().mockResolvedValue(undefined);
        const getCapabilityValue = vi.fn().mockReturnValue(null);
        const getSetting = vi.fn().mockReturnValue(true); // invert = true
        const device = Object.assign(Object.create(VThermoDevice.prototype), {
            homey: {
                __: vi.fn((k: string) => k),
            },
            hasCapability,
            addCapability,
            setCapabilityOptions,
            setCapabilityValue,
            getCapabilityValue,
            getCapabilities: vi.fn().mockReturnValue([]),
            getSetting,
            logger: {error: vi.fn()},
        });

        await device.migrate();

        expect(addCapability).toHaveBeenCalledWith('thermostat_mode');
        expect(setCapabilityOptions).toHaveBeenCalledWith('thermostat_mode', expect.any(Object));
        expect(addCapability).toHaveBeenCalledWith('vt_cooling');
        expect(addCapability).toHaveBeenCalledWith('vt_thermostat_preset');
        expect(setCapabilityOptions).toHaveBeenCalledWith('vt_thermostat_preset', expect.any(Object));
        expect(addCapability).toHaveBeenCalledWith('vt_dew_point');
        expect(setCapabilityOptions).toHaveBeenCalledWith('vt_dew_point', expect.any(Object));
        expect(addCapability).toHaveBeenCalledWith('vt_condensation_alarm');
        expect(setCapabilityOptions).toHaveBeenCalledWith('vt_condensation_alarm', expect.any(Object));
        expect(setCapabilityOptions).toHaveBeenCalledWith('vt_cooling', expect.any(Object));
        expect(setCapabilityOptions).toHaveBeenCalledWith('vt_onoff', expect.any(Object));
        expect(setCapabilityValue).toHaveBeenCalledWith('thermostat_mode', 'cool');
        expect(setCapabilityValue).toHaveBeenCalledWith('vt_cooling', false);
        expect(setCapabilityValue).toHaveBeenCalledWith('vt_thermostat_preset', 'comfort');
        expect(setCapabilityValue).toHaveBeenCalledWith('vt_condensation_alarm', false);
    });

    it('handles thermostat_mode capability changes and flow action updateThermostatMode', async () => {
        const trigger = vi.fn().mockResolvedValue(undefined);
        const getDeviceTriggerCard = vi.fn().mockReturnValue({trigger});
        const updateByDataId = vi.fn();
        const startCalculation = vi.fn();
        const setCapabilityValue = vi.fn().mockResolvedValue(undefined);
        const listeners = new Map<string, (value: unknown, opts: unknown) => Promise<void>>();

        const device = Object.assign(Object.create(VThermoDevice.prototype), {
            homey: {
                app: {updateByDataId, startCalculation},
                flow: {getDeviceTriggerCard},
            },
            logger: {error: vi.fn(), info: vi.fn()},
            getData: vi.fn().mockReturnValue({id: 'vthermo-1'}),
            setCapabilityValue,
            registerCapabilityListener: vi.fn((capId, listener) => listeners.set(capId, listener)),
        });

        await device.initialize();
        await listeners.get('thermostat_mode')!('cool', {});

        expect(updateByDataId).toHaveBeenCalledWith('vthermo-1', 'thermostat_mode', 'cool');
        expect(getDeviceTriggerCard).toHaveBeenCalledWith('vt_thermostat_mode_changed');
        expect(trigger).toHaveBeenCalledWith(device, {mode: 'cool'}, {});

        await device.updateThermostatMode('auto');
        expect(setCapabilityValue).toHaveBeenCalledWith('thermostat_mode', 'auto');
        expect(startCalculation).toHaveBeenCalled();
    });

    it('handles preset changes and flow action updateThermostatPreset', async () => {
        const trigger = vi.fn().mockResolvedValue(undefined);
        const getDeviceTriggerCard = vi.fn().mockReturnValue({trigger});
        const updateByDataId = vi.fn();
        const startCalculation = vi.fn();
        const setCapabilityValue = vi.fn().mockResolvedValue(undefined);
        const listeners = new Map<string, (value: unknown, opts: unknown) => Promise<void>>();

        const device = Object.assign(Object.create(VThermoDevice.prototype), {
            homey: {
                app: {updateByDataId, startCalculation},
                flow: {getDeviceTriggerCard},
            },
            logger: {error: vi.fn(), info: vi.fn()},
            getData: vi.fn().mockReturnValue({id: 'vthermo-1'}),
            setCapabilityValue,
            registerCapabilityListener: vi.fn((capId, listener) => listeners.set(capId, listener)),
        });

        await device.initialize();
        await listeners.get('vt_thermostat_preset')!('eco', {});

        expect(updateByDataId).toHaveBeenCalledWith('vthermo-1', 'vt_thermostat_preset', 'eco');
        expect(getDeviceTriggerCard).toHaveBeenCalledWith('vt_thermostat_preset_changed');
        expect(trigger).toHaveBeenCalledWith(device, {preset: 'eco'}, {});

        await device.updateThermostatPreset('boost');
        expect(setCapabilityValue).toHaveBeenCalledWith('vt_thermostat_preset', 'boost');
        expect(startCalculation).toHaveBeenCalled();
    });
});
