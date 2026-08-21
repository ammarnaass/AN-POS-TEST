/**
 * Babel config for React Native 0.76
 * - metro-react-native-babel-preset: standard RN transpilation
 * - module-resolver: resolves @/ → ./src  and @shared/ → ./shared
 */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['.'],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          '@': './src',
          '@shared': './shared',
        },
      },
    ],
  ],
};
