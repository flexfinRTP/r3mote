# R3mote Changelog

## [Unreleased]

### Fixed
- Resolved local startup failure (`The required package \`expo-asset\` cannot be found`) by adding `expo-asset` as an SDK-compatible app dependency.
- Resolved Metro bundling failure (`Unable to resolve "core-js/modules/es.promise.js"`) by adding `core-js` dependency required by `react-native-androidtv-remote`.
- Fixed runtime crash on older JS engines where `Promise.allSettled` is undefined by replacing discovery aggregation with a compatibility-safe settle helper.
- Fixed SSDP crash (`socket.send(): address and port parameters must be provided`) by restoring React Native UDP-compatible send signature with explicit offset/length/port/address.

## [0.2.0] - 2026-03-13

### Major: Discovery Refactor + IR Blaster Support

**Discovery completely reworked — TVs now found instantly:**
- Added direct subnet TCP/HTTP port scanner as **primary** discovery method (`src/discovery/portscan.ts`)
- Port scanner probes every IP on the local /24 subnet for known TV service ports:
  - Roku (HTTP 8060), Samsung (HTTP 8001), Sony (HTTP /sony/system), LG (HTTP 3000/3001)
  - Android TV (TCP 6466), Vizio (TCP 7345), Fire TV (TCP 5555)
- Identifies TV brand from HTTP response content (XML for Roku, JSON for Samsung/Sony)
- 30 concurrent workers, 500ms timeout per host — full subnet scan in ~3-5 seconds
- **Progressive results**: TVs appear in the list as they are found during scan (real-time callbacks)
- **Scan progress bar**: shows percentage of IPs scanned
- SSDP + mDNS kept as supplemental scanners (run in parallel, merge results)
- Added `expo-network` dependency for local IP detection

**IR Blaster support for legacy TVs (Android only):**
- Added `react-native-infrared-interface` for phone built-in IR hardware (ConsumerIrManager)
- New `src/adapters/ir.ts` adapter: checks for IR hardware, transmits raw timing patterns
- New `src/data/irCodes.ts`: IR code database for 11 TV brands:
  - Samsung, LG, Sony (SIRC), Panasonic, Vizio, Hisense, TCL, Sharp, Toshiba, Philips
  - "Universal" mode (Samsung NEC codes — work on many TVs)
- NEC protocol encoder (38 kHz) and Sony SIRC encoder (40 kHz) for raw pattern generation
- IR brand picker in Add TV modal — select your TV brand for correct IR codes
- Runtime IR hardware detection: IR option only shown on phones with IR blaster
- Added `TRANSMIT_IR` Android permission

**UI/UX improvements:**
- Scan progress bar with percentage during network scan
- Devices appear in list immediately as discovered (no more waiting for scan to finish)
- "Searching for TVs on your network..." placeholder during active scan
- IR Blaster brand selection UI with 11 brand options in Add TV modal
- Connection type section label for clearer manual add flow
- Modal now scrollable for better handling on small screens
- Fixed `submitPairingCode` bug referencing wrong field (`authKey` vs `clientKey`)

### v1.0 — Core App: "Any TV" (Current)
- [x] Project setup (Expo + TypeScript)
- [x] Roku adapter (ECP over HTTP — simplest protocol)
- [x] Samsung adapter (WebSocket, token auth)
- [x] LG webOS adapter (SSAP/WebSocket, client key auth)
- [x] Sony Bravia adapter (IRCC-IP over HTTP, PSK auth)
- [x] Vizio SmartCast adapter (HTTPS API, PIN pairing)
- [x] Android TV / Google TV adapter (Remote Protocol v2, TLS cert pairing)
- [x] Fire TV adapter (Android TV protocol fallback)
- [x] **Port scan + SSDP + mDNS network discovery (primary: subnet port scan)**
- [x] **IR Blaster support (Android — 11 TV brands)**
- [x] Manual TV connection (IP entry + brand selector)
- [x] Remote control UI (D-Pad, volume, media, power, input, number pad)
- [x] Home screen (TV list with online/offline status + scan progress)
- [x] Settings screen (rename/forget TVs, preferences)
- [x] AsyncStorage persistence (saved TVs, auth tokens, settings)
- [x] Haptic feedback on buttons
- [x] Dark theme
- [x] EAS Build configuration (APK + IPA)
- [x] Family distribution setup docs

### v1.1 — Planned
- [ ] Broadlink RM4 Mini integration (WiFi IR bridge for any phone)
- [ ] Wake-on-LAN support
- [ ] Keyboard input for TV search bars

### v1.2 — Future
- [ ] Quick actions / macros
- [ ] Home screen widget (Android)
- [ ] Voice control

---

## [0.1.2] - 2026-03-12

### Added
- Added `COMMANDS.md` with copy-paste run/deploy commands for:
  - local dev (`expo start --dev-client`)
  - preview/dev-client builds (Android + iOS)
  - production/internal builds (Android + iOS)
  - iOS device registration and build management commands

## [0.1.1] - 2026-03-12

### Improved
- Hardened pairing UX copy with clearer per-brand guidance for manual connect and code entry.
- Added smarter connection retry flow (automatic second attempt before surfacing failure).
- Improved user-facing brand-specific failure messages (Sony PSK/IP Control, Samsung/LG approve prompt, Vizio PIN expiry, Android/Fire TV awake/debug hints).
- Added command send retry behavior to reduce transient button failures.
- Added remote-screen reconnect action for quick recovery without leaving remote view.
- Hardened LG pointer socket setup with timeout handling and fixed listener lifecycle race.
- Added stronger HTTP response validation in Roku, Sony, and Vizio adapters.
- Improved manual connect behavior to reuse existing TV entries instead of creating duplicates.

## [0.1.0] - 2026-03-12

### Added
- Full Expo Router + TypeScript mobile app scaffold with dev client support.
- 7-brand adapter layer: Roku, Samsung, LG, Sony, Vizio, Android TV, Fire TV.
- Unified TV context for connection lifecycle, pairing code flow, persistence, and remote commands.
- SSDP + mDNS local discovery services for automatic TV detection.
- Home screen with scan, TV selection, manual add, and pairing-code modal flow.
- Remote screen with big-button layout (D-pad, media, volume, input, power, numbers).
- Settings screen with rename/forget TV and remote preference toggles.
- AsyncStorage-backed app settings and paired TV storage.
- EAS local distribution configuration (`eas.json`) for Android APK + iOS internal builds.

## [0.0.1] - 2026-03-12

### Added
- Technical Design Document (TECHNICAL_DESIGN.md)
- Initial project planning and research complete
- Defined all 7 TV protocols: Roku ECP, Samsung WebSocket, LG SSAP, Sony IRCC-IP, Vizio SmartCast, Android TV Remote v2, Fire TV ADB
- Defined app architecture: React Native + Expo + TypeScript
- Defined distribution strategy: APK sideload + iOS Ad Hoc
