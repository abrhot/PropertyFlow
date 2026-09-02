// Metro config for the PropertyFlow monorepo (pnpm workspace).
// Keep projectRoot on the mobile app so release embed bundling does not
// resolve entries from the monorepo root.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Force the Expo app directory as the Metro project root.
config.projectRoot = projectRoot;

// Watch shared packages, but do not make the monorepo root the app root.
config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
