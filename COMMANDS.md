# R3mote Commands (Dev + Deploy)

Use this as your quick command reference for running and distributing the app.

## 1) One-time setup

```bash
# from repo root
npm install

# install EAS CLI globally (once)
npm install -g eas-cli

# login to Expo account
eas login
```

## 2) Run in development (Expo Dev Client)

```bash
# start Metro for dev client
npm run start
# same as: npx expo start --dev-client
```

If you have not installed the dev client app on the phone yet, build it first (section 3).

## 3) Build Dev Client (internal testing builds)

### Android dev client APK
```bash
eas build --platform android --profile preview
```

### iOS dev client build
```bash
eas build --platform ios --profile preview
```

After build finishes, install from the Expo/EAS build link on each device.

## 4) Production/internal distribution builds (family release)

### Android production/internal APK
```bash
eas build --platform android --profile production
```

### iOS production/internal build
```bash
eas build --platform ios --profile production
```

## 5) iOS device registration (required before install)

```bash
# run once and share generated URL with each iPhone user
eas device:create
```

Then rebuild iOS so the provisioning profile includes all registered devices.

## 6) Useful build management commands

```bash
# list recent builds
eas build:list --limit 20

# view one build details
eas build:view <BUILD_ID>
```

## 7) Rebuild after native dependency changes

When new native modules are added (e.g., expo-network, react-native-infrared-interface),
the dev client needs to be rebuilt:

```bash
# regenerate native projects
npx expo prebuild --clean

# then rebuild dev client
eas build --platform android --profile preview

# or local build (requires Android SDK)
cd android && .\gradlew.bat assembleDebug && cd ..
# APK output: android\app\build\outputs\apk\debug\app-debug.apk
```

## 8) Optional native run commands (local device/simulator)

```bash
# android native run
npm run android

# ios native run (requires macOS + Xcode)
npm run ios
```

## 9) Recommended release flow

```bash
# 1) install/update deps
npm install

# 2) build production artifacts
eas build --platform android --profile production
eas build --platform ios --profile production

# 3) share install links/files to family
# Android: APK file
# iOS: EAS install link (registered devices only)
```

