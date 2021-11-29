import Homey from 'homey';

const Logger = require('./Logger');

export class BaseDevice extends Homey.Device {

    logger: any;

    async onInit(): Promise<void> {
        this.logger = new Logger({
            logFunc: this.log,
            errorFunc: this.error,
        });
    }

    getDevicesSettings(): any {
        return {
            zone: {
                clazz: true
            }
        };
    }

}
