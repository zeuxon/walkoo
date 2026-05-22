const { getDefaultConfig } = require('expo/metro-config');
const nodeLibs = require('node-libs-react-native');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// viem / permissionless use the "exports" field in package.json
config.resolver.unstable_enablePackageExports = true;

// Polyfill Node built-ins (buffer, stream, crypto, …) for blockchain deps
config.resolver.extraNodeModules = {
  ...nodeLibs,
  buffer: require.resolve('buffer'),
};

// @noble/hashes omits crypto.js from its exports map - resolve it manually
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@noble/hashes/crypto.js' || moduleName === '@noble/hashes/crypto') {
    let dir = path.dirname(context.originModulePath);
    while (true) {
      const candidate = path.join(dir, 'node_modules', '@noble', 'hashes', 'crypto.js');
      if (fs.existsSync(candidate)) return { filePath: candidate, type: 'sourceFile' };
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
