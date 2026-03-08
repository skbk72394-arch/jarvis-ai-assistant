/**
 * JARVIS Expo Config Plugin
 * 
 * This plugin automatically configures native Android code during prebuild:
 * 1. Injects Accessibility and VPN service declarations into AndroidManifest.xml
 * 2. Adds Shizuku permission for elevated privileges
 * 3. Registers JarvisPackage in MainApplication.java (or MainApplication.kt)
 * 4. Copies native Kotlin module files from src/native/android to the generated project
 * 
 * Usage in app.json:
 * {
 *   "expo": {
 *     "plugins": [
 *       ["./plugins/withJarvisNativeSetup", {}]
 *     ]
 *   }
 * }
 */

const { withAndroidManifest, withMainApplication, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Android Manifest modifications
const withJarvisManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    
    // ==================== ADD PERMISSIONS ====================
    // Ensure manifest has 'uses-permission' array
    if (!manifest.manifest['uses-permission']) {
      manifest.manifest['uses-permission'] = [];
    }
    
    const permissions = manifest.manifest['uses-permission'];
    
    // Shizuku permission - REQUIRED for elevated privileges
    const shizukuPermission = {
      $: {
        'android:name': 'moe.shizuku.manager.permission.API_V23'
      }
    };
    
    // Check if Shizuku permission already exists
    const hasShizukuPermission = permissions.some(
      (p) => p.$ && p.$['android:name'] === 'moe.shizuku.manager.permission.API_V23'
    );
    
    if (!hasShizukuPermission) {
      permissions.push(shizukuPermission);
      console.log('[withJarvisNativeSetup] Added Shizuku API_V23 permission');
    }
    
    // ==================== ADD SERVICES ====================
    // Find the application tag
    const application = manifest.manifest.application;
    
    if (!application) {
      console.warn('[withJarvisNativeSetup] No application tag found in manifest');
      return config;
    }
    
    // Accessibility Service declaration
    const accessibilityService = {
      $: {
        'android:name': '.JarvisAccessibilityService',
        'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
        'android:exported': 'true',
      },
      'intent-filter': [{
        $: {},
        action: [{
          $: {
            'android:name': 'android.accessibilityservice.AccessibilityService'
          }
        }]
      }],
      'meta-data': [{
        $: {
          'android:name': 'android.accessibilityservice',
          'android:resource': '@xml/accessibility_service_config'
        }
      }]
    };
    
    // VPN Service declaration
    const vpnService = {
      $: {
        'android:name': '.JarvisVpnService',
        'android:permission': 'android.permission.BIND_VPN_SERVICE',
        'android:exported': 'true',
      },
      'intent-filter': [{
        $: {},
        action: [{
          $: {
            'android:name': 'android.net.VpnService'
          }
        }]
      }]
    };
    
    // Add services to application if not already present
    const existingServices = application.filter((item) => item.service);
    const services = existingServices.length > 0 ? [...(existingServices[0].service || [])] : [];
    
    // Check if our services already exist
    const hasAccessibilityService = services.some(
      (s) => s.$ && s.$['android:name'] === '.JarvisAccessibilityService'
    );
    const hasVpnService = services.some(
      (s) => s.$ && s.$['android:name'] === '.JarvisVpnService'
    );
    
    if (!hasAccessibilityService) {
      services.push(accessibilityService);
      console.log('[withJarvisNativeSetup] Added AccessibilityService to manifest');
    }
    
    if (!hasVpnService) {
      services.push(vpnService);
      console.log('[withJarvisNativeSetup] Added VpnService to manifest');
    }
    
    // Update application with services
    if (existingServices.length > 0) {
      existingServices[0].service = services;
    } else {
      application[0].service = services;
    }
    
    return config;
  });
};

