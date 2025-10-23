const nx = require('@nx/eslint-plugin');

const { createTypeScriptImportResolver } = require('eslint-import-resolver-typescript');
const pluginImportX = require('eslint-plugin-import-x');
const perfectionist = require('eslint-plugin-perfectionist');

module.exports = [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/generated/**', '**/docs/html/**/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?js$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          buildTargets: ['build'],
          checkVersionMismatches: true,
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs}',
            '{projectRoot}/jest.config.{js,cjs,mjs,ts}',
            '{projectRoot}/vite.config.*',
            '{projectRoot}/esbuild.config.{js,cjs,mjs}',
          ],
        },
      ],
    },
    languageOptions: {
      parser: require('jsonc-eslint-parser'),
    },
  },

  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mjs'],
    ...{
      plugins: { perfectionist },
      rules: {
        'perfectionist/sort-imports': [
          'error',
          {
            type: 'natural',
            internalPattern: ['^@lit-protocol/'],
            groups: [
              'type-import',
              'value-builtin',
              'value-external',
              'type-internal',
              'value-internal',
              ['type-parent', 'type-sibling', 'type-index'],
              ['value-parent', 'value-sibling', 'value-index'],
              'ts-equals-import',
              'unknown',
            ],
          },
        ],
      },
    },
  },
  { files: ['**/*.ts', '**/*.tsx'], ...pluginImportX.flatConfigs.recommended },
  { files: ['**/*.ts', '**/*.tsx'], ...pluginImportX.flatConfigs.typescript },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        allowDefaultProject: true,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error'],
      '@typescript-eslint/no-floating-promises': 'off',
      'import-x/consistent-type-specifier-style': ['error', 'prefer-top-level'],
      'import-x/no-duplicates': ['error'],
      'import-x/no-extraneous-dependencies': ['off'], // NX provides already
      'import-x/no-relative-packages': ['error'],
      'import-x/no-unresolved': ['off'], // Fails to resolve `workspace:*` only in GH actions :(
      'import-x/prefer-default-export': ['off'],
      'no-await-in-loop': 'off',
      'no-param-reassign': 'error',
      'no-underscore-dangle': ['off'],
      'no-useless-escape': 'off',
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver()],
      'import/internal-regex': '^@lit-protocol/',
    },
  },
];
