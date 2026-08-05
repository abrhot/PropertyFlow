// Metro config for the PropertyFlow monorepo (pnpm workspace).
// It watches the repo root so changes in shared `packages/*` are picked up,
// and resolves modules from both the app and the workspace root.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch shared packages at the repo root.
config.watchFolders = [monorepoRoot];

// 2. Resolve dependencies from the app first, then the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. pnpm uses symlinks + a `.pnpm` virtual store; let Metro follow them and
//    honor each package's "exports" map (our shared packages point to dist/).
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
