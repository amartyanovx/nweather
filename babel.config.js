module.exports = {
  presets: [
    // Compile to a version compatible with the current Node environment
    ['@babel/preset-env', { targets: { node: 'current' } }],
    // Allow TypeScript syntax
    '@babel/preset-typescript',
  ],
};