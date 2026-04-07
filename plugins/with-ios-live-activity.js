const fs = require('fs');
const path = require('path');
const {
  createRunOncePlugin,
  withDangerousMod,
  withEntitlementsPlist,
  withInfoPlist,
  withXcodeProject,
} = require('@expo/config-plugins');
const { withConfig } = require('expo-live-activity/plugin/build/withConfig');
const { withWidgetExtensionEntitlements } = require('expo-live-activity/plugin/build/withWidgetExtensionEntitlements');
const { withXcode } = require('expo-live-activity/plugin/build/withXcode');

const pkg = require('../package.json');

const PLUGIN_NAME = 'with-ios-live-activity';
const MIN_IOS_DEPLOYMENT_TARGET = 16.2;
const TARGET_NAME = 'LiveActivity';
const TEMPLATE_ROOT = path.join(__dirname, 'ios-live-activity');
const APP_TEMPLATE_ROOT = path.join(TEMPLATE_ROOT, 'app');
const WIDGET_TEMPLATE_ROOT = path.join(TEMPLATE_ROOT, 'widget');
const APP_SOURCE_FILES = ['IosLiveActivity.swift', 'IosLiveActivityBridge.m'];
const WIDGET_SOURCE_FILES = ['LiveActivityView.swift', 'LiveActivityWidget.swift', 'LiveActivityWidgetBundle.swift'];

function toNumericVersion(version) {
  const normalized = String(version || '0').replace(/[^0-9.]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function copyFile(sourcePath, destinationPath) {
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath);
}

function copyTemplates(platformProjectRoot, projectName) {
  const appTargetRoot = path.join(platformProjectRoot, projectName);
  const widgetTargetRoot = path.join(platformProjectRoot, TARGET_NAME);

  APP_SOURCE_FILES.forEach((fileName) => {
    copyFile(path.join(APP_TEMPLATE_ROOT, fileName), path.join(appTargetRoot, fileName));
  });

  WIDGET_SOURCE_FILES.forEach((fileName) => {
    copyFile(path.join(WIDGET_TEMPLATE_ROOT, fileName), path.join(widgetTargetRoot, fileName));
  });
}

function addMainAppSourceFiles(project, projectName) {
  const appGroup = project.pbxGroupByName(projectName);
  const groupKey = appGroup?.uuid ?? project.getFirstProject().firstProject.mainGroup;
  const targetUuid = project.getFirstTarget().uuid;

  APP_SOURCE_FILES.forEach((fileName) => {
    project.addSourceFile(`${projectName}/${fileName}`, { target: targetUuid }, groupKey);
  });
}

const withIosLiveActivity = (config) => {
  const bundleIdentifier = config.ios?.bundleIdentifier;
  const widgetBundleIdentifier = bundleIdentifier
    ? `${bundleIdentifier}.${TARGET_NAME}`
    : `com.example.${TARGET_NAME}`;

  config = withInfoPlist(config, (configMod) => {
    configMod.modResults.NSSupportsLiveActivities = true;
    configMod.modResults.NSSupportsLiveActivitiesFrequentUpdates = false;
    return configMod;
  });

  config = withEntitlementsPlist(config, (configMod) => {
    configMod.modResults['com.apple.developer.usernotifications.time-sensitive'] = true;
    return configMod;
  });

  config = withConfig(config, {
    targetName: TARGET_NAME,
    bundleIdentifier: widgetBundleIdentifier,
  });

  config = withWidgetExtensionEntitlements(config, {
    targetName: TARGET_NAME,
  });

  config = withXcode(config, {
    targetName: TARGET_NAME,
    bundleIdentifier: widgetBundleIdentifier,
    deploymentTarget: String(MIN_IOS_DEPLOYMENT_TARGET),
  });

  config = withDangerousMod(config, [
    'ios',
    async (configMod) => {
      copyTemplates(configMod.modRequest.platformProjectRoot, configMod.modRequest.projectName);
      return configMod;
    },
  ]);

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

    addMainAppSourceFiles(project, configMod.modRequest.projectName);
    return configMod;
  });

  return config;
};

module.exports = createRunOncePlugin(withIosLiveActivity, PLUGIN_NAME, pkg.version);
