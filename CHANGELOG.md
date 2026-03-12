# R3mote Changelog

## [Unreleased]

### Fixed
- Resolved local startup failure (`The required package \`expo-asset\` cannot be found`) by adding `expo-asset` as an SDK-compatible app dependency.

### v1.0 — Core App: "Any TV" (Current)
- [x] Project setup (Expo + TypeScript)
- [x] Roku adapter (ECP over HTTP — simplest protocol)
- [x] Samsung adapter (WebSocket, token auth)
- [x] LG webOS adapter (SSAP/WebSocket, client key auth)
- [x] Sony Bravia adapter (IRCC-IP over HTTP, PSK auth)
- [x] Vizio SmartCast adapter (HTTPS API, PIN pairing)
- [x] Android TV / Google TV adapter (Remote Protocol v2, TLS cert pairing)
- [x] Fire TV adapter (Android TV protocol fallback)
- [x] SSDP + mDNS network discovery (all brands, parallel scan)
- [x] Manual TV connection (IP entry + brand selector)
- [x] Remote control UI (D-Pad, volume, media, power, input, number pad)
- [x] Home screen (TV list with online/offline status)
- [x] Settings screen (rename/forget TVs, preferences)
- [x] AsyncStorage persistence (saved TVs, auth tokens, settings)
- [x] Haptic feedback on buttons
- [x] Dark theme
- [x] EAS Build configuration (APK + IPA)
- [x] Family distribution setup docs

### v1.1 — Planned
- [ ] Broadlink RM4 Mini integration (legacy IR TVs)
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
