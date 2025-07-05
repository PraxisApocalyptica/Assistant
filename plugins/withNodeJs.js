const { 
  withAppBuildGradle, 
  withAndroidManifest, 
  withProjectBuildGradle
} = require('@expo/config-plugins');
const { AndroidConfig } = require('@expo/config-plugins');

/**
 * This mod configures your app's main build.gradle to correctly package the ABIs
 * for nodejs-mobile.
 */
const withAppBuildGradleForNodeJs = (config) => {
  return withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;
    const splitsBlock = `
      splits {
          abi {
              reset()
              enable true
              include "armeabi-v7a", "arm64-v8a"
              universalApk false
          }
      }`;

    if (!buildGradle.includes('splits {')) {
        buildGradle = buildGradle.replace(
            /(android\s*{)/,
            `$1${splitsBlock}`
        );
    }
    config.modResults.contents = buildGradle;
    return config;
  });
};

/**
 * This mod configures AndroidManifest.xml for background services.
 * It adds necessary permissions and declares the service for react-native-background-actions.
 */
const withBackgroundPermissions = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;

    // 1. Add required permissions
    const permissions = [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.WAKE_LOCK',
      'android.permission.RECEIVE_BOOT_COMPLETED',
    ];
    for (const permission of permissions) {
      AndroidConfig.Permissions.addPermission(manifest, permission);
    }

    // 2. Add or modify the service declaration in the <application> tag
    const serviceName = 'com.asterinet.react.bgactions.RNBackgroundActionsTask';
    let application = manifest.application[0];
    if (!application.service) {
      application.service = [];
    }

    // Find the service if it already exists
    let service = application.service.find(
      s => s.$['android:name'] === serviceName
    );

    if (!service) {
      // If service doesn't exist, create it and add it to the array
      service = { $: { 'android:name': serviceName } };
      application.service.push(service);
    }
    
    // *** THE FIX IS HERE ***
    // Ensure the foregroundServiceType is set. This is required for Android 14+ (targetSDK 34+).
    // The 'dataSync' type is most appropriate for background tasks that perform network operations.
    service.$['android:foregroundServiceType'] = 'dataSync';
    
    return config;
  });
};

const withLocalMavenRepoForBackgroundFetch = (config) => {
  return withProjectBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;
    const mavenBlock = `
    maven {
        // Local Maven repo for react-native-background-fetch, used as a fallback
        url("${project(':react-native-background-fetch').projectDir}/libs")
    }
    `;

    // Check if the block is already there to make the mod idempotent
    if (buildGradle.includes("project(':react-native-background-fetch').projectDir")) {
      return config;
    }

    // Add the new maven block inside the repositories block
    const anchor = 'repositories {';
    config.modResults.contents = buildGradle.replace(anchor, `${anchor}${mavenBlock}`);
    
    return config;
  });
};


/**
 * The main plugin that chains all the necessary modifications.
 */
const withNodeJs = (config) => {
  // 1. Configure build.gradle for ABI splits.
  config = withAppBuildGradleForNodeJs(config);
  
  // 2. Configure AndroidManifest.xml for background execution.
  config = withBackgroundPermissions(config);

  // 3. Add the local Maven repository for background-fetch.
  config = withLocalMavenRepoForBackgroundFetch(config);

  return config;
};

module.exports = withNodeJs;
