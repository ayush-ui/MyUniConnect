const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// Resolve modules from workspace root first, then project
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Keep test files out of the app bundle. Expo Router's require.context scans the
// whole `app/` tree, so colocated `*.spec.tsx` screens would otherwise be bundled
// and pull in `@testing-library/react-native` (Node-only) → native bundling fails.
// Jest uses its own config and is unaffected.
const blockPatterns = [/.*\.(spec|test)\.[jt]sx?$/, /.*\/__tests__\/.*/];
const existingBlockList = config.resolver.blockList;
if (existingBlockList) {
  blockPatterns.push(...(Array.isArray(existingBlockList) ? existingBlockList : [existingBlockList]));
}
config.resolver.blockList = new RegExp(blockPatterns.map((re) => re.source).join('|'));

module.exports = withNativeWind(config, { input: './global.css' });
