// Customized version of Nx's default Jest preset that ensures known ESM-native deps are transformed to CJS for Jest

const ESM_NATIVE_DEPS = [
  'cbor2',
  '@noble/secp256k1',
  '@cto.af/wtf8',
  '@account-kit/[^/]+',
  '@aa-sdk/[^/]+',
  '@t3-oss/[^/]+',
];

function buildTransformIgnorePatterns(extra = []) {
  const all = [...ESM_NATIVE_DEPS, ...extra];

  // classic node_modules/ … allow either our list OR .pnpm subtree
  const classic = `node_modules/(?!((?:${all.join('|')})(?:[\\/]|$)|\\.pnpm/))`;

  // pnpm realpaths: scope/name => scope+name
  const toPnpm = (p) => (p.startsWith('@') ? p.replace('/', '\\+') : p);
  const pnpm = `node_modules/.pnpm/(?!((?:${all.map(toPnpm).join('|')}))@)`;

  return [classic, pnpm];
}

module.exports = {
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  resolver: '@nx/jest/plugins/resolver',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'html'],
  coverageReporters: ['html'],

  transform: {
    // TS/HTML via ts-jest (as before)
    '^.+\\.(ts|tsx|html)$': [
      'ts-jest',
      { tsconfig: '<rootDir>/tsconfig.spec.json', isolatedModules: true },
    ],

    // JS (incl. mjs/cjs) via babel-jest with inline preset that forces CJS output
    '^.+\\.[mc]?jsx?$': [
      'babel-jest',
      {
        babelrc: false, // don't look for .babelrc in packages
        configFile: false, // don't look for babel.config.js
        presets: [['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }]],
      },
    ],
  },

  // IMPORTANT:
  // 1) First rule MUST let ".pnpm/" through so the second rule can handle pnpm realpaths.
  // 2) Second rule allow-lists ESM deps under node_modules/.pnpm/<name>@.../node_modules/<name>/...
  transformIgnorePatterns: buildTransformIgnorePatterns(),

  testEnvironment: 'node',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'require', 'default'],
  },
};
