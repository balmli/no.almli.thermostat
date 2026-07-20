import {describe, expect, it, vi} from 'vitest';
import * as VThermoDeviceModule from '../drivers/VThermo/device';

const VThermoDevice = (VThermoDeviceModule as any).default ?? VThermoDeviceModule;

function makeDevice({onoffEnabled, onoff}: {onoffEnabled: boolean; onoff: boolean}) {
    const listeners = new Map<string, (value: unknown, opts: unknown) => Promise<void>>();
    const updateSettingsByDataId = vi.fn();
    const setCapabilityValue = vi.fn().mockResolvedValue(undefined);
    const device = Object.assign(Object.create(VThermoDevice.prototype), {
        homey: {
            __: vi.fn().mockReturnValue('Switching disabled'),
            app: {updateByDataId: vi.fn(), updateSettingsByDataId},
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
    return {device, listeners, setCapabilityValue, updateSettingsByDataId};
}

describe('VThermo Homey device', () => {
    it('keeps switch-off stable when on/off control is enabled', async () => {
        const {device, listeners, setCapabilityValue} = makeDevice({onoffEnabled: true, onoff: true});
        await device.initialize();

        await expect(listeners.get('onoff')!(false, {})).resolves.toBeUndefined();
        expect(setCapabilityValue).not.toHaveBeenCalled();
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
});
