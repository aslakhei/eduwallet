const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Add directories to watchFolders so Metro watches them for changes
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(workspaceRoot, 'sdk'),
  path.resolve(workspaceRoot, 'typechain-types'),
];

// Configure resolver to handle the symlink and typechain-types
config.resolver = {
  ...config.resolver,
  // Resolve the symlink to the actual SDK directory and typechain-types
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
    'eduwallet-sdk': path.resolve(workspaceRoot, 'sdk/dist'),
    'typechain-types': path.resolve(workspaceRoot, 'typechain-types'),
  },
  // Ensure Metro can resolve .js, .mjs, .cjs files
  sourceExts: [...(config.resolver.sourceExts || []), 'js', 'mjs', 'cjs'],
  // Add node_modules resolution from parent directory
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ],
};

module.exports = config;