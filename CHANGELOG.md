# R3mote Changelog

## [Unreleased]

### Added — Lean Standout Features (No Heavy Native Bloat)
- **Favorites + startup launch flow**
  - Added favorite toggles for saved TVs and pinned favorites to top of lists.
  - Added launch behavior setting: Home / Last TV / Favorite / Startup TV.
  - Added per-TV "Startup" marker so app can open directly to that remote on launch.
- **Smart reconnect + wake flow**
  - Added Wake-on-LAN utility via UDP magic packet (when MAC is available).
  - Added saved-TV MAC editor in Settings for wake support.
  - Added smart recovery path on failed saved-TV connect:
    - optional wake packet
    - fast brand-matched subnet rescan
    - auto IP update + reconnect when TV moved to a new DHCP address
- **Keyboard + one-tap streaming apps (supported brands only)**
  - Added remote quick actions strip with:
    - Keyboard text send
    - Netflix / Disney+ / Prime launch buttons
  - Implemented reliable support in Roku adapter:
    - text entry via `Lit_` keypresses
    - app launch via Roku channel IDs
- **Hidden advanced fix assistant**
  - Added `Advanced Help & Diagnostics` screen from Settings (kept out of the main UI path).
  - Includes one-tap Reconnect / Smart Recover / Wake actions per saved TV.
  - Includes brand-specific troubleshooting checklists (Roku, Samsung, LG, Sony, Vizio, Android TV, Fire TV, IR).

### Deferred Intentionally (to preserve speed/simplicity)
- Home screen widgets, app-icon quick actions, and lock-screen controls were not added in this pass to avoid extra native complexity and startup overhead.

### Fixed
- Resolved local startup failure (`The required package \`expo-asset\` cannot be found`) by adding `expo-asset` as an SDK-compatible app dependency.
- Resolved Metro bundling failure (`Unable to resolve "core-js/modules/es.promise.js"`) by adding `core-js` dependency required by `react-native-androidtv-remote`.
- Fixed runtime crash on older JS engines where `Promise.allSettled` is undefined by replacing discovery aggregation with a compatibility-safe settle helper.
- Fixed SSDP crash (`socket.send(): address and port parameters must be provided`) by restoring React Native UDP-compatible send signature with explicit offset/length/port/address.

### Fixed — Build & Visual Overhaul
- Added `expo-font` dependency (required by `@expo/vector-icons`)
- Added `expo-navigation-bar` for translucent Android system nav bar
- Prevented runtime crashes on older dev clients that do not include `ExpoFontLoader` / `ExpoNavigationBar`:
  - Added `AppIcon` wrapper with safe fallback glyphs when vector icon native module is unavailable
  - Switched `expo-navigation-bar` usage to optional guarded runtime loading
  - This keeps routes exporting correctly instead of failing with "missing default export" after module init errors

### Hardened — Android + iOS Compatibility
- **Runtime-safe native module loading**
  - Android TV remote module is now lazy-loaded with graceful fallback messaging instead of crashing app startup on unsupported/missing native runtimes.
  - Wake-on-LAN UDP and SSDP UDP modules are now lazy-loaded so missing native UDP does not break boot.
  - mDNS scanner now safely returns no results when native Zeroconf is unavailable instead of throwing.
  - Navigation bar styling now awaits async calls inside guarded try/catch, preventing unhandled `ExpoNavigationBar` promise rejections on runtimes without that native module.
- **Stronger auth compatibility**
  - Added a robust cross-runtime Base64 encoder utility and switched Samsung + Sony pairing/auth to use it.
  - Fixes environments where `btoa` is unavailable and auth payloads were malformed.
- **Safer haptics behavior**
  - Haptic calls now fail-soft on devices/runtimes without full haptics support so remote commands still execute.
- **Safe area + modal UX parity**
  - Added `SafeAreaProvider` at root and moved app screens to `react-native-safe-area-context` safe-area views.
  - Added `KeyboardAvoidingView` and Android `onRequestClose` handlers to text-entry modals for better keyboard/back-button behavior on both platforms.
  - Added explicit pairing-cancel flow so Android hardware back can dismiss pairing modal safely.
  - Home floating Add button and list bottom spacing now account for dynamic bottom insets.
- **iOS local-network best-practice config**
  - Added `NSAppTransportSecurity.NSAllowsLocalNetworking` for LAN HTTP control APIs.
  - Added `NSBonjourServices` entries for Android TV / ADB mDNS service types.
