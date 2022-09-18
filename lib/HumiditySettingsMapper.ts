import {
    DRIVER_URI,
    DRIVER_VHUMIDITY,
    HumiditySettings,
} from "./types";

export class HumiditySettingsMapper {

    static map(driverUri?: string, driverId?: string, settings?: any): HumiditySettings | undefined {
        if (driverUri === DRIVER_URI
            && driverId === DRIVER_VHUMIDITY
            && settings) {
            const t = new HumiditySettings();
            t.calcMethod = settings.calc_method_humidity;
            t.measurementMaxAge = !!settings.ignore_old_measurements ? settings.ignore_old_measurements * 1000 : undefined;

            return t;
        }
    }

}