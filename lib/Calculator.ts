import {Zones} from './Zones';
import {Devices} from './Devices';
import {DeviceRequests} from './types';
import {VThermoDeviceCalculator} from './VThermoDeviceCalculator';
import {VHumidityDeviceCalculator} from './VHumidityDeviceCalculator';

const DEFAULT_CALCULATION_DELAY = 500;

export class Calculator {
    private zonesObj!: Zones;
    private devicesObj!: Devices;
    private homey: any;
    private logger: any;
    private _calculateTimeout: any;
    private _destroyed = false;
    private vThermoCalculator: VThermoDeviceCalculator;
    private vHumidityCalculator: VHumidityDeviceCalculator;

    constructor(zonesObj: Zones, devicesObj: Devices, homey?: any, logger?: any) {
        this.zonesObj = zonesObj;
        this.devicesObj = devicesObj;
        this.homey = homey;
        this.logger = logger;
        this.vThermoCalculator = new VThermoDeviceCalculator(zonesObj, devicesObj, logger);
        this.vHumidityCalculator = new VHumidityDeviceCalculator(zonesObj, devicesObj, logger);
    }

    async destroy(): Promise<void> {
        this._destroyed = true;
        this.clearCalculationTimeout();
        await this.executeFailSafe('App shutdown');
        this.clearCalculationTimeout();
    }

    private clearCalculationTimeout(): void {
        if (this._calculateTimeout) {
            this.homey?.clearTimeout(this._calculateTimeout);
            this._calculateTimeout = undefined;
        }
    }

    startCalculation(delay = DEFAULT_CALCULATION_DELAY): void {
        if (this._destroyed) {
            return;
        }
        this.clearCalculationTimeout();
        this._calculateTimeout = this.homey?.setTimeout(this.execCalculate.bind(this), delay);
        this.logger?.debug(`Will calculate in ${delay} ms.`);
    }

    private async execCalculate(): Promise<void> {
        try {
            const calculationResponse = this.calculateDeviceRequests();
            const uniqueRequests = DeviceRequests.unique(calculationResponse);
            await this.devicesObj.updateDevices(uniqueRequests);
        } catch (err) {
            this.logger?.error(`Calculation failed`, err);
            await this.executeFailSafe('Calculation failed');
        }
    }

    private async executeFailSafe(reason: string): Promise<void> {
        try {
            const requests = new DeviceRequests();
            const zones = this.zonesObj.getZonesAsList(this.zonesObj.getZones());
            for (const zone of zones) {
                requests.addRequests(this.vThermoCalculator.calculateFailSafe(zone));
            }
            const uniqueRequests = DeviceRequests.unique(requests);
            if (uniqueRequests.getRequests().length > 0) {
                this.logger?.warn(`${reason}: turning configured heaters off`, uniqueRequests);
                await this.devicesObj.updateDevices(uniqueRequests);
            }
        } catch (err) {
            this.logger?.error(`Fail-safe heater shutdown failed`, err);
        }
    }

    calculateDeviceRequests(): DeviceRequests {
        const now = Date.now();
        const requests = new DeviceRequests();
        const zones = this.zonesObj.getZonesAsList(this.zonesObj.getZones());
        for (const zone of zones) {
            requests.addRequests(this.vThermoCalculator.calculate(zone));
            requests.addRequests(this.vHumidityCalculator.calculate(zone));
        }
        if (requests.getRequests().length > 0) {
            this.logger?.verbose(`Calculated device requests: (${Date.now() - now} ms)`, requests);
        }
        return requests;
    }
}
