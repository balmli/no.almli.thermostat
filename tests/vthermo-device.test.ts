import {describe, expect, it, vi} from 'vitest';
import * as VThermoDeviceModule from '../drivers/VThermo/device';

const VThermoDevice = (VThermoDeviceModule as any).default ?? VThermoDeviceModule;

function makeDevice({onoffEnabled, onoff}: {onoffEnabled: boolean; onoff: boolean}) {
    const listeners = new Map<string, (value: unknown, opts: unknown) => Promise<void>>();
    const updateByDataId = vi.fn();
    const updateSettingsByDataId = vi.fn();
    const setCapabilityValue = vi.fn().mockResolvedValue(undefined);
    const capabilities = new Set<string>();
    const settings: Record<string, unknown> = {onoff_enabled: onoffEnabled};
    const device = Object.assign(Object.create(VThermoDevice.prototype), {
        homey: {
            __: vi.fn((key: string) => (key === 'error.switching_disabled' ? 'Switching disabled' : key)),
            app: {updateByDataId, updateSettingsByDataId},
            setTimeout: vi.fn(),
        },
        logger: {error: vi.fn(), info: vi.fn()},
        getData: vi.fn().mockReturnValue({id: 'data-id'}),
        getSetting: vi.fn((key: string) => settings[key]),
        setSettings: vi.fn(async (values: Record<string, unknown>) => {
            Object.assign(settings, values);
        }),
        setWarning: vi.fn().mockResolvedValue(undefined),
        unsetWarning: vi.fn().mockResolvedValue(undefined),
        hasCapability: vi.fn((id: string) => capabilities.has(id)),
        addCapability: vi.fn(async (id: string) => {
            capabilities.add(id);
        }),
        getCapabilityValue: vi.fn().mockReturnValue(onoff),
        setCapabilityValue,
        getCapabilityOptions: vi.fn().mockReturnValue({min: 1, max: 40, step: 0.5, decimals: 1}),
        setCapabilityOptions: vi.fn().mockResolvedValue(undefined),
        registerCapabilityListener: vi.fn((capabilityId, listener) => listeners.set(capabilityId, listener)),
    });
    return {device, capabilities, listeners, setCapabilityValue, updateByDataId, updateSettingsByDataId};
}

describe('VThermo Homey device', () => {
    it('does not add power to existing devices unless explicitly enabled', async () => {
        const {device, setCapabilityValue} = makeDevice({onoffEnabled: true, onoff: true});
        await device.migrate();
        expect(device.addCapability).not.toHaveBeenCalled();
        expect(setCapabilityValue).not.toHaveBeenCalled();
        expect(device.setSettings).not.toHaveBeenCalled();
    });

    it('adds power idempotently on upgrade and clears persisted aggregates before calculation', async () => {
        const {device, setCapabilityValue, updateByDataId} = makeDevice({onoffEnabled: true, onoff: true});
        await device.setSettings({collect_power: true});
        device.setSettings.mockClear();
        await device.migrate();
        await device.migrate();
        expect(device.addCapability).toHaveBeenCalledExactlyOnceWith('measure_power');
        expect(setCapabilityValue).toHaveBeenCalledWith('measure_power', null);
        expect(updateByDataId).toHaveBeenCalledWith('data-id', 'measure_power', null);
        expect(device.setSettings).toHaveBeenCalledExactlyOnceWith({energy_exclude: true});
    });

    it("preserves an existing power capability and the user's later Energy inclusion on restart", async () => {
        const {device, capabilities} = makeDevice({onoffEnabled: true, onoff: true});
        capabilities.add('measure_power');
        await device.setSettings({collect_power: true, energy_exclude: false});
        device.setSettings.mockClear();
        await device.migrate();
        expect(device.setSettings).not.toHaveBeenCalled();
        expect(device.getSetting('energy_exclude')).toBe(false);
    });

    it.each(['rejected', 'not retained'])(
        'warns if the initial Energy exclusion is %s without blocking power initialization',
        async failure => {
            const {device, setCapabilityValue, updateByDataId} = makeDevice({onoffEnabled: true, onoff: true});
            await device.setSettings({collect_power: true});
            if (failure === 'rejected') device.setSettings.mockRejectedValue(new Error('Unsupported built-in setting'));
            else device.setSettings.mockResolvedValue(undefined);
            await device.migrate();
            expect(device.setWarning).toHaveBeenCalledWith('warning.power_energy_default_failed');
            expect(setCapabilityValue).toHaveBeenCalledWith('measure_power', null);
            expect(updateByDataId).toHaveBeenCalledWith('data-id', 'measure_power', null);
        },
    );

    it('allows explicit Energy inclusion and returns a warning without reapplying the default', async () => {
        const {device, capabilities, updateSettingsByDataId} = makeDevice({onoffEnabled: true, onoff: true});
        capabilities.add('measure_power');
        const newSettings = {collect_power: true, energy_exclude: false};
        const message = await device.onSettings({
            oldSettings: {collect_power: true, energy_exclude: true},
            newSettings,
            changedKeys: ['energy_exclude'],
        });
        expect(message).toBe('warning.power_energy_include');
        expect(device.setSettings).not.toHaveBeenCalled();
        expect(device.unsetWarning).toHaveBeenCalledOnce();
        expect(updateSettingsByDataId).toHaveBeenCalledWith('data-id', newSettings);
    });

    it('accepts Energy exclusion without an inclusion warning', async () => {
        const {device} = makeDevice({onoffEnabled: true, onoff: true});
        await expect(
            device.onSettings({
                oldSettings: {collect_power: true, energy_exclude: false},
                newSettings: {collect_power: true, energy_exclude: true},
                changedKeys: ['energy_exclude'],
            }),
        ).resolves.toBeUndefined();
        expect(device.unsetWarning).toHaveBeenCalledOnce();
    });

    it('adds power on opt-in and retains the capability with unknown power on opt-out', async () => {
        const {device, capabilities, setCapabilityValue, updateSettingsByDataId} = makeDevice({
            onoffEnabled: true,
            onoff: true,
        });
        await device.onSettings({oldSettings: {}, newSettings: {collect_power: true}, changedKeys: ['collect_power']});
        expect(device.addCapability).toHaveBeenCalledExactlyOnceWith('measure_power');
        expect(updateSettingsByDataId).toHaveBeenLastCalledWith('data-id', {collect_power: true});
        await device.onSettings({
            oldSettings: {collect_power: true},
            newSettings: {collect_power: false},
            changedKeys: ['collect_power'],
        });
        expect(capabilities.has('measure_power')).toBe(true);
        expect(setCapabilityValue).toHaveBeenLastCalledWith('measure_power', null);
        expect(updateSettingsByDataId).toHaveBeenLastCalledWith('data-id', {collect_power: false});
    });

    it('keeps initialization usable if Homey rejects adding the optional capability', async () => {
        const {device} = makeDevice({onoffEnabled: true, onoff: true});
        device.getSetting.mockReturnValue(true);
        device.addCapability.mockRejectedValue(new Error('Homey unavailable'));
        await device.migrate();
        await device.initialize();
        expect(device.logger.error).toHaveBeenCalledWith('migration failed', expect.any(Error));
        expect(device.registerCapabilityListener).toHaveBeenCalledWith('target_temperature', expect.any(Function));
    });

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
});
