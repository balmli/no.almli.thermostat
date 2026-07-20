import js from '@eslint/js';
import {defineConfig, globalIgnores} from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(globalIgnores(['build/', '.homeybuild/']), {
    files: ['**/*.{js,ts}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
        globals: globals.node,
        parserOptions: {
            project: './tsconfig.eslint.json',
            tsconfigRootDir: import.meta.dirname,
        },
    },
    rules: {
        'no-unused-vars': 'off',
        'no-extra-boolean-cast': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'no-empty': 'off',
        'no-prototype-builtins': 'off',
        'prefer-const': 'off',
        'preserve-caught-error': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-unused-expressions': 'off',
    },
});
