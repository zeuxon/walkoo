# Walkoo

A gamified, blockchain-authenticated sustainable urban mobility app built with Expo / React Native.

---

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Expo | ~54.0.0 |
| Runtime | React Native | 0.81.5 |
| Language | TypeScript | ~5.9.2 |
| Navigation | React Navigation | 7.x |
| Maps | react-native-maps (Google Maps) | 1.20.1 |
| Storage | AsyncStorage | 2.2.0 |
| Blockchain | ethers + viem + permissionless (ERC-4337) | - |
| Routing | OpenTripPlanner 2.4 (Docker) | 2.4.0 |
| Tests | Jest + ts-jest | 29.x |

---

## Prerequisites

Install all of these before starting.

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18+ | https://nodejs.org |
| JDK | **exactly 17** | https://adoptium.net |
| Android Studio | latest | https://developer.android.com/studio |
| Docker Desktop | latest | https://www.docker.com/products/docker-desktop |

> **JDK 17 is required.** After installing, open `android/gradle.properties` and set:
> ```
> org.gradle.java.home=C\:\\Program Files\\Microsoft\\jdk-17.0.18.8-hotspot
> ```
> Update the path to match where your JDK is installed.

---

## Setup

**1. Install dependencies**
```bash
npm install
```

**2. Generate the Android native project**

The `android/` folder is not committed. Run this once, and again whenever native dependencies change:
```bash
npx expo prebuild --clean
```

---

## Running the app

### Option A - Standalone APK (easiest, just install and run)

The recommended way to run the app on an Android device. Builds a fully self-contained APK. No PC, no Metro server, no Expo Go needed after installation. Just install it like any regular app.

```powershell
cd android
.\gradlew assembleRelease
```

APK output: `android\app\build\outputs\apk\release\app-release-unsigned.apk`

Transfer the APK to your Android device and install it. Everything works out of the box including Google Maps.

### Option B - Android emulator

Start an AVD from Android Studio first, then:
```bash
npx expo start --android
```

### Option C - Expo Go (for development and iOS testing only)

Use this option if you want to see live code changes during development, or if you want to test on an iOS device.

1. Install **Expo Go** on your phone
2. Run:
```bash
npx expo start
```
3. Scan the QR code with Expo Go

> Note: Expo Go is intended for development only. For the full app experience use Option A (standalone APK).

---

## OTP Routing Server

The app uses [OpenTripPlanner 2.4](https://www.opentripplanner.org/) to plan walking + transit routes. It runs locally in Docker. The app works without it but route planning will not function.

### Step 1 - Download data files

The large data files are not committed. Download them from the **[graph-data release](https://github.com/zeuxon/walkoo/releases/tag/graph-data)** and place them here:

| File | Destination |
|------|-------------|
| `hungary-latest.osm.pbf` | `otp/graph/osm/hungary-latest.osm.pbf` |
| `budapest_gtfs.zip` | `otp/graph/gtfs/budapest_gtfs.zip` |
| `volan_gtfs.zip` | `otp/graph/gtfs/volan_gtfs.zip` |
| `mav_gtfs.zip` | `otp/graph/gtfs/mav_gtfs.zip` |
| `szeged_gtfs.zip` | `otp/graph/gtfs/szeged_gtfs.zip` |

### Step 2 - Build the routing graph

This takes 10–20 minutes and requires at least 10 GB of RAM allocated to Docker:
```powershell
docker run --rm `
  -v "${PWD}\otp\graph:/var/opentripplanner" `
  -e JAVA_TOOL_OPTIONS="-Xmx10G" `
  opentripplanner/opentripplanner:2.4.0 `
  --build --save
```

### Step 3 - Start the server

```powershell
docker run --rm `
  -p 9000:8080 `
  -v "${PWD}\otp\graph:/var/opentripplanner" `
  -e JAVA_TOOL_OPTIONS="-Xmx6G" `
  opentripplanner/opentripplanner:2.4.0 `
  --load --serve --port 8080
```

### Step 4 - Set the OTP URL in the app

Go to **Profile → Settings → OTP Server URL** and enter:

| Scenario | URL |
|----------|-----|
| Android emulator | `http://10.0.2.2:9000` |
| Physical device (same network) | `http://<your-pc-local-ip>:9000` |

---

## Blockchain

The app records trips, badges, and challenges on the **Polygon Amoy testnet** via the `WalkooLedger` smart contract. This works automatically and is completely gasless (ERC-4337 + Pimlico paymaster). No setup needed to use it.

### Re-deploying the contract

Only needed if you modify `blockchain/contracts/WalkooLedger.sol`:
```powershell
cd blockchain
npm install
$env:DEPLOYER_PRIVATE_KEY = "0x..."
npm run deploy:amoy
```
Then update `CONTRACT_ADDRESS` in `src/blockchain/config.ts`.

### View on-chain activity

```
https://amoy.polygonscan.com/address/0x572d1c12595444C0066Aed33866cedcF79c01dE4#events
```

---

## Tests

```bash
npm test
```

All test suites should pass. If you see stale cache errors:
```bash
npx jest --clearCache
```

---

## Developer Mode

Hidden debug features are available via a tap sequence:

1. On the **Profile** screen, tap the **Settings** heading **7 times quickly**
2. Enter passphrase: `walkoo2026`

With developer mode enabled:
- **DEV: Finish** button on Map screen: instantly completes the active trip
- **Blockchain Wallet** section in Profile: shows smart account address and on-chain stats
- **Wallet Dev Tools**: export/import the private key
- **Reset All Progress**: wipes all local data
- **Replay Tutorial**: re-triggers onboarding

---

## Project structure

```
src/
  screens/        # One file per tab (HomeScreen, MapScreen, etc.)
  services/       # Business logic and AsyncStorage persistence
  blockchain/     # Smart contract integration (ethers / viem / permissionless)
  i18n/           # English and Hungarian translations
  types/          # Shared TypeScript interfaces
  theme/          # Colors, spacing, ThemeContext
  assets/         # Images
  utils/          # Analytics helpers, location math

otp/graph/        # OTP config files (data files downloaded separately)
blockchain/       # Hardhat project (contract source, deploy scripts)
__tests__/        # Jest test suites
```

Path alias: `@/` maps to `src/` (configured in `babel.config.js` and `tsconfig.json`).

---

## Troubleshooting

### Black map screen
The Google Maps API key only works in native builds. Use Option A (APK) or `npx expo run:android` instead of Expo Go.

### Gradle build fails with JDK error
JDK must be 17. Set the path in `android/gradle.properties`:
```
org.gradle.java.home=C\:\\Program Files\\Microsoft\\jdk-17.0.18.8-hotspot
```
### Can't reach or start app with `npx expo start`

Try:

```bash
# Terminal 1:
ssh -p 443 -R0:localhost:8081 a.pinggy.io

# Terminal 2:
set EXPO_PACKAGER_PROXY_URL=<WRITE_PIGGY_LINK_HERE>
npx expo start
```

### Metro port 8081 already in use
```bash
npx kill-port 8081
```

### OTP server not reachable
1. Confirm Docker container is running and logs show `Grizzly server started`
2. Test in your phone browser: `http://<your-pc-ip>:9000`
3. Check the OTP URL in Profile settings
