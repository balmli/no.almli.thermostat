import {beforeAll, describe, expect, it, vi} from 'vitest';

const createAppAPI = vi.fn();

vi.mock('homey-api', () => ({
    HomeyAPI: {createAppAPI},
}));

let VThermoApp: any;

beforeAll(async () => {
    const appModule = await import('../app.js');
    VThermoApp = appModule.default ?? appModule;
});

function makeManager(connect = vi.fn().mockResolvedValue(undefined)) {
    return {
        connect,
        disconnect: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        removeListener: vi.fn(),
    };
}

function makeApi(devices = makeManager(), zones = makeManager()) {
    return {
        devices,
        zones,
        destroy: vi.fn().mockResolvedValue(undefined),
    };
}

function makeApp() {
    const app = new VThermoApp();
    app.homey = {clearTimeout: vi.fn()};
    app.logger = {debug: vi.fn(), error: vi.fn(), verbose: vi.fn()};
    return app;
}

describe('Homey API manager lifecycle', () => {
    it('removes the exact device and zone listener functions that were registered', async () => {
        const api = makeApi();
        createAppAPI.mockResolvedValueOnce(api);
        const app = makeApp();

        await app.createHomeyApi();
        await app.destroyHomeyApi();

        for (const event of ['device.create', 'device.update', 'device.delete']) {
            const registered = api.devices.on.mock.calls.find((call: any[]) => call[0] === event)?.[1];
            expect(api.devices.removeListener).toHaveBeenCalledWith(event, registered);
        }
        for (const event of ['zone.create', 'zone.update', 'zone.delete']) {
            const registered = api.zones.on.mock.calls.find((call: any[]) => call[0] === event)?.[1];
            expect(api.zones.removeListener).toHaveBeenCalledWith(event, registered);
        }
    });

    it('destroys a partially connected API instead of retaining it', async () => {
        const devices = makeManager();
        const zones = makeManager(vi.fn().mockRejectedValue(new Error('zone connection failed')));
        const api = makeApi(devices, zones);
        createAppAPI.mockResolvedValueOnce(api);
        const app = makeApp();

        await app.createHomeyApi();

        expect(app.homeyApi).toBeUndefined();
        expect(devices.disconnect).toHaveBeenCalledOnce();
        expect(zones.disconnect).toHaveBeenCalledOnce();
        expect(api.destroy).toHaveBeenCalledOnce();
    });

    it('awaits API teardown during app shutdown', async () => {
        let finishDisconnect!: () => void;
        const devices = makeManager();
        devices.disconnect.mockReturnValue(
            new Promise<void>(resolve => {
                finishDisconnect = resolve;
            }),
        );
        const api = makeApi(devices);
        const app = makeApp();
        app.homeyApi = api;
        app.calculator = {destroy: vi.fn()};
        app.devicesObj = {destroy: vi.fn()};
        app.zonesObj = {destroy: vi.fn()};

        let completed = false;
        const shutdown = app.onUninit().then(() => {
            completed = true;
        });
        await Promise.resolve();
        expect(completed).toBe(false);

        finishDisconnect();
        await shutdown;
        expect(api.destroy).toHaveBeenCalledOnce();
    });

    it('awaits calculator fail-safe shutdown before destroying device state', async () => {
        let finishFailSafe!: () => void;
        const app = makeApp();
        app.calculator = {
            destroy: vi.fn().mockReturnValue(
                new Promise<void>(resolve => {
                    finishFailSafe = resolve;
                }),
            ),
        };
        app.devicesObj = {destroy: vi.fn()};
        app.zonesObj = {destroy: vi.fn()};

        const shutdown = app.onUninit();
        await Promise.resolve();
        expect(app.devicesObj.destroy).not.toHaveBeenCalled();

        finishFailSafe();
        await shutdown;
        expect(app.devicesObj.destroy).toHaveBeenCalledOnce();
    });
});
