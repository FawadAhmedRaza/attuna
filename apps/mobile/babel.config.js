// Babel config for the Expo app. expo-router needs no extra plugin in
// SDK 50+; the `babel-preset-expo` already wires it. Kept minimal so
// future plugin additions (e.g. reanimated) are an obvious one-line
// change.

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