- **Storage compatibility hardening**
  - Added sanitization for persisted TVs/settings so malformed or legacy AsyncStorage entries cannot crash app startup.
  - Added launch-target validation and safe fallbacks to default settings.

### Redesigned — Deep Blue Theme + Full-Screen Remote
- **Background**: near-black → deep navy blue (`#0B1A30`) matching reference remote app
- **Surfaces**: navy buttons (`#132844`) with navy borders (`#1E3A5F`)
- **Active toggle**: bright blue (`#3B82F6`) — high contrast against navy
- **Secondary text**: muted blue-gray (`#7B9CC4`) — readable against navy
- **Amber arrows**: `#F59E0B` — pops on navy
- **Connection dot**: green (`#22C55E`) when connected, red (`#EF4444`) when disconnected
- **All colors** tuned for WCAG contrast accessibility against the deep blue background

### Redesigned — Remote Screen Header → Settings Gear + Status Dot
- Removed text-heavy header bar (TV name, Reconnect, status)
- Replaced with minimal top row: `⚙ gear` + `● status dot` on left, `⏻ power` on right
- Settings gear opens native action sheet with TV name/brand/IP, Reconnect, Disconnect
- Status dot: green = connected, red = disconnected — instant visual feedback
- Stack navigator header hidden for remote screen (`headerShown: false`)
- Remote now uses full screen — maximum space for controls

### Added — Translucent System Navigation Bar
- Android system nav bar set to 60% opacity deep navy — content extends behind it
- Light button style for visibility against dark translucent background
- iOS status bar set to translucent

### Upgraded — Professional Vector Icons
- Replaced all Unicode/emoji symbols with `MaterialCommunityIcons` from `@expo/vector-icons`
- D-Pad: `chevron-up/down/left/right` (clean thin chevrons matching reference remote app)
- OK button: `circle-small` icon (subtle center dot)
- Power: `power` icon (proper standby symbol)
- Navigation: `arrow-left` (back), `home-outline` (home)
- Media: `rewind`, `play-pause`, `fast-forward` icons
- Controls: `menu` (hamburger), `volume-off` (mute)
- CH/VOL arrows: `chevron-up/down` (matching D-Pad style)
- Consistent amber color for all directional arrows, white for action icons

### Fixed — Network Scan Speed (30s → ~5-8s)
- **Root cause**: 7 probes ran sequentially per IP with 600ms timeouts across 6 workers
  - Dead IPs: 7 × 600ms = 4.2s each. With 50 dead IPs: 50/6 × 4.2s = ~35 seconds
- **Fix**: HTTP probes now run in **parallel** per IP (all 4 simultaneously)
  - Dead IP now costs max(300ms) instead of 4 × 600ms — **~8x faster per IP**
- TCP probes (Android TV, Vizio, Fire TV) also run in parallel, only if no HTTP hit
- Reduced timeout from 600ms → 300ms (connection-refused returns in <10ms on LAN)
- Increased workers from 6 → 12 (12 × 4 parallel = 48 concurrent, safely under 60 native bridge limit)
- Removed inter-IP delay (unnecessary with proper concurrency)
- Expected scan time: ~5-8 seconds typical, ~12s worst case (was 30s+)

### Redesigned — Remote Control UI
- Complete remote screen redesign matching reference remote app layout
- **Circular D-Pad**: large circular touch area with amber directional arrows, subtle cross dividers, centered OK button
- **Number pad toggle**: "1 2 3" and "D-Pad" buttons in nav row swap the center area between D-Pad and a 3x4 number grid — no scrolling needed
- **Nav row**: ← (Back) | 1 2 3 (toggle) | D-Pad (toggle) | 🏠 (Home) — all in one compact row
- **CH/VOL side columns**: Channel up/down on left, Volume up/down on right, with amber arrows matching D-Pad style
- **Bottom center controls**: INPUT, GUIDE, MENU, MUTE in 2x2 grid + media controls (rewind, play/pause, forward) in a row below
- **Circular power button**: red accent, top-right corner
- **No scrolling**: entire remote fits on one screen using flex layout
- **Compact header**: thin top bar with ← TV name | status | Reconnect — maximum space for controls
- Removed ScrollView from remote screen
- All existing buttons/features preserved (power, d-pad, back, home, menu, guide, input, media, volume, channel, mute, number pad)

### Improved — Sony Bravia Setup Instructions
- Updated all Sony Bravia setup instructions to match verified working TV menu path:
  1. Settings → Network & Internet → Home Network → IP Control
  2. Authentication → "Normal and Pre-Shared Key"
  3. Pre-Shared Key → set to "0000"
  4. Enable Remote Start (in Network & Internet menu)
- Updated in-app help text (Add TV modal) with step-by-step Sony setup guide
- Updated Sony adapter error/fallback messages with correct menu paths
- Updated TVContext Sony failure message with specific settings path
- Updated TECHNICAL_DESIGN.md: Sony implementation details, pairing flow (§6.2), family setup guide (Appendix A), troubleshooting table (Appendix B), and error handling table (§12)

## [0.2.3] - 2026-03-13

### Sony Bravia — Full Debug & Fix

**Three bugs found and fixed:**

1. **Sony returns HTTP 200 even on auth failures** — previous code checked only
   `res.ok` (HTTP status), so `tryNoAuth()` returned success when the TV actually
   rejected the request. New `verifyAuth()` parses the JSON body and checks for
   `"result"` vs `"error"`.

2. **`actRegister` missing `"level": "private"` param** — the proven `braviarc`
   library (77 stars) includes this field and `Connection: keep-alive` header.
   Without it, some Sony TVs ignore the registration request and never display
   the PIN on screen. Both are now included.

3. **Pairing modal shown even when PIN is not on screen** — when PIN pairing is
   not supported (TV set to PSK-only auth), the adapter returned `{ ok: false }`
   which triggered the pairing code modal. New `needsCode` flag in
   `AdapterConnectResult` ensures the modal only appears when the TV is actively
   showing a PIN/code.

**Sony connection flow now:**
1. Check reachability (is `/sony/system` responding at all?)
2. Try saved auth cookie / saved PSK
3. Try common default PSKs (0000, 1234)
4. Try no-auth mode
5. Try PIN pairing via `actRegister` (with `level: private` + `keep-alive`)
6. If PIN not supported → show detailed TV setup instructions in status banner

**PSK manual entry fallback added:**
- Manual add modal now shows a Pre-Shared Key input when Sony is selected
- User can enter their TV's PSK directly (bypasses auto-detection)
- Help text guides user to the correct TV settings menu path

**Stack overflow fix — discovery scanner rewritten:**
- Root cause: 15 workers × 4 parallel HTTP probes = up to 60 concurrent native
  bridge calls, which overflows the native stack
- Fix: all probes now run **sequentially per IP** (one at a time), workers
  reduced from 15 to 6, 5ms pause between IPs
- SSDP and mDNS scanners removed from discovery pipeline entirely — they used
  additional native sockets and the port scanner finds everything they would
- Scan is slightly slower (~15-20s vs ~5s) but rock-solid stable

**UX improvements:**
- Scanned online TVs auto-connect on tap (no manual add modal needed)
- Detailed progress messages during Sony connection ("Checking reachability...",
  "Trying default keys...", "Requesting PIN...")
- `needsCode` flag added to `AdapterConnectResult` — all adapters updated

## [0.2.1] - 2026-03-13

### Seamless Pairing — No Codes, No Keys

**Sony adapter completely rewritten — PIN pairing instead of PSK:**
- Removed Pre-Shared Key (PSK) requirement entirely
- Sony now uses `actRegister` API: TV shows a 4-digit PIN on screen, user enters it in app
- Tries no-auth first (for TVs set to "None" authentication)
- Falls back to saved auth cookie on reconnection
- Legacy PSK support kept internally for backward compatibility

**Samsung/LG — auto-approval with 15-second window:**
- Increased WebSocket timeout from 5s to 15s, giving user time to approve on TV
- Added real-time status messages: "Look at your TV and press Allow/Accept"
- After first approval, saved token/key makes reconnection instant

**UI simplified:**
- Removed PSK input field from Add TV modal entirely
- Updated brand help text to be action-oriented ("tap Connect, then press Allow on TV")
- Pairing prompt now shows contextual placeholder ("Enter PIN from TV" vs "Enter code from TV")

**Port scanner stack overflow fixed:**
- Reduced concurrency from 30 to 15 workers
- TCP probes now run sequentially per-IP (not parallel) to avoid native bridge overload
- Port scan runs first, then SSDP/mDNS run after (not simultaneously)

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
