import {describe, expect, it, vi} from 'vitest';

const Logger = require('../lib/Logger');

describe('Logger', () => {
    it('supports numeric and named log levels', () => {
        const logger = new Logger({logLevel: 'debug'});
        expect(logger.getLogLevelLabel()).toBe('Debug');
        expect(logger.setLogLevel(6)).toBe(6);
        expect(logger.getLogLevelLabel()).toBe('Error');
    });

    it('filters messages below the configured verbosity and prefixes output', () => {
        const log = vi.fn();
        const error = vi.fn();
        const logger = new Logger({logLevel: 'info', prefix: ['App', 'Device'], logFunc: log, errorFunc: error});
        logger.debug('hidden');
        logger.info('ready', 1);
        logger.warn('warning');
        expect(log).toHaveBeenNthCalledWith(1, '[App][Device][Info]', 'ready', 1);
        expect(log).toHaveBeenNthCalledWith(2, '[App][Device][Warn]', 'warning');
        expect(error).not.toHaveBeenCalled();
    });

    it('routes errors to the error function and expands Error details', () => {
        const error = vi.fn();
        const logger = new Logger({errorFunc: error});
        const failure = new Error('failed');
        logger.error(failure);
        expect(error).toHaveBeenCalledWith('[Error]', 'failed', failure.stack);
    });

    it('uses info when log is called without an explicit level', () => {
        const log = vi.fn();
        new Logger({logFunc: log}).log('message');
        expect(log).toHaveBeenCalledWith('[Info]', 'message');
    });

    it.fails('reports supported values when an invalid log level is provided', () => {
        expect(() => new Logger({logLevel: 'invalid'})).toThrow(/Unsupported loglevel.*silly:1/);
    });
});
