import {defineConfig} from 'vitest/config';
import path from 'node:path';

export default defineConfig({
    resolve: {
        alias: {
            homey: path.resolve(process.cwd(), 'tests/mocks/homey.ts'),
        },
    },
    test: {
        setupFiles: ['./tests/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['lib/**/*.{js,ts}'],
            thresholds: {
                branches: 75,
                functions: 90,
                lines: 90,
                statements: 90,
            },
        },
        restoreMocks: true,
    },
});
