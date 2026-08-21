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

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
