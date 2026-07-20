import {describe, expect, it} from 'vitest';
import {fromCanonicalTemperature, isFahrenheitUnit, toCanonicalTemperature} from '../lib/TemperatureUnits';

describe('temperature unit boundary', () => {
    it.each([
        [-40, -40],
        [32, 0],
        [68, 20],
        [77, 25],
        [212, 100],
    ])('converts %s °F API values to %s °C internally', (fahrenheit, celsius) => {
        expect(toCanonicalTemperature('measure_temperature', fahrenheit, '°F')).toBeCloseTo(celsius);
    });

    it.each([
        [-40, -40],
        [0, 32],
        [20, 68],
        [25, 77],
        [100, 212],
    ])('converts %s °C internally to %s °F for API writes', (celsius, fahrenheit) => {
        expect(fromCanonicalTemperature('target_temperature', celsius, '°F')).toBeCloseTo(fahrenheit);
    });

    it('recognizes common Fahrenheit unit labels', () => {
        expect(isFahrenheitUnit('°F')).toBe(true);
        expect(isFahrenheitUnit('f')).toBe(true);
        expect(isFahrenheitUnit('Fahrenheit')).toBe(true);
        expect(isFahrenheitUnit('°C')).toBe(false);
    });

    it('leaves Celsius, unknown units, non-temperature capabilities and null values unchanged', () => {
        expect(toCanonicalTemperature('measure_temperature', 20, '°C')).toBe(20);
        expect(toCanonicalTemperature('measure_temperature', 20)).toBe(20);
        expect(toCanonicalTemperature('measure_humidity', 68, '°F')).toBe(68);
        expect(toCanonicalTemperature('measure_temperature', null, '°F')).toBeNull();
        expect(fromCanonicalTemperature('onoff', true, '°F')).toBe(true);
    });

    it.each([0.25, 0.5, 1, 20.5, 22.25])('round-trips %s °C without floating-point residue', celsius => {
        const fahrenheit = fromCanonicalTemperature('target_temperature', celsius, '°F');
        expect(toCanonicalTemperature('target_temperature', fahrenheit, '°F')).toBe(celsius);
    });
});
