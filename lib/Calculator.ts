import {Zones} from './Zones';
import {Devices} from './Devices';
import {DeviceRequests} from './types';
import {VThermoDeviceCalculator} from './VThermoDeviceCalculator';
import {VHumidityDeviceCalculator} from './VHumidityDeviceCalculator';

const DEFAULT_CALCULATION_DELAY = 500;
const CALCULATION_FAILURE_RETRY_DELAYS = [5000, 30000, 120000];

export class Calculator {
    private zonesObj!: Zones;
    private devicesObj!: Devices;
    private homey: any;
    private logger: any;
    private _calculateTimeout: any;
    private _calculationFailureCount = 0;
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

    destroy(): void {
        this.clearCalculationTimeout();
    }

    private clearCalculationTimeout(): void {
        if (this._calculateTimeout) {
            this.homey?.clearTimeout(this._calculateTimeout);
        }
    }

    startCalculation(delay = DEFAULT_CALCULATION_DELAY): void {
        this._calculationFailureCount = 0;
        this.scheduleCalculation(delay);
    }

    private scheduleCalculation(delay: number): void {
        this.clearCalculationTimeout();
        this._calculateTimeout = this.homey?.setTimeout(this.execCalculate.bind(this), delay);
        this.logger?.debug(`Will calculate in ${delay} ms.`);
    }

    private async execCalculate(): Promise<void> {
        try {
            const calculationResponse = this.calculateDeviceRequests();
            const uniqueRequests = DeviceRequests.unique(calculationResponse);
            await this.devicesObj.updateDevices(uniqueRequests);
            this._calculationFailureCount = 0;
        } catch (err) {
            this.logger?.error(`Calculation failed`, err);
            const retryDelay = CALCULATION_FAILURE_RETRY_DELAYS[this._calculationFailureCount];
            if (retryDelay !== undefined) {
                this._calculationFailureCount += 1;
                this.logger?.warn?.(
                    `Retrying calculation in ${retryDelay} ms (${this._calculationFailureCount}/${CALCULATION_FAILURE_RETRY_DELAYS.length})`,
                );
                this.scheduleCalculation(retryDelay);
            } else {
                this.logger?.error(`Calculation recovery stopped after ${this._calculationFailureCount} retries`);
            }
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
