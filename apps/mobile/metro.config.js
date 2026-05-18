// Metro bundler config for the Expo app inside a pnpm monorepo.
//
// pnpm's strict node_modules layout doesn't hoist deps to the root by
// default, so Metro's default resolver — which only walks up
// node_modules from the project root — misses transitive deps that
// live in `<repo>/node_modules/.pnpm/...`. We tell Metro to:
//
//   1. Watch the whole monorepo, not just apps/mobile (so changes in
//      shared packages trigger reloads).
//   2. Resolve from BOTH apps/mobile/node_modules AND the repo root
//      node_modules. pnpm symlinks each direct dep into the package's
//      node_modules; root node_modules holds the .pnpm store.
//
// Reference: https://docs.expo.dev/guides/monorepos/

const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// pnpm symlinks → Metro must follow them.
config.resolver.unstable_enableSymlinks = true;
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
