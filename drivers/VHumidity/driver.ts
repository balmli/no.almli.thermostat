import { BaseDriver } from '../../lib/BaseDriver';

module.exports = class VHumidityDriver extends BaseDriver {

  getDriverName(): string {
    return 'VHumidity';
  }

};
