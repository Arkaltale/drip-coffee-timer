const {
  createRunOncePlugin,
  withEntitlementsPlist,
  withInfoPlist,
  withXcodeProject,
} = require('@expo/config-plugins');

const pkg = require('../package.json');

const PLUGIN_NAME = 'with-ios-live-activity';
const MIN_IOS_DEPLOYMENT_TARGET = 16.2;

function toNumericVersion(version) {
  const normalized = String(version || '0').replace(/[^0-9.]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

const withIosLiveActivity = (config) => {
  config = withInfoPlist(config, (configMod) => {
    configMod.modResults.NSSupportsLiveActivities = true;
    return configMod;
  });

  config = withEntitlementsPlist(config, (configMod) => {
    configMod.modResults['com.apple.developer.usernotifications.time-sensitive'] = true;
    return configMod;
  });

  config = withXcodeProject(config, (configMod) => {
    const project = configMod.modResults;
    const buildConfigSection = project.pbxXCBuildConfigurationSection();

    Object.keys(buildConfigSection).forEach((key) => {
      const entry = buildConfigSection[key];
      if (!entry || typeof entry !== 'object' || !entry.buildSettings) return;

      const currentTarget = toNumericVersion(entry.buildSettings.IPHONEOS_DEPLOYMENT_TARGET);
      if (currentTarget < MIN_IOS_DEPLOYMENT_TARGET) {
        entry.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = String(MIN_IOS_DEPLOYMENT_TARGET);
      }
    });

    return configMod;
  });

  return config;
};

module.exports = createRunOncePlugin(withIosLiveActivity, PLUGIN_NAME, pkg.version);
