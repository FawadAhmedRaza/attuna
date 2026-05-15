// Minimal process.env typing for the Expo bundle. Expo Router /
// Metro inline `EXPO_PUBLIC_*` env vars at build time so they're
// available as `process.env.EXPO_PUBLIC_FOO` in the running app. The
// `expo/tsconfig.base` we extend doesn't pull in @types/node, and
// we don't want to (Node types pollute the type space with APIs
// that don't exist in React Native). This file declares the bits
// we use, nothing more.

declare const process: {
  env: {
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_COGNITO_USER_POOL_ID?: string;
    EXPO_PUBLIC_COGNITO_CLIENT_ID?: string;
    [key: string]: string | undefined;
  };
};
