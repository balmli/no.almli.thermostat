import Homey from 'homey';
import {HomeyAPI} from "athom-api";
import {Devices} from "./lib/Devices";
import {Zones} from "./lib/Zones";
import {Calculator} from "./lib/Calculator";
import {CAPABILITY_ACTIVE} from "./lib/types";
const Logger = require('./lib/Logger');

const HOMEY_API_RECREATE_INTERVAL = 86400 * 1000 * 10;
const REFRESH_DEFAULT_INTERVAL = 86400 * 1000;
const REFRESH_BOOTING = 120 * 1000;

module.exports = class VThermoApp extends Homey.App {

    logger: any;
    homeyApi: any;
    homeyApiCreated?: number;
    zonesObj!: Zones;
    devicesObj!: Devices;
    calculator!: Calculator;
    _refreshTimeout: any;
    _lastNumRunningDevices?: number;

    async onInit(): Promise<void> {
        this.logger = new Logger({
            logFunc: this.log,
            errorFunc: this.error,
        });
        this.logger.debug('VThermoApp:onInit: start');
        await this.initFlows();
        this.zonesObj = new Zones(undefined, this.logger);
        this.devicesObj = new Devices(undefined, this.homey, this.logger);
        this.calculator = new Calculator(this.zonesObj, this.devicesObj, this.homey, this.logger);
        this.devicesObj.setCalculator(this.calculator);
        this.scheduleRefresh(1000);
        this.logger.info(`App running`);
    }

    async onUninit(): Promise<void> {
        this.clearRefreshTimeout();
        this.calculator.destroy();
        this.devicesObj.destroy();
        this.zonesObj.destroy();
        this.destroyHomeyApi();
    }

    private async initFlows() {

        this.homey.flow.getConditionCard('vt_onoff_is_on')
            .registerRunListener((args, state) => args.device.getCapabilityValue(CAPABILITY_ACTIVE));

        this.homey.flow.getConditionCard('vh_onoff_is_on')
            .registerRunListener((args, state) => args.device.getCapabilityValue(CAPABILITY_ACTIVE));

        this.homey.flow.getConditionCard('vh_humidity_increased_last_mins')
            .registerRunListener((args, state) => {
                if (!args.change_pct_points || !args.minutes) {
                    return false;
                }
                const changeLastMinutes = args.device.getValueStore().changePctPointsLastMinutes(args.minutes);
                return changeLastMinutes !== undefined && changeLastMinutes >= args.change_pct_points;
            });

        this.homey.flow.getConditionCard('vh_humidity_decreased_last_mins')
            .registerRunListener((args, state) => {
                if (!args.change_pct_points || !args.minutes) {
                    return false;
                }
                const changeLastMinutes = args.device.getValueStore().changePctPointsLastMinutes(args.minutes);
                return changeLastMinutes !== undefined && (-1.0 * changeLastMinutes) >= args.change_pct_points;
            });

        this.homey.flow.getActionCard('update_invert_switch')
            .registerRunListener((args, state) => args.device.updateInvertSwitch(args.invert_switch === 'true'));

        this.homey.flow.getActionCard('update_measure_temperature')
            .registerRunListener((args, state) => args.device.updateMeasureTemperature(args.temperature));

        this.homey.flow.getActionCard('update_target_temp_min_max_step')
            .registerRunListener((args, state) => args.device.updateTargetTempMinMaxStep(args.temp_min, args.temp_max, args.temp_step));

        this.homey.flow.getActionCard('update_target_temp_offset')
            .registerRunListener((args, state) => args.device.updateTargetTempOffset(args.temp_offset));

        this.homey.flow.getActionCard('update_target_update_enabled')
            .registerRunListener((args, state) => args.device.updateTargetUpdateEnabled(args.enabled === 'true'));

        this.homey.flow.getActionCard('vh_set_target_humidity')
            .registerRunListener((args, state) => {
                args.device.setCapabilityValue('vh_target_humidity', args.vh_target_humidity)
                    .catch((err: any) => args.device.logger.error(err));
                args.device.setCapabilityValue('vh_target_humidity_view', args.vh_target_humidity)
                    .catch((err: any) => args.device.logger.error(err));
                return Promise.resolve();
            });
    }

    /**
     * Get local device by data id.
     * @param dataId
     */
    getDeviceByDataId(dataId: string): Homey.Device | undefined {
        const drivers = this.homey.drivers.getDrivers();
        for (let key in drivers) {
            const driver = drivers[key];
            for (const device of driver.getDevices()) {
                if (device.getData().id === dataId) {
                    return device;
                }
            }
        }
    }

    /**
     * Update device by data id.
     * @param dataId
     * @param capabilityId
     * @param value
     */
    updateByDataId(dataId: string, capabilityId: string, value: any): void {
        this.devicesObj.updateByDataId(dataId, capabilityId, value);
    }

    /**
     * Start calculation, with an optional delay.
     * @param delay delay in ms.
     */
    startCalculation(delay?: number): void {
        this.calculator.startCalculation(delay);
    }

    private async getOrCreateHomeyApi(): Promise<HomeyAPI> {
        if (this.homeyApi && this.homeyApiCreated && (Date.now() - this.homeyApiCreated > HOMEY_API_RECREATE_INTERVAL)) {
            await this.destroyHomeyApi();
        }
        if (!this.homeyApi) {
            await this.createHomeyApi();
        }
        return this.homeyApi;
    }

    private async destroyHomeyApi(): Promise<void> {
        try {
            this.homeyApi.devices.removeListener('device.create', this._onDeviceCreate.bind(this));
            this.homeyApi.devices.removeListener('device.update', this._onDeviceUpdate.bind(this));
            this.homeyApi.devices.removeListener('device.delete', this._onDeviceDelete.bind(this));
            this.homeyApi.zones.removeListener('zone.create', this._onZoneCreate.bind(this));
            this.homeyApi.zones.removeListener('zone.update', this._onZoneUpdate.bind(this));
            this.homeyApi.zones.removeListener('zone.delete', this._onZoneDelete.bind(this));
            await this.homeyApi.destroy();
            this.homeyApi = undefined;
            this.logger.debug(`HomeyAPI instance destroyed`);
        } catch (err) {
            this.homeyApi = undefined;
            this.logger.error(`Destroying HomeyAPI failed`, err);
        }
    }

    private async createHomeyApi(): Promise<void> {
        try {
            this.homeyApi = await HomeyAPI.forCurrentHomey(this.homey);
            this.homeyApi.devices.on('device.create', this._onDeviceCreate.bind(this));
            this.homeyApi.devices.on('device.update', this._onDeviceUpdate.bind(this));
            this.homeyApi.devices.on('device.delete', this._onDeviceDelete.bind(this));
            this.homeyApi.zones.on('zone.create', this._onZoneCreate.bind(this));
            this.homeyApi.zones.on('zone.update', this._onZoneUpdate.bind(this));
            this.homeyApi.zones.on('zone.delete', this._onZoneDelete.bind(this));
            this.homeyApiCreated = Date.now();
            this.logger.verbose(`HomeyAPI instance created`);
        } catch (err) {
            this.logger.error(`Creating HomeyAPI failed`, err);
        }
    }

    private async getSystemInfo(): Promise<any> {
        const api = await this.getOrCreateHomeyApi();
        return api.system.getInfo();
    }

    private async getUptime(): Promise<number> {
        const systemInfo = await this.getSystemInfo();
        return systemInfo.uptime;
    }

    private async isHomeyBooting(): Promise<boolean> {
        const uptime = await this.getUptime();
        if (uptime < 600) {
            this.logger.debug(`Homey is booting: Update: ${uptime} seconds.`);
            return true;
        }
        const runningDevices = Object.keys(await this.getDevices()).length;
        if (!this._lastNumRunningDevices
            || runningDevices !== this._lastNumRunningDevices) {
            this._lastNumRunningDevices = runningDevices;
            this.logger.debug(`Homey is booting: Current devices: ${runningDevices}`);
            return true;
        }
        this.logger.debug(`Homey is not booting`);
        return false;
    }

    private async getZones(): Promise<{ [key: string]: HomeyAPI.ManagerZones.Zone; }> {
        const api = await this.getOrCreateHomeyApi();
        return api.zones.getZones();
    }

    private async getZone(id: string): Promise<HomeyAPI.ManagerZones.Zone> {
        const api = await this.getOrCreateHomeyApi();
        return api.zones.getZone({id});
    }

    private async fetchZones(): Promise<void> {
        try {
            this.logger.debug(`Zones fetch started`);
            const now = Date.now();
            const zones = await this.getZones();
            this.logger.info(`Zones fetched. (${Object.keys(zones).length} in ${Date.now() - now} ms.)`);
            this.zonesObj.registerZones(zones);
        } catch (err) {
            this.logger.error(`Fetch zones failed`, err);
        }
    }

    private async getDevices(): Promise<{ [key: string]: HomeyAPI.ManagerDevices.Device; }> {
        const api = await this.getOrCreateHomeyApi();
        return api.devices.getDevices();
    }

    private async getDevice(id: string): Promise<HomeyAPI.ManagerDevices.Device> {
        const api = await this.getOrCreateHomeyApi();
        return api.devices.getDevice({id});
    }

    private async fetchDevices(): Promise<void> {
        try {
            this.logger.debug(`Devices fetch started`);
            const now = Date.now();
            const devices = await this.getDevices();
            this.logger.info(`Devices fetched. (${Object.keys(devices).length} in ${Date.now() - now} ms.)`);
            this.devicesObj.registerDevices(devices);
        } catch (err) {
            this.logger.error(`Fetch devices failed`, err);
        }
    }

    private clearRefreshTimeout(): void {
        if (this._refreshTimeout) {
            this.homey.clearTimeout(this._refreshTimeout);
        }
    }

    private scheduleRefresh(interval = REFRESH_DEFAULT_INTERVAL): void {
        this.clearRefreshTimeout();
        this._refreshTimeout = this.homey.setTimeout(this.refresh.bind(this), interval);
        this.logger.verbose(`Will refresh zones and devices in ${interval / 1000} seconds`);
    }

    private async refresh(): Promise<void> {
        try {
            await this.fetchZones();
            await this.fetchDevices();
        } catch (err) {
            this.logger.error(`Refresh zones and devices failed`, err);
        } finally {
            let homeyIsBooting;
            try {
                homeyIsBooting = await this.isHomeyBooting();
            } catch (err) {
                this.logger.error(`Failed checking if Homey is booting`, err);
                homeyIsBooting = true;
            }
            this.scheduleRefresh(homeyIsBooting ? REFRESH_BOOTING : REFRESH_DEFAULT_INTERVAL);
        }
    }

    private async _onDeviceCreate(device: HomeyAPI.ManagerDevices.Device): Promise<void> {
        this.logger.silly(`Device created: ${device.driverUri}:${device.class} - ${device.id} - ${device.name}`);
        if (this.devicesObj.validAndSupported(device)) {
            try {
                const now = Date.now();
                device = await this.getDevice(device.id);
                this.logger?.debug(`Fetched device: ${device.id} ${device.name}. (${Date.now() - now} ms.)`);
                this.devicesObj.createOrUpdateDevice(device);
            } catch (err) {
                this.logger.error('Device creation failed', err);
            }
        }
    }

    private async _onDeviceUpdate(device: HomeyAPI.ManagerDevices.Device): Promise<void> {
        this.logger.silly(`Device update: ${device.driverUri}:${device.class} - ${device.id} - ${device.name}`);
        if (this.devicesObj.validAndSupported(device)) {
            try {
                const current = this.devicesObj.getDevice(device.id);
                if (!current && !device.makeCapabilityInstance) {
                    const now = Date.now();
                    device = await this.getDevice(device.id);
                    this.logger?.debug(`Fetched device: ${device.id} ${device.name}. (${Date.now() - now} ms.)`);
                }
                this.devicesObj.createOrUpdateDevice(device);
            } catch (err) {
                this.logger.error('Device update failed', err);
            }
        }
    }

    private async _onDeviceDelete(device: HomeyAPI.ManagerDevices.Device): Promise<void> {
        this.logger.silly(`Device delete: ${device.id} - ${device.name}`);
        this.devicesObj.deleteDevice(device);
    }

    private async _onZoneCreate(zone: HomeyAPI.ManagerZones.Zone): Promise<void> {
        this.logger.silly(`Zone added: ${zone.id} - ${zone.name}`);
        try {
            const zone2 = await this.getZone(zone.id);
            this.zonesObj.createOrUpdateZone(zone2);
        } catch (err) {
            this.logger.error('Zone creation failed', err);
        }
    }

    private async _onZoneUpdate(zone: HomeyAPI.ManagerZones.Zone): Promise<void> {
        this.logger.silly(`Zone updated: ${zone.id} - ${zone.name}`);
        try {
            const zone2 = await this.getZone(zone.id);
            this.zonesObj.createOrUpdateZone(zone2);
        } catch (err) {
            this.logger.error('Zone update failed', err);
        }
    }

    private async _onZoneDelete(zone: HomeyAPI.ManagerZones.Zone): Promise<void> {
        this.logger.silly(`Zone deleted: ${zone.id}`);
        this.zonesObj.deleteZone(zone.id);
    }

    delay = (ms: number) => new Promise(resolve => this.homey.setTimeout(resolve, ms));

};