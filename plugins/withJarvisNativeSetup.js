/**
 * JARVIS Expo Config Plugin
 */

const { withAndroidManifest, withMainApplication, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const DEFAULT_PACKAGE = 'com.jarvis.assistant';

function getAndroidPackage(config) {
  return config.android?.package || config?.expo?.android?.package || DEFAULT_PACKAGE;
}

function packageToJavaPath(packageName) {
  return packageName.split('.').join(path.sep);
}

function hasJarvisPackageRegistration(contents, isKotlin) {
  if (isKotlin) {
    return /\badd\(\s*JarvisPackage\(\)\s*\)/.test(contents) || /\bpackages\.add\(\s*JarvisPackage\(\)\s*\)/.test(contents);
  }
  return /packages\.add\(\s*new\s+JarvisPackage\(\)\s*\)/.test(contents);
}

function injectJarvisPackage(contents, isKotlin) {
  let newContents = contents;

  if (isKotlin) {
    if (!hasJarvisPackageRegistration(newContents, true)) {
      newContents = newContents.replace(
        /(PackageList\([^)]*\)\.packages\.apply\s*\{\s*\n?)/,
        '$1      add(JarvisPackage())\n'
      );
    }

    if (!hasJarvisPackageRegistration(newContents, true)) {
      const lastPackageAddMatch = newContents.lastIndexOf('packages.add(');
      if (lastPackageAddMatch > -1) {
        const endOfLine = newContents.indexOf('\n', lastPackageAddMatch);
        if (endOfLine > -1) {
          const beforeInsert = newContents.substring(0, endOfLine + 1);
          const afterInsert = newContents.substring(endOfLine + 1);
          newContents = `${beforeInsert}      packages.add(JarvisPackage())\n${afterInsert}`;
        }
      }
    }

    if (!hasJarvisPackageRegistration(newContents, true)) {
      newContents = newContents.replace(
        /(val\s+packages\s*=\s*PackageList\([^)]*\)\.packages\s*\n)/,
        '$1      packages.add(JarvisPackage())\n'
      );
    }
  } else {
    if (!hasJarvisPackageRegistration(newContents, false)) {
      newContents = newContents.replace(
        /(PackageList\([^)]*\)\.getPackages\(\);\s*\n)/,
        '$1        packages.add(new JarvisPackage());\n'
      );
    }

    if (!hasJarvisPackageRegistration(newContents, false)) {
      const packagesMatch = newContents.match(/(packages\.add\([^)]+\);[\s\n]*)/);
      if (packagesMatch) {
        newContents = newContents.replace(
          packagesMatch[0],
          `${packagesMatch[0]}        packages.add(new JarvisPackage());\n`
        );
      }
    }
  }

  return newContents;
}

function getMainApplicationPackage(contents, fallbackPackage) {
  const packageMatch = contents.match(/^package\s+([\w.]+)/m);
  return packageMatch ? packageMatch[1] : fallbackPackage;
}

function rewritePackageReferences(content, targetPackage) {
  if (targetPackage === DEFAULT_PACKAGE) return content;

  return content
    .replace(/^package\s+com\.jarvis\.assistant\b/m, `package ${targetPackage}`)
    .replace(/\bcom\.jarvis\.assistant\./g, `${targetPackage}.`);
}

const withJarvisManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    if (!manifest.manifest['uses-permission']) {
      manifest.manifest['uses-permission'] = [];
    }

    const permissions = manifest.manifest['uses-permission'];
    const shizukuPermission = {
      $: {
        'android:name': 'moe.shizuku.manager.permission.API_V23',
      },
    };

    const hasShizukuPermission = permissions.some(
      (p) => p.$ && p.$['android:name'] === 'moe.shizuku.manager.permission.API_V23'
    );

    if (!hasShizukuPermission) {
      permissions.push(shizukuPermission);
      console.log('[withJarvisNativeSetup] Added Shizuku API_V23 permission');
    }

    const application = manifest.manifest.application;
    if (!application || !application[0]) {
      console.warn('[withJarvisNativeSetup] No application tag found in manifest');
      return config;
    }

    const accessibilityService = {
      $: {
        'android:name': '.JarvisAccessibilityService',
        'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
        'android:exported': 'true',
      },
      'intent-filter': [
        {
          $: {},
          action: [
            {
              $: {
                'android:name': 'android.accessibilityservice.AccessibilityService',
              },
            },
          ],
        },
      ],
      'meta-data': [
        {
          $: {
            'android:name': 'android.accessibilityservice',
            'android:resource': '@xml/accessibility_service_config',
          },
        },
      ],
    };

    const vpnService = {
      $: {
        'android:name': '.JarvisVpnService',
        'android:permission': 'android.permission.BIND_VPN_SERVICE',
        'android:exported': 'true',
      },
      'intent-filter': [
        {
          $: {},
          action: [
            {
              $: {
                'android:name': 'android.net.VpnService',
              },
            },
          ],
        },
      ],
    };

    const appNode = application[0];
    const services = Array.isArray(appNode.service) ? [...appNode.service] : [];

    if (!services.some((s) => s.$ && s.$['android:name'] === '.JarvisAccessibilityService')) {
      services.push(accessibilityService);
      console.log('[withJarvisNativeSetup] Added AccessibilityService to manifest');
    }

    if (!services.some((s) => s.$ && s.$['android:name'] === '.JarvisVpnService')) {
      services.push(vpnService);
      console.log('[withJarvisNativeSetup] Added VpnService to manifest');
    }

    appNode.service = services;
    return config;
  });
};

