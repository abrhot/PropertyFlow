/**
 * Node wrapper for Android release bundling in the monorepo.
 * Forces Expo/Metro to use the app project root (not the workspace root).
 */
process.env.EXPO_NO_METRO_WORKSPACE_ROOT = '1';
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const { spawnSync } = require('child_process');
const result = spawnSync(process.execPath, process.argv.slice(2), {
  stdio: 'inherit',
  env: process.env,
  shell: false,
});

process.exit(result.status == null ? 1 : result.status);
