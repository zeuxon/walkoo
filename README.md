# Walkoo - Development Guide

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Expo | ~54.0.0 |
| Runtime | React Native | 0.81.5 |
| Language | TypeScript | ~5.9.2 |
| UI library | React | 19.1.0 |
| Navigation | React Navigation (bottom-tabs + native-stack) | 7.x |
| Maps | react-native-maps (Google Maps) | 1.20.1 |
| Storage | AsyncStorage | 2.2.0 |
| Blockchain | ethers + viem + permissionless (ERC-4337) | - |
| Routing | OpenTripPlanner 2.4 (Docker) | 2.4.0 |
| Tests | Jest + ts-jest | 29.x |

---

## Prerequisites

Install these before doing anything else.

| Tool | Version | Where to get it |
|------|---------|----------------|
| Node.js | 18+ | https://nodejs.org |
| JDK | **17** | https://adoptium.net |
| Android Studio | latest | https://developer.android.com/studio (includes SDK) |
| Docker Desktop | latest | https://www.docker.com/products/docker-desktop |
| Netbird | latest | https://netbird.io/download |

> **JDK must be exactly 17.** The path must be set explicitly in `android/gradle.properties`:
> ```
> org.gradle.java.home=C\:\\Program Files\\Microsoft\\jdk-17.0.18.8-hotspot
> ```
> Update this path if your JDK is installed elsewhere.

---

## Installation

```bash
npm install
```

The `android/` folder is not commited and must be generated locally.
Run prebuild before building for the first time, or whenever native dependencies change:

```bash
npx expo prebuild --clean
```

---

## Running on Android and iOS

### Physical device

Make sure you have **Expo Go** downloaded on your device.

1. Start Netbird on **both** PC and phone
2. Connect the phone Netbird to the OTP server running network (or via USB)
3. Run:

```bash
# Terminal 1:
ssh -p 443 -R0:localhost:8081 a.pinggy.io

# Terminal 2:
set EXPO_PACKAGER_PROXY_URL=<WRITE_PIGGY_LINK_HERE>
npx expo start
```

4. 
- **Android**: Open Expo Go and scan the QR code shown in the terminal
- **iOS**: Simply scan the QR code with your camera

> `100.118.239.129` is the PC's Netbird IP.

### Emulator

```powershell
# Start an AVD from Android Studio first, then:
npx expo start --android
# or: npm run android
```

No Netbird needed — the emulator uses `10.0.2.2` to reach localhost on the host machine.


---

## OTP Routing Server

The app uses [OpenTripPlanner 2.4](https://www.opentripplanner.org/) for transit + walking route planning. It runs locally in Docker.

### Data files

The large data files are not committed to the repo (they exceed GitHub's 100 MB limit).
Download them from the **[graph-data release](https://github.com/zeuxon/walkoo/releases/tag/graph-data)** and place them as follows:

| Download | Destination |
|----------|-------------|
| `hungary-latest.osm.pbf` | `otp/graph/osm/hungary-latest.osm.pbf` |
| `budapest_gtfs.zip` | `otp/graph/gtfs/budapest_gtfs.zip` |
| `volan_gtfs.zip` | `otp/graph/gtfs/volan_gtfs.zip` |
| `mav_gtfs.zip` | `otp/graph/gtfs/mav_gtfs.zip` |
| `szeged_gtfs.zip` | `otp/graph/gtfs/szeged_gtfs.zip` |

The following files are already in the repo and don't need to be downloaded:

| File | Description |
|------|-------------|
| `graph.obj` | Pre-built routing graph (~500 MB) - also excluded, must be built (see below) |
| `build-config.json` | Declares the data sources for OTP |
| `otp-config.json` | OTP server configuration |

### (Re)Build the graph

```powershell
docker run --rm `
  -v "${PWD}\otp\graph:/var/opentripplanner" `
  -e JAVA_TOOL_OPTIONS="-Xmx10G" `
  opentripplanner/opentripplanner:2.4.0 `
  --build --save
```

If there is already a built graph this replaces it.

### Start the server

Run this from the project root in PowerShell:

```powershell
docker run --rm `
  -p 9000:8080 `
  -v "${PWD}\otp\graph:/var/opentripplanner" `
  -e JAVA_TOOL_OPTIONS="-Xmx6G" `
  opentripplanner/opentripplanner:2.4.0 `
  --load --serve --port 8080
```

### Set OTP URL in the app

This should be set already but if not:

Go to **Profile → Settings → OTP Server URL** and enter:

| Scenario | URL |
|----------|-----|
| Android emulator | `http://10.0.2.2:9000` |
| Physical device (Netbird) | `http://100.118.239.129:9000` |

---

## Blockchain

### Deploying a new contract

Only needed if you change `WalkooLedger.sol`.

```powershell
cd blockchain
npm install
$env:DEPLOYER_PRIVATE_KEY = "0x..."   # funded Amoy wallet private key
npm run deploy:amoy
```

Update `CONTRACT_ADDRESS` in `src/blockchain/config.ts` with the new address.

### Verifying on-chain activity

Open the contract on PolygonScan and watch the Events tab:

```
https://amoy.polygonscan.com/address/0x572d1c12595444C0066Aed33866cedcF79c01dE4#events
```

To get test POL for the deployer wallet: https://faucet.polygon.technology

---

## Tests

```bash
npm test
```

12 test suites, 168 tests. All should pass. Clear the cache if you see a stale error:

```bash
npx jest --clearCache
```

---

## Developer Mode (in-app)

Several debug features are hidden behind a developer mode gate:

1. On the **Profile** screen, tap the **Settings** heading 7 times quickly
2. Enter passphrase: `walkoo2026`
3. Developer mode is now enabled

With developer mode on:
- **DEV: Finish** button appears on the Map screen: instantly completes the active trip
- **Blockchain Wallet** section appears in Profile with the smart account address and on-chain stats
- **Wallet Dev Tools** appear for exporting/importing the private key
- **Reset All Progress** button appears to wipe all local data
- **Replay Tutorial** button re-triggers the onboarding flow

---

## Project structure

```
src/
  screens/        # One file per tab (HomeScreen, MapScreen, etc.)
  services/       # Business logic + AsyncStorage persistence
  blockchain/     # Smart contract integration (ethers / viem / permissionless)
  i18n/           # English + Hungarian translations
  types/          # Shared TypeScript interfaces
  theme/          # Colors, spaces, ThemeContext
  assets/         # Images, fonts
  utils/          # Analytics helpers, location math

otp/graph/        # OTP data files + pre-built graph
blockchain/       # Hardhat project (contract source, deploy scripts, tests)
__tests__/        # Jest test suites
```

Path alias: `@/` maps to `src/` (configured in `babel.config.js` and `tsconfig.json`).

---

## Troubleshooting

### Black map screen
The Google Maps API key only works in native builds. Run with `npx expo run:android` instead of Expo Go.

### Gradle build fails (JDK error / CMake error)
JDK must be 17. Check `android/gradle.properties`:
```
org.gradle.java.home=C\:\\Program Files\\Microsoft\\jdk-17.0.18.8-hotspot
```
Update the path if your JDK is installed elsewhere.

### Metro port 8081 already in use
```bash
npx kill-port 8081
```

### OTP server not reachable from phone
1. Confirm Docker container is running and shows `Grizzly server started`
2. Confirm Netbird is active on both PC and phone
3. Test in the phone browser: `http://100.118.239.129:9000`
4. Check the OTP URL setting in Profile
