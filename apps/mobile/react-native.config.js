/**
 * Force correct Expo package import. Expo's Android namespace is `expo.core`,
 * but ExpoModulesPackage lives in `expo.modules` — without this, PackageList
 * generates a broken `import expo.core.ExpoModulesPackage`.
 */
module.exports = {
  dependencies: {
    expo: {
      platforms: {
        android: {
          packageImportPath: 'import expo.modules.ExpoModulesPackage;',
          packageInstance: 'new ExpoModulesPackage()',
        },
      },
    },
  },
};
