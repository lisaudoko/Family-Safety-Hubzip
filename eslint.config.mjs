import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import expoConfig from 'eslint-config-expo/flat.js';
import unusedImports from 'eslint-plugin-unused-imports';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.expo/**',
      '**/.expo-shared/**',
      '**/coverage/**',
      '**/*.tsbuildinfo',
      'artifacts/mobile/expo-env.d.ts',
      'pnpm-lock.yaml',
    ],
  },

  // Base rules for every JS/TS file in the workspace.
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    plugins: {
      'unused-imports': unusedImports,
      prettier: prettierPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'prettier/prettier': 'warn',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-imports': 'warn',
    },
  },

  // Expo/React Native rules, scoped to the mobile app only.
  {
    files: ['artifacts/mobile/**/*.{js,jsx,ts,tsx}'],
    extends: [expoConfig],
  },

  // Node.js scripts and server-side packages.
  {
    files: [
      'artifacts/api-server/**/*.ts',
      'scripts/**/*.ts',
      'lib/**/*.ts',
      '*.config.{js,mjs,cjs}',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
);
