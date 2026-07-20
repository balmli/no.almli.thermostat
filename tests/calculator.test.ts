import {describe, expect, it, vi} from 'vitest';
import {Calculator} from '../lib/Calculator';
import {DeviceRequest, DeviceRequests} from '../lib/types';
import {makeZone} from './helpers';

function requests(...values: Array<Partial<DeviceRequest>>): DeviceRequests {
    const result = new DeviceRequests();
    for (const value of values) result.addRequest(Object.assign(new DeviceRequest(), value));
    return result;
}

describe('Calculator', () => {
    it('runs both calculators for every zone in hierarchy order', () => {
        const child = makeZone('child', 'root');
        const root = makeZone('root', undefined, [child]);
        const zones = {getZones: () => root, getZonesAsList: () => [root, child]};
        const devices = {updateDevices: vi.fn()};
        const calculator = new Calculator(zones as any, devices as any);
        const thermostatCalculate = vi.fn().mockReturnValue(new DeviceRequests());
        const humidityCalculate = vi.fn().mockReturnValue(new DeviceRequests());
        (calculator as any).vThermoCalculator = {calculate: thermostatCalculate};
        (calculator as any).vHumidityCalculator = {calculate: humidityCalculate};
        expect(calculator.calculateDeviceRequests().getRequests()).toEqual([]);
        expect(thermostatCalculate.mock.calls.map(call => call[0].id)).toEqual(['root', 'child']);
        expect(humidityCalculate.mock.calls.map(call => call[0].id)).toEqual(['root', 'child']);
    });

    it('debounces calculations, deduplicates output and keeps the last request', async () => {
        vi.useFakeTimers();
        const homey = {setTimeout, clearTimeout};
        const updateDevices = vi.fn().mockResolvedValue(undefined);
        const calculator = new Calculator(
            {getZones: () => makeZone('root'), getZonesAsList: () => [makeZone('root')]} as any,
            {updateDevices} as any,
            homey,
        );
        (calculator as any).vThermoCalculator = {
            calculate: () => requests({id: 'heater', capabilityId: 'onoff', value: false}),
        };
        (calculator as any).vHumidityCalculator = {
            calculate: () => requests({id: 'heater', capabilityId: 'onoff', value: true}),
        };
        calculator.startCalculation(100);
        calculator.startCalculation(200);
        await vi.advanceTimersByTimeAsync(199);
        expect(updateDevices).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        expect(updateDevices).toHaveBeenCalledOnce();
        expect(updateDevices.mock.calls[0][0].getRequests()).toEqual([
            expect.objectContaining({id: 'heater', capabilityId: 'onoff', value: true}),
        ]);
        vi.useRealTimers();
    });

    it('uses a 500 ms default delay and destroy cancels pending work', async () => {
        vi.useFakeTimers();
        const updateDevices = vi.fn();
        const calculator = new Calculator(
            {getZones: () => undefined, getZonesAsList: () => []} as any,
            {updateDevices} as any,
            {setTimeout, clearTimeout},
        );
        calculator.startCalculation();
        await vi.advanceTimersByTimeAsync(499);
        expect(updateDevices).not.toHaveBeenCalled();
        calculator.destroy();
        await vi.advanceTimersByTimeAsync(1);
        expect(updateDevices).not.toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('logs calculation failures instead of rejecting the scheduled task', async () => {
        vi.useFakeTimers();
        const logger = {debug: vi.fn(), error: vi.fn()};
        const calculator = new Calculator(
            {getZones: () => makeZone('root'), getZonesAsList: () => [makeZone('root')]} as any,
            {updateDevices: vi.fn()} as any,
            {setTimeout, clearTimeout},
            logger,
        );
        (calculator as any).vThermoCalculator = {
            calculate: () => {
                throw new Error('broken');
            },
        };
        (calculator as any).vHumidityCalculator = {calculate: () => new DeviceRequests()};
        calculator.startCalculation(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(logger.error).toHaveBeenCalledWith('Calculation failed', expect.any(Error));
        vi.useRealTimers();
    });
});
