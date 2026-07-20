const TEMPERATURE_CAPABILITIES = new Set(['measure_temperature', 'target_temperature']);
const TEMPERATURE_PRECISION = 1_000_000;

const roundTemperature = (value: number): number =>
    Math.round((value + Number.EPSILON) * TEMPERATURE_PRECISION) / TEMPERATURE_PRECISION;

export function isFahrenheitUnit(units?: unknown): boolean {
    if (typeof units !== 'string') {
        return false;
    }
    const normalized = units.trim().toLowerCase().replace('°', '');
    return normalized === 'f' || normalized === 'fahrenheit';
}

export function toCanonicalTemperature(capabilityId: string, value: any, units?: unknown): any {
    if (!TEMPERATURE_CAPABILITIES.has(capabilityId) || typeof value !== 'number' || !isFahrenheitUnit(units)) {
        return value;
    }
    return roundTemperature(((value - 32) * 5) / 9);
}

export function fromCanonicalTemperature(capabilityId: string, value: any, units?: unknown): any {
    if (!TEMPERATURE_CAPABILITIES.has(capabilityId) || typeof value !== 'number' || !isFahrenheitUnit(units)) {
        return value;
    }
    return roundTemperature((value * 9) / 5 + 32);
}