const withJarvisPackage = (config) => {
  return withMainApplication(config, (config) => {
    const isKotlin = config.modResults.language === 'kotlin';
    let newContents = config.modResults.contents;
    const fallbackPackage = getAndroidPackage(config.modRequest.projectConfig || config.modRequest.exp || {});
    const mainApplicationPackage = getMainApplicationPackage(newContents, fallbackPackage);

    const importStatement = isKotlin
      ? `import ${mainApplicationPackage}.JarvisPackage`
      : `import ${mainApplicationPackage}.JarvisPackage;`;

    if (!newContents.includes(importStatement)) {
      const packageMatch = newContents.match(/(package\s+[\w.]+;?\n)/);
      if (packageMatch) {
        newContents = newContents.replace(packageMatch[0], `${packageMatch[0]}\n${importStatement}\n`);
      }
    }

    newContents = injectJarvisPackage(newContents, isKotlin);

    if (!hasJarvisPackageRegistration(newContents, isKotlin)) {
      throw new Error(
        '[withJarvisNativeSetup] Failed to register JarvisPackage in MainApplication. Aborting prebuild to prevent broken APK.'
      );
    }

    config.modResults.contents = newContents;
    console.log('[withJarvisNativeSetup] MainApplication modification complete');
    return config;
  });
};

const withJarvisNativeModules = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidRoot = config.modRequest.platformProjectRoot;
      const androidPackage = getAndroidPackage(config);

      const sourceDir = path.join(
        projectRoot,
        'src',
        'native',
        'android',
        'app',
        'src',
        'main',
        'java',
        'com',
        'jarvis',
        'assistant'
      );

      const targetDir = path.join(
        androidRoot,
        'app',
        'src',
        'main',
        'java',
        packageToJavaPath(androidPackage)
      );

      console.log('[withJarvisNativeSetup] Source dir:', sourceDir);
      console.log('[withJarvisNativeSetup] Target dir:', targetDir);
      console.log('[withJarvisNativeSetup] Android package:', androidPackage);

      if (!fs.existsSync(sourceDir)) {
        throw new Error(
          `[withJarvisNativeSetup] Source directory not found: ${sourceDir}. Native modules are required for production APK.`
        );
      }

      fs.mkdirSync(targetDir, { recursive: true });
      fs.mkdirSync(path.join(targetDir, 'modules'), { recursive: true });

      const files = getAllKotlinFiles(sourceDir);
      if (!files.length) {
        throw new Error('[withJarvisNativeSetup] No Kotlin files found to copy. Aborting prebuild.');
      }

      console.log(`[withJarvisNativeSetup] Found ${files.length} Kotlin files to copy`);

      files.forEach((file) => {
        const relativePath = path.relative(sourceDir, file);
        const targetFile = path.join(targetDir, relativePath);
        const targetFileDir = path.dirname(targetFile);

        if (!fs.existsSync(targetFileDir)) {
          fs.mkdirSync(targetFileDir, { recursive: true });
        }

        const sourceContent = fs.readFileSync(file, 'utf8');
        const patchedContent = rewritePackageReferences(sourceContent, androidPackage);
        fs.writeFileSync(targetFile, patchedContent);
        console.log(`[withJarvisNativeSetup] Copied: ${relativePath}`);
      });

      const xmlDir = path.join(androidRoot, 'app', 'src', 'main', 'res', 'xml');
      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
      }

      const accessibilityConfig = path.join(xmlDir, 'accessibility_service_config.xml');
      const accessibilityXml = `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeAllMask"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagDefault|flagRequestTouchExplorationMode"
    android:canPerformGestures="true"
    android:canRetrieveWindowContent="true"
    android:description="@string/accessibility_service_description"
    android:notificationTimeout="100"
    android:settingsActivity="${androidPackage}.MainActivity" />
`;
      fs.writeFileSync(accessibilityConfig, accessibilityXml);
      console.log('[withJarvisNativeSetup] Ensured accessibility_service_config.xml');

      const stringsPath = path.join(androidRoot, 'app', 'src', 'main', 'res', 'values', 'strings.xml');
      if (fs.existsSync(stringsPath)) {
        let stringsContent = fs.readFileSync(stringsPath, 'utf8');
        if (!stringsContent.includes('accessibility_service_description')) {
          stringsContent = stringsContent.replace(
            '</resources>',
            '    <string name="accessibility_service_description">JARVIS Accessibility Service enables system-wide gestures and automation for hands-free control.</string>\n</resources>'
          );
          fs.writeFileSync(stringsPath, stringsContent);
          console.log('[withJarvisNativeSetup] Added accessibility service description string');
        }
      }

      return config;
    },
  ]);
};

function getAllKotlinFiles(dir) {
  const files = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getAllKotlinFiles(fullPath));
    } else if (item.endsWith('.kt')) {
      files.push(fullPath);
    }
  }

  return files;
}

module.exports = function withJarvisNativeSetup(config) {
  config = withJarvisManifest(config);
  config = withJarvisPackage(config);
  config = withJarvisNativeModules(config);
  return config;
};
