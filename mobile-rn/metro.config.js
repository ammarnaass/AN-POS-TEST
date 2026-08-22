const path = require('path');

let getDefaultConfig, mergeConfig;

try {
  ({ getDefaultConfig, mergeConfig } = require('@react-native/metro-config'));
} catch (e) {
  try {
    const metroConfig = require('metro-config');
    getDefaultConfig = (dir) => metroConfig.getDefaultConfig.getDefaultValues(dir || __dirname);
    mergeConfig = metroConfig.mergeConfig;
  } catch (err) {
    getDefaultConfig = () => ({});
    mergeConfig = (a, b) => ({ ...a, ...b });
  }
}

const assetRegistryPath = path.resolve(__dirname, 'node_modules/@react-native/assets-registry/registry.js');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    extraNodeModules: {
      'react-native/asset-registry': assetRegistryPath,
      'asset-registry': assetRegistryPath,
    },
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'react-native/asset-registry' || moduleName === 'asset-registry') {
        return {
          filePath: assetRegistryPath,
          type: 'sourceFile',
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

