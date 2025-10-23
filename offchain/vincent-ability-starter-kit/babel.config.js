// This handles transpiling ESM-native dependencies to CJS for Jest
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }]],
};