// MainApplication modifications - add JarvisPackage
const withJarvisPackage = (config) => {
  return withMainApplication(config, (config) => {
    const contents = config.modResults.contents;
    
    // Check if already modified
    if (contents.includes('JarvisPackage')) {
      console.log('[withJarvisNativeSetup] JarvisPackage already registered');
      return config;
    }
    
    // Determine if Kotlin or Java
    const isKotlin = config.modResults.language === 'kotlin';
    
    let newContents = contents;
    
    // Add import for JarvisPackage
    const importStatement = isKotlin
      ? 'import com.jarvis.assistant.JarvisPackage'
      : 'import com.jarvis.assistant.JarvisPackage;';
    
    if (!newContents.includes(importStatement)) {
      // Find the package imports section
      const packageMatch = newContents.match(/(package\s+[\w.]+;?\n)/);
      if (packageMatch) {
        newContents = newContents.replace(
          packageMatch[0],
          packageMatch[0] + '\n' + importStatement + '\n'
        );
      }
    }
    
    // Add JarvisPackage to packages list - MULTIPLE STRATEGIES
    if (isKotlin) {
      // Strategy 1: Find packages.add pattern and add after last one
      const lastPackageAddMatch = newContents.lastIndexOf('packages.add(');
      if (lastPackageAddMatch > -1) {
        // Find the end of this line
        const endOfLine = newContents.indexOf('\n', lastPackageAddMatch);
        if (endOfLine > -1) {
          const beforeInsert = newContents.substring(0, endOfLine + 1);
          const afterInsert = newContents.substring(endOfLine + 1);
          
          // Check if JarvisPackage is already there
          if (!afterInsert.includes('JarvisPackage') && !beforeInsert.substring(lastPackageAddMatch).includes('JarvisPackage')) {
            newContents = beforeInsert + '            packages.add(JarvisPackage())\n' + afterInsert;
            console.log('[withJarvisNativeSetup] Added JarvisPackage after existing packages.add');
          }
        }
      }
      
      // Strategy 2: If no packages.add found, try PackageList pattern
      if (!newContents.includes('JarvisPackage')) {
        // Find PackageList().apply { or PackageList(this).apply {
        const packageListMatch = newContents.match(/PackageList\([^)]*\)\.apply\s*\{/);
        if (packageListMatch) {
          const insertPos = newContents.indexOf(packageListMatch[0]) + packageListMatch[0].length;
          const beforeInsert = newContents.substring(0, insertPos);
          const afterInsert = newContents.substring(insertPos);
          newContents = beforeInsert + '\n            packages.add(JarvisPackage())' + afterInsert;
          console.log('[withJarvisNativeSetup] Added JarvisPackage inside PackageList.apply');
        }
      }
      
      // Strategy 3: Last resort - find the ReactPackage list initialization
      if (!newContents.includes('JarvisPackage')) {
        const packagesInitMatch = newContents.match(/val\s+packages\s*=\s*PackageList/);
        if (packagesInitMatch) {
          const endOfStatement = newContents.indexOf('}', newContents.indexOf(packagesInitMatch[0]));
          if (endOfStatement > -1) {
            const beforeInsert = newContents.substring(0, endOfStatement);
            const afterInsert = newContents.substring(endOfStatement);
            newContents = beforeInsert + '\n        packages.add(JarvisPackage())' + afterInsert;
            console.log('[withJarvisNativeSetup] Added JarvisPackage after PackageList initialization');
          }
        }
      }
    } else {
      // Java MainApplication
      const packagesMatch = newContents.match(/(packages\.add\([^)]+\);[\s\n]*)/);
      if (packagesMatch) {
        newContents = newContents.replace(
          packagesMatch[0],
          packagesMatch[0] + '        packages.add(new JarvisPackage());\n'
        );
      }
    }
    
    // Final check - ensure JarvisPackage was added
    if (!newContents.includes('JarvisPackage')) {
      console.error('[withJarvisNativeSetup] FAILED to add JarvisPackage - manual intervention required');
    }
    
    config.modResults.contents = newContents;
    console.log('[withJarvisNativeSetup] MainApplication modification complete');
    
    return config;
  });
};

// Copy native Kotlin files to android directory
const withJarvisNativeModules = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidRoot = config.modRequest.platformProjectRoot;
      
      // Source directory (from our tracked src/native/android folder)
      const sourceDir = path.join(
        projectRoot, 
        'src', 'native', 'android', 
        'app', 'src', 'main', 'java', 'com', 'jarvis', 'assistant'
      );
      
      // Target directory in generated android project
      const targetDir = path.join(
        androidRoot, 
        'app', 'src', 'main', 'java', 'com', 'jarvis', 'assistant'
      );
      
      console.log('[withJarvisNativeSetup] Source dir:', sourceDir);
      console.log('[withJarvisNativeSetup] Target dir:', targetDir);
      
      // Check if source exists
      if (!fs.existsSync(sourceDir)) {
        console.warn('[withJarvisNativeSetup] Source directory not found:', sourceDir);
        console.warn('[withJarvisNativeSetup] Make sure src/native/android folder exists with Kotlin files');
        return config;
      }
      
      // Ensure target directory exists
      fs.mkdirSync(targetDir, { recursive: true });
      fs.mkdirSync(path.join(targetDir, 'modules'), { recursive: true });
      
      // Copy all Kotlin files
      const files = getAllKotlinFiles(sourceDir);
      console.log(`[withJarvisNativeSetup] Found ${files.length} Kotlin files to copy`);
      
      files.forEach((file) => {
        const relativePath = path.relative(sourceDir, file);
        const targetFile = path.join(targetDir, relativePath);
        const targetFileDir = path.dirname(targetFile);
        
        if (!fs.existsSync(targetFileDir)) {
          fs.mkdirSync(targetFileDir, { recursive: true });
        }
        
        fs.copyFileSync(file, targetFile);
        console.log(`[withJarvisNativeSetup] Copied: ${relativePath}`);
      });
      
      // Create accessibility service config XML
      const xmlDir = path.join(androidRoot, 'app', 'src', 'main', 'res', 'xml');
      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
      }
      
      const accessibilityConfig = path.join(xmlDir, 'accessibility_service_config.xml');
      if (!fs.existsSync(accessibilityConfig)) {
        fs.writeFileSync(accessibilityConfig, `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeAllMask"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagDefault|flagRequestTouchExplorationMode"
    android:canPerformGestures="true"
    android:canRetrieveWindowContent="true"
    android:description="@string/accessibility_service_description"
    android:notificationTimeout="100"
    android:settingsActivity="com.jarvis.assistant.MainActivity" />
`);
        console.log('[withJarvisNativeSetup] Created accessibility_service_config.xml');
      }
      
      // Add string resource for accessibility description
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
    }
  ]);
};

// Helper to get all Kotlin files recursively
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

// Main plugin export
module.exports = function withJarvisNativeSetup(config, options = {}) {
  // Apply all modifications
  config = withJarvisManifest(config);
  config = withJarvisPackage(config);
  config = withJarvisNativeModules(config);
  
  return config;
};
