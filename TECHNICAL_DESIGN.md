# R3mote - Universal TV Remote App

## Technical Design Document

**Version:** 1.0
**Date:** 2026-03-12
**Status:** Pre-Development

---

## 1. Project Overview

### 1.1 Purpose

R3mote is a free, ad-free, cross-platform mobile app that replaces physical TV remotes. It controls smart TVs over the local WiFi network. Built for private family distribution only (no app store listing).

### 1.2 Target TVs — ALL Major Brands in v1.0

The app supports **every major smart TV brand** via 7 network protocols. This covers virtually every smart TV and streaming device sold in the last 10-15 years.

| # | Protocol | TVs Covered | Est. Market Share |
|---|---|---|---|
| 1 | **Roku ECP** | Roku players, TCL, Hisense, Insignia, Onn, Philips (Roku built-in) | ~30% US |
| 2 | **Samsung WebSocket** | All Samsung smart TVs (2016+) | ~30% global |
| 3 | **LG SSAP/WebSocket** | All LG webOS TVs (2014+) | ~12% global |
| 4 | **Sony IRCC-IP** | Sony Bravia (non-Android TV models) | ~8% global |
| 5 | **Vizio SmartCast** | All Vizio TVs (2016+) | ~10% US |
| 6 | **Android TV Remote v2** | Sony (newer), Hisense, TCL, Philips, Sharp, Xiaomi, Chromecast, Google TV, any Android TV device | ~15% global |
| 7 | **Fire TV (ADB)** | Amazon Fire Stick, Fire TV Cube, Toshiba/Insignia Fire TV Edition | ~15% US |

**Coverage strategy for "any TV":**
- If it's a smart TV on WiFi → one of the 7 protocols above covers it directly
- If it's a dumb TV with a Roku/Fire Stick/Chromecast plugged in → we control the streaming device, which controls the TV via HDMI-CEC (power, volume)
- If it's a truly legacy TV with no streaming device → Phase 2 adds WiFi IR bridge support (Broadlink RM4 Mini, ~$25)

### 1.3 Target Platforms

- Android (APK sideload)
- iOS (Ad Hoc distribution via Apple Developer account)

### 1.4 Design Principles

- **Dead simple**: Open app → pick your TV → use remote. No accounts, no cloud, no ads.
- **Fast**: App launches in under 1 second. Commands reach TV in under 100ms.
- **Small**: Target APK size under 25MB.
- **Big buttons**: Touch-friendly layout, easy to use without looking at the phone.
- **Offline/Local only**: All communication stays on the local network. Zero internet required after install.

---

## 2. Technical Architecture

### 2.1 Framework & Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | React Native + Expo (SDK 52+) | Cloud builds via EAS (no Mac needed for iOS), rich npm ecosystem for TV protocols |
| **Language** | TypeScript | Type safety, better DX |
| **State Management** | React Context + useReducer | Lightweight, no external deps needed for this scale |
| **Storage** | AsyncStorage | Persist paired TVs, preferences |
| **Networking** | Native modules via Expo | WebSocket, HTTP, SSDP/mDNS discovery |
| **Build** | EAS Build (cloud) | Free tier: 30 builds/month. Builds both APK and IPA without local toolchains |
| **Distribution** | APK file (Android), Ad Hoc IPA (iOS) | Share via Google Drive, email, or AirDrop |

### 2.2 Project Structure

```
r3mote/
├── app/                          # Expo Router file-based routing
│   ├── _layout.tsx               # Root layout (theme, providers)
│   ├── index.tsx                 # Home: TV discovery & selection
│   ├── remote/
│   │   └── [tvId].tsx            # Remote control screen for a specific TV
│   └── settings.tsx              # Settings & manual pairing
├── src/
│   ├── adapters/                 # TV protocol adapters
│   │   ├── types.ts              # Shared adapter interface
│   │   ├── roku.ts               # Roku ECP adapter
│   │   ├── samsung.ts            # Samsung WebSocket adapter
│   │   ├── lg.ts                 # LG webOS SSAP adapter
│   │   ├── sony.ts               # Sony Bravia IRCC-IP adapter
│   │   ├── vizio.ts              # Vizio SmartCast adapter
│   │   ├── androidtv.ts          # Android TV / Google TV adapter
│   │   ├── firetv.ts             # Fire TV ADB adapter
│   │   └── index.ts              # Adapter registry & factory
│   ├── discovery/                # Network TV discovery
│   │   ├── ssdp.ts               # SSDP scanner (Roku, etc.)
│   │   ├── mdns.ts               # mDNS/Bonjour scanner
│   │   ├── scan.ts               # Unified discovery orchestrator
│   │   └── types.ts              # Discovery result types
│   ├── components/               # UI components
│   │   ├── RemoteButton.tsx      # Reusable big button with haptic feedback
│   │   ├── DPad.tsx              # Directional pad (up/down/left/right/ok)
│   │   ├── VolumeBar.tsx         # Volume up/down/mute strip
│   │   ├── MediaControls.tsx     # Play/pause/stop/rewind/forward
│   │   ├── PowerButton.tsx       # Power toggle button
│   │   ├── TVCard.tsx            # TV list item for discovery screen
│   │   └── RemoteLayout.tsx      # Full remote layout assembly
│   ├── hooks/                    # React hooks
│   │   ├── useDiscovery.ts       # TV discovery hook
│   │   ├── useTV.ts              # TV connection & command hook
│   │   └── useHaptics.ts         # Haptic feedback hook
│   ├── context/                  # React Context providers
│   │   └── TVContext.tsx         # Global TV state (selected TV, saved TVs)
│   ├── storage/                  # Persistence
│   │   └── tvStore.ts            # Save/load paired TVs
│   ├── theme/                    # Styling
│   │   └── index.ts              # Colors, spacing, typography
│   └── utils/                    # Helpers
│       └── network.ts            # Network utilities
├── assets/                       # App icons, splash screen
├── app.json                      # Expo config
├── eas.json                      # EAS Build config
├── package.json
├── tsconfig.json
└── CHANGELOG.md
```

### 2.3 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                  R3mote App                      │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Home     │  │ Remote   │  │  Settings     │  │
│  │ Screen   │  │ Screen   │  │  Screen       │  │
│  └────┬─────┘  └────┬─────┘  └───────────────┘  │
│       │              │                           │
│  ┌────┴──────────────┴────────────────────────┐  │
│  │            TVContext (State)                │  │
│  └────┬───────────────────────────────────────┘  │
│       │                                          │
│  ┌────┴──────────────────────────────────────┐   │
│  │          Adapter Layer (7 Protocols)        │   │
│  │  ┌──────┐ ┌────────┐ ┌────┐ ┌──────┐      │   │
│  │  │ Roku │ │Samsung │ │ LG │ │ Sony │      │   │
│  │  └──┬───┘ └───┬────┘ └─┬──┘ └──┬───┘      │   │
│  │  ┌──┴───┐ ┌───┴──────┐ ┌┴──────┴──┐       │   │
│  │  │Vizio │ │AndroidTV │ │ Fire TV  │       │   │
│  │  └──┬───┘ └───┬──────┘ └──┬───────┘       │   │
│  └─────┼─────────┼───────────┼────────────────┘   │
│        │         │           │                    │
│  ┌─────┴─────────┴───────────┴────────────────┐   │
│  │     Discovery Layer (SSDP / mDNS / Scan)    │   │
│  └────────────────┬───────────────────────────┘   │
└───────────────────┼──────────────────────────────┘
                    │ WiFi (Local Network)
   ┌────────┬───────┼───────┬──────────┐
   │        │       │       │          │
┌──┴──┐ ┌──┴───┐ ┌─┴──┐ ┌──┴───┐ ┌───┴────┐
│Roku │ │Sam-  │ │ LG │ │Sony  │ │Android │  + Vizio
│     │ │sung  │ │    │ │Bravia│ │TV/Fire │
└─────┘ └──────┘ └────┘ └──────┘ └────────┘
```

---

## 3. TV Protocol Details

### 3.1 Adapter Interface

Every TV brand adapter must implement this interface:

```typescript
interface TVAdapter {
  /** Unique brand identifier */
  brand: TVBrand;

  /** Attempt to connect/pair with the TV. Returns true on success. */
  connect(ip: string): Promise<boolean>;

  /** Disconnect from the TV */
  disconnect(): Promise<void>;

  /** Send a remote control command */
  sendKey(key: RemoteKey): Promise<void>;

  /** Check if TV is reachable */
  ping(): Promise<boolean>;

  /** Get current TV state (power, volume, input) if supported */
  getState?(): Promise<TVState>;
}

type TVBrand = 'roku' | 'samsung' | 'lg' | 'sony' | 'vizio' | 'androidtv' | 'firetv';

type RemoteKey =
  | 'power'
  | 'volume_up' | 'volume_down' | 'mute'
  | 'channel_up' | 'channel_down'
  | 'up' | 'down' | 'left' | 'right' | 'select'
  | 'back' | 'home' | 'menu'
  | 'play' | 'pause' | 'stop' | 'rewind' | 'forward'
  | 'input'
  | 'num_0' | 'num_1' | 'num_2' | 'num_3' | 'num_4'
  | 'num_5' | 'num_6' | 'num_7' | 'num_8' | 'num_9';

interface TVState {
  power: boolean;
  volume?: number;
  muted?: boolean;
  input?: string;
}
```

### 3.2 Roku — External Control Protocol (ECP)

**Protocol:** REST API over HTTP
**Port:** 8060
**Auth:** None required
**Discovery:** SSDP (`ST: roku:ecp`)

**Key Implementation Details:**
- Discovery: Send SSDP M-SEARCH to `239.255.255.250:1900` with `ST: roku:ecp`
- Commands: `POST http://{ip}:8060/keypress/{key}` (e.g., `/keypress/VolumeUp`)
- Key hold: `POST /keydown/{key}` then `POST /keyup/{key}`
- Query device info: `GET http://{ip}:8060/query/device-info`
- No pairing/auth required — simplest protocol

**Roku Key Mapping:**

| RemoteKey | Roku ECP Key |
|---|---|
| power | `Power` |
| volume_up | `VolumeUp` |
| volume_down | `VolumeDown` |
| mute | `VolumeMute` |
| up | `Up` |
| down | `Down` |
| left | `Left` |
| right | `Right` |
| select | `Select` |
| back | `Back` |
| home | `Home` |
| play | `Play` |
| pause | `Play` (toggle) |
| rewind | `Rev` |
| forward | `Fwd` |
| input | `InputTuner` |

**npm package:** `roku-client` or raw `fetch()` calls (simple enough to skip the dep).

### 3.3 Sony Bravia — IRCC-IP

**Protocol:** REST API over HTTP + SOAP/XML for IRCC commands
**Port:** 80 (HTTP API)
**Auth:** Pre-Shared Key (PSK) or PIN pairing
**Discovery:** SSDP (`ST: urn:schemas-sony-com:service:IRCC:1`) or manual IP entry

**Key Implementation Details:**
- Enable "Remote Start" and set a Pre-Shared Key on the TV: Settings → Network → Home Network → IP Control → Authentication → Normal and Pre-Shared Key
- Send commands via POST to `http://{ip}/sony/IRCC` with SOAP/XML body containing the IRCC code
- Alternative: REST API at `http://{ip}/sony/system` for some operations
- PSK is sent as `X-Auth-PSK` header

**Sony IRCC Code Mapping:**

| RemoteKey | IRCC Code Name |
|---|---|
| power | `AAAAAQAAAAEAAAAVAw==` |
| volume_up | `AAAAAQAAAAEAAAASAw==` |
| volume_down | `AAAAAQAAAAEAAAATAw==` |
| mute | `AAAAAQAAAAEAAAAUAw==` |
| up | `AAAAAQAAAAEAAAB0Aw==` |
| down | `AAAAAQAAAAEAAAB1Aw==` |
| left | `AAAAAQAAAAEAAAA0Aw==` |
| right | `AAAAAQAAAAEAAAAzAw==` |
| select | `AAAAAQAAAAEAAABlAw==` |
| back | `AAAAAgAAAJcAAAAjAw==` |
| home | `AAAAAQAAAAEAAABgAw==` |
| play | `AAAAAgAAAJcAAAAaAw==` |
| pause | `AAAAAgAAAJcAAAAZAw==` |
| stop | `AAAAAgAAAJcAAAAYAw==` |
| input | `AAAAAQAAAAEAAAAlAw==` |

**npm approach:** Raw `fetch()` with XML body — no npm dep needed.

### 3.4 Vizio SmartCast — HTTPS API

**Protocol:** REST API over HTTPS
**Port:** 7345 (firmware 4.0+) or 9000 (older)
**Auth:** PIN pairing → auth token
**Discovery:** SSDP (`ST: urn:dial-multiscreen-org:device:dial:1`) or manual IP entry

**Key Implementation Details:**
- Pairing flow:
  1. `PUT https://{ip}:7345/pairing?action=start` with device info
  2. TV displays a PIN on screen
  3. `PUT https://{ip}:7345/pairing?action=pair` with the PIN
  4. Response includes an `AUTH_TOKEN` for future requests
- All commands require `AUTH_TOKEN` header
- SSL certificate is self-signed (CN: `BG2.prod.vizio.com`) — must disable SSL validation
- Key commands: `PUT https://{ip}:7345/key_command/` with keycode and action in JSON body

**Vizio Key Mapping:**

| RemoteKey | Vizio Codeset / Code |
|---|---|
| power | codeset: 11, code: 0 |
| volume_up | codeset: 5, code: 1 |
| volume_down | codeset: 5, code: 0 |
| mute | codeset: 5, code: 3 |
| up | codeset: 3, code: 8 |
| down | codeset: 3, code: 2 |
| left | codeset: 3, code: 1 |
| right | codeset: 3, code: 7 |
| select | codeset: 3, code: 2 |
| back | codeset: 4, code: 0 |
| home | codeset: 4, code: 3 |
| play | codeset: 2, code: 3 |
| pause | codeset: 2, code: 2 |
| input | codeset: 7, code: 1 |

**npm approach:** Raw `fetch()` with SSL validation disabled.

### 3.5 Samsung — WebSocket Protocol

**Protocol:** WebSocket
**Port:** 8002 (2018+ models, secure WS) or 8001 (2016-2017, plain WS)
**Auth:** Token-based — TV prompts "Allow" on first connection, token stored for future use
**Discovery:** SSDP (`ST: urn:samsung.com:device:RemoteControlReceiver:1`) or manual IP

**Key Implementation Details:**
- Connect via WebSocket to `wss://{ip}:8002/api/v2/channels/samsung.remote.control?name={base64_app_name}`
- On first connection, TV displays "Allow/Deny" prompt. Once allowed, a token is returned.
- Subsequent connections include token in URL: `&token={token}`
- Commands sent as JSON messages over WebSocket:
  ```json
  {
    "method": "ms.remote.control",
    "params": {
      "Cmd": "Click",
      "DataOfCmd": "KEY_VOLUP",
      "Option": "false",
      "TypeOfRemote": "SendRemoteKey"
    }
  }
  ```
- Wake-on-LAN supported for powering on from sleep
- Self-signed SSL cert — must accept/ignore SSL validation errors

**Samsung Key Mapping:**

| RemoteKey | Samsung Key Code |
|---|---|
| power | `KEY_POWER` |
| volume_up | `KEY_VOLUP` |
| volume_down | `KEY_VOLDOWN` |
| mute | `KEY_MUTE` |
| channel_up | `KEY_CHUP` |
| channel_down | `KEY_CHDOWN` |
| up | `KEY_UP` |
| down | `KEY_DOWN` |
| left | `KEY_LEFT` |
| right | `KEY_RIGHT` |
| select | `KEY_ENTER` |
| back | `KEY_RETURN` |
| home | `KEY_HOME` |
| menu | `KEY_MENU` |
| play | `KEY_PLAY` |
| pause | `KEY_PAUSE` |
| stop | `KEY_STOP` |
| rewind | `KEY_REWIND` |
| forward | `KEY_FF` |
| input | `KEY_SOURCE` |
| num_0-9 | `KEY_0` through `KEY_9` |

**npm approach:** Use React Native's built-in WebSocket API. No extra deps needed.

### 3.6 LG webOS — SSAP over WebSocket

**Protocol:** SSAP (Simple Service Access Protocol) over WebSocket
**Port:** 3000
**Auth:** TV prompts user to accept on first connection. A client key is returned and stored for future use.
**Discovery:** SSDP (`ST: urn:schemas-upnp-org:device:MediaRenderer:1` or `ssdp:all` and filter for LG) or manual IP

**Key Implementation Details:**
- Connect via WebSocket to `ws://{ip}:3000`
- On connection, send a registration message with app name. If no stored key, TV shows "Accept/Deny" prompt.
- Once accepted, TV returns a `client-key` in the response. Store this for future pairing-free connections.
- Commands are sent as JSON with a SSAP URI:
  ```json
  {
    "type": "request",
    "id": "1",
    "uri": "ssap://com.webos.service.networkinput/getPointerInputSocket"
  }
  ```
- Volume control: `ssap://audio/setVolume`, `ssap://audio/volumeUp`, `ssap://audio/volumeDown`
- Navigation: Uses a secondary "pointer input" WebSocket for directional input (d-pad, clicks)
- Power off: `ssap://system/turnOff`
- Input switch: `ssap://tv/switchInput`

**LG SSAP Command Mapping:**

| RemoteKey | SSAP Command |
|---|---|
| power | `ssap://system/turnOff` |
| volume_up | `ssap://audio/volumeUp` |
| volume_down | `ssap://audio/volumeDown` |
| mute | `ssap://audio/setMute` (toggle) |
| channel_up | `ssap://tv/channelUp` |
| channel_down | `ssap://tv/channelDown` |
| up / down / left / right / select | Sent via pointer input WebSocket as button events |
| back | Button event `BACK` via pointer input socket |
| home | Button event `HOME` via pointer input socket |
| menu | Button event `MENU` via pointer input socket |
| play | `ssap://media.controls/play` |
| pause | `ssap://media.controls/pause` |
| stop | `ssap://media.controls/stop` |
| rewind | `ssap://media.controls/rewind` |
| forward | `ssap://media.controls/fastForward` |
| input | `ssap://tv/switchInput` |

**LG Pointer Input Socket:**
- After initial connection, request the pointer input socket URL
- Connect a second WebSocket to the returned URL
- D-pad and button commands are sent as plain text messages: `type:button\nname:UP\n\n`

**npm approach:** Use React Native's built-in WebSocket API. Two WebSocket connections per LG TV (one for commands, one for d-pad input).

### 3.7 Android TV / Google TV — Remote Protocol v2

**Protocol:** TLS/SSL-encrypted custom binary protocol
**Ports:** 6466 (remote control), 6467 (pairing)
**Auth:** Certificate-based pairing — TV displays a PIN code, phone sends it to complete TLS handshake
**Discovery:** mDNS service type `_androidtvremote2._tcp`

**Key Implementation Details:**
- This is the same protocol used by the official Google TV mobile remote app
- Pairing flow:
  1. App initiates TLS connection to port 6467
  2. TV displays a 6-digit PIN code on screen
  3. App sends the PIN to complete the pairing
  4. Client/server certificates are exchanged and stored
  5. Future connections use the stored certificates (no PIN needed)
- After pairing, connect to port 6466 for remote control
- Commands are sent as protobuf-encoded messages
- Supports: key events, deep links (open apps by URL), and voice (PCM audio)
- Works on: Chromecast with Google TV, Nvidia Shield, Sony Android TVs, TCL/Hisense Google TV, any Android TV OS device

**Android TV Key Mapping:**

| RemoteKey | Android KeyEvent Code |
|---|---|
| power | `KEYCODE_POWER` (26) |
| volume_up | `KEYCODE_VOLUME_UP` (24) |
| volume_down | `KEYCODE_VOLUME_DOWN` (25) |
| mute | `KEYCODE_VOLUME_MUTE` (164) |
| channel_up | `KEYCODE_CHANNEL_UP` (166) |
| channel_down | `KEYCODE_CHANNEL_DOWN` (167) |
| up | `KEYCODE_DPAD_UP` (19) |
| down | `KEYCODE_DPAD_DOWN` (20) |
| left | `KEYCODE_DPAD_LEFT` (21) |
| right | `KEYCODE_DPAD_RIGHT` (22) |
| select | `KEYCODE_DPAD_CENTER` (23) |
| back | `KEYCODE_BACK` (4) |
| home | `KEYCODE_HOME` (3) |
| menu | `KEYCODE_MENU` (82) |
| play | `KEYCODE_MEDIA_PLAY` (126) |
| pause | `KEYCODE_MEDIA_PAUSE` (127) |
| stop | `KEYCODE_MEDIA_STOP` (86) |
| rewind | `KEYCODE_MEDIA_REWIND` (89) |
| forward | `KEYCODE_MEDIA_FAST_FORWARD` (90) |
| num_0-9 | `KEYCODE_0` (7) through `KEYCODE_9` (16) |

**npm package:** `androidtv-remote` by louis49 — handles TLS pairing, certificate management, and protobuf encoding.

**Important note:** This protocol requires a native TLS module. Expo's managed workflow may need a custom dev client or an Expo config plugin for raw TCP/TLS sockets. Consider using `react-native-tcp-socket` for the TLS layer.

### 3.8 Fire TV — ADB over Network

**Protocol:** Android Debug Bridge (ADB) over TCP/IP
**Port:** 5555 (ADB default)
**Auth:** ADB key-based auth — first connection requires approval on the Fire TV screen
**Discovery:** mDNS (`_adb._tcp`) or manual IP entry

**Key Implementation Details:**
- **One-time setup required:** User must enable Developer Options on Fire TV:
  Settings → My Fire TV → Developer Options → ADB Debugging → ON
- ADB runs over TCP on port 5555 when enabled
- Commands sent as ADB shell commands: `input keyevent {keycode}`
- ADB protocol is complex (auth, transport, shell) — use a library rather than raw implementation
- Fire TV also supports the Android TV Remote Protocol v2 on some newer models — the `androidtv` adapter may work as a fallback

**Fire TV Key Mapping:**

| RemoteKey | ADB KeyEvent Code |
|---|---|
| power | `KEYCODE_POWER` (26) |
| volume_up | `KEYCODE_VOLUME_UP` (24) |
| volume_down | `KEYCODE_VOLUME_DOWN` (25) |
| mute | `KEYCODE_VOLUME_MUTE` (164) |
| up | `KEYCODE_DPAD_UP` (19) |
| down | `KEYCODE_DPAD_DOWN` (20) |
| left | `KEYCODE_DPAD_LEFT` (21) |
| right | `KEYCODE_DPAD_RIGHT` (22) |
| select | `KEYCODE_DPAD_CENTER` (23) |
| back | `KEYCODE_BACK` (4) |
| home | `KEYCODE_HOME` (3) |
| menu | `KEYCODE_MENU` (1) |
| play | `KEYCODE_MEDIA_PLAY_PAUSE` (85) |
| pause | `KEYCODE_MEDIA_PLAY_PAUSE` (85) |
| rewind | `KEYCODE_MEDIA_REWIND` (89) |
| forward | `KEYCODE_MEDIA_FAST_FORWARD` (90) |

**npm approach:** Use `adbkit` or a lightweight ADB client library. ADB protocol over TCP requires a native socket — may need `react-native-tcp-socket`.

**Complexity note:** ADB and Android TV Remote v2 both require raw TCP/TLS sockets which are not available in Expo Go. These adapters will need a custom Expo dev client build for testing, and will work in the final production APK/IPA.

---

## 4. Network Discovery

### 4.1 Discovery Flow

```
App Launch
    │
    ▼
┌─────────────────────────┐
│  Load saved TVs from    │
│  AsyncStorage           │
│  (show immediately)     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Run SSDP + mDNS scan   │   SSDP → Roku, Samsung, LG, Sony, Vizio
│  (3 second timeout)     │   mDNS → Android TV, Fire TV
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Parse SSDP responses   │   Extract IP, brand, model name
│  Merge with saved TVs   │   Mark online/offline status
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Display TV list        │   Green dot = online
│  User taps a TV         │   Gray dot = saved but offline
└─────────────────────────┘
```

### 4.2 Discovery Methods by Brand

| Brand | Discovery Method | Search Target / Service |
|---|---|---|
| Roku | SSDP | `roku:ecp` |
| Samsung | SSDP | `urn:samsung.com:device:RemoteControlReceiver:1` |
| LG | SSDP | `urn:schemas-upnp-org:device:MediaRenderer:1` (filter for LG in response) |
| Sony | SSDP | `urn:schemas-sony-com:service:IRCC:1` |
| Vizio | SSDP | `urn:dial-multiscreen-org:device:dial:1` |
| Android TV | mDNS | `_androidtvremote2._tcp` |
| Fire TV | mDNS | `_adb._tcp` (if ADB enabled) |
| All | SSDP | `ssdp:all` (fallback — scan everything, parse responses) |

**Discovery runs all methods in parallel** — SSDP broadcast + mDNS query simultaneously, results merged as they come in.

### 4.3 Manual Connection Fallback

If auto-discovery doesn't find a TV (common on some routers that block multicast):
1. User taps "Add TV Manually"
2. Enter TV's IP address
3. Select brand from dropdown (Roku / Samsung / LG / Sony / Vizio / Android TV / Fire TV)
4. App attempts connection using the selected brand's protocol
5. On success, TV is saved with its brand tag

---

## 5. UI Design

### 5.1 Screens

**Screen 1: Home (TV Selection)**
```
┌──────────────────────────────┐
│  R3MOTE                  ⚙️  │
│                              │
│  📡 Scanning for TVs...      │
│                              │
│  ┌──────────────────────────┐│
│  │ 🟢 Living Room Roku     ││
│  │    TCL 55" · Roku       ││
│  └──────────────────────────┘│
│  ┌──────────────────────────┐│
│  │ 🟢 Bedroom Sony         ││
│  │    Bravia XR · Sony     ││
│  └──────────────────────────┘│
│  ┌──────────────────────────┐│
│  │ ⚫ Basement Vizio        ││
│  │    V-Series · Offline   ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │  + Add TV Manually      ││
│  └──────────────────────────┘│
└──────────────────────────────┘
```

**Screen 2: Remote Control**
```
┌──────────────────────────────┐
│  ← Living Room Roku    ⏻    │  ← Power button top-right
│                              │
│  ┌──────────────────────────┐│
│  │       INPUT              ││
│  └──────────────────────────┘│
│                              │
│         ┌─────┐              │
│         │  ▲  │              │
│    ┌────┤     ├────┐         │
│    │ ◄  │ OK  │  ► │         │  ← D-Pad: Large touch targets
│    └────┤     ├────┘         │
│         │  ▼  │              │
│         └─────┘              │
│                              │
│  ┌──────┐  ┌──────┐         │
│  │ BACK │  │ HOME │         │  ← Navigation buttons
│  └──────┘  └──────┘         │
│                              │
│  ┌──────┐  ┌──────┐         │
│  │ MENU │  │ GUIDE│         │
│  └──────┘  └──────┘         │
│                              │
│    ⏪    ▶️/⏸    ⏩           │  ← Media controls
│                              │
│   🔉  ━━━━━━━━━━━━━━━ 🔊    │  ← Volume bar
│          🔇                  │  ← Mute button
│                              │
│  ┌──┐┌──┐┌──┐               │
│  │1 ││2 ││3 │               │
│  ├──┤├──┤├──┤               │  ← Number pad
│  │4 ││5 ││6 │               │     (collapsible)
│  ├──┤├──┤├──┤               │
│  │7 ││8 ││9 │               │
│  ├──┤├──┤├──┤               │
│  │  ││0 ││  │               │
│  └──┘└──┘└──┘               │
└──────────────────────────────┘
```

**Screen 3: Settings**
```
┌──────────────────────────────┐
│  ← Settings                  │
│                              │
│  Saved TVs                   │
│  ┌──────────────────────────┐│
│  │ Living Room Roku    [✏️] ││  ← Rename / forget
│  │ Bedroom Sony        [✏️] ││
│  │ Basement Vizio      [✏️] ││
│  └──────────────────────────┘│
│                              │
│  Preferences                 │
│  ┌──────────────────────────┐│
│  │ Haptic Feedback   [ON]   ││
│  │ Dark Mode         [ON]   ││
│  │ Button Size       [LRG]  ││
│  │ Number Pad        [HIDE] ││
│  └──────────────────────────┘│
│                              │
│  About                       │
│  R3mote v1.0.0               │
│  Made with ❤️ for family     │
└──────────────────────────────┘
```

### 5.2 UX Requirements

- **Haptic feedback** on every button press (Expo Haptics)
- **Dark theme by default** (easier on eyes, looks like a real remote)
- **No splash screen delay** — show saved TVs instantly, scan in background
- **Button minimum touch target:** 48x48dp (Android guideline), ideally 56x56dp+
- **D-Pad:** Single large component with swipe/tap zones, not 5 separate tiny buttons
- **Volume:** Either large +/- buttons or a vertical slider on the side
- **Quick reconnect:** Tapping a saved TV on the home screen should connect in under 500ms

### 5.3 Theme

```typescript
const theme = {
  colors: {
    background: '#0D0D0D',       // Near-black background
    surface: '#1A1A2E',          // Card/button background
    surfacePressed: '#16213E',   // Button pressed state
    primary: '#0F3460',          // Primary accent (deep blue)
    accent: '#E94560',           // Power button, important actions (red)
    text: '#FFFFFF',             // Primary text
    textSecondary: '#A0A0A0',    // Secondary text
    success: '#00C853',          // Online indicator
    border: '#2A2A3E',           // Subtle borders
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    round: 999,
  },
  button: {
    minHeight: 56,
    minWidth: 56,
  },
};
```

---

## 6. Pairing Flows (Per Brand)

### 6.1 Roku
1. App discovers Roku via SSDP
2. No pairing needed — Roku ECP is open by default
3. App sends `GET /query/device-info` to confirm it's a Roku
4. TV is saved with IP, model name, and "roku" brand tag
5. Ready to use immediately

### 6.2 Sony Bravia
1. App discovers Sony via SSDP or user enters IP manually
2. App prompts user: "On your Sony TV, go to Settings → Network → Home Network → IP Control → set Pre-Shared Key"
3. User enters the PSK they set on the TV (e.g., "1234")
4. App sends a test command with `X-Auth-PSK` header to verify
5. TV is saved with IP, PSK, and "sony" brand tag

### 6.3 Vizio SmartCast
1. App discovers Vizio via SSDP or user enters IP manually
2. App sends pairing start request to TV
3. TV displays a PIN on screen
4. User enters PIN in app
5. App receives AUTH_TOKEN
6. TV is saved with IP, AUTH_TOKEN, and "vizio" brand tag

### 6.4 Samsung
1. App discovers Samsung via SSDP or user enters IP manually
2. App opens WebSocket connection to TV
3. TV displays "Allow/Deny" prompt on screen
4. User presses "Allow" on the TV (using physical remote or TV button)
5. App receives auth token via WebSocket
6. TV is saved with IP, token, and "samsung" brand tag
7. Future connections include the token — no prompt shown

### 6.5 LG webOS
1. App discovers LG via SSDP or user enters IP manually
2. App opens WebSocket connection to port 3000
3. App sends registration request
4. TV displays "Accept/Deny" prompt on screen
5. User presses "Accept" on the TV
6. App receives a `client-key` in the response
7. TV is saved with IP, client-key, and "lg" brand tag
8. Future connections include the client-key — no prompt shown

### 6.6 Android TV / Google TV
1. App discovers Android TV via mDNS or user enters IP manually
2. App initiates TLS pairing connection to port 6467
3. TV displays a 6-digit PIN code on screen
4. User enters PIN in the app
5. TLS handshake completes, client certificate is stored
6. TV is saved with IP, certificate data, and "androidtv" brand tag
7. Future connections use stored certificate — no PIN needed

### 6.7 Fire TV
1. User must first enable ADB Debugging on Fire TV: Settings → My Fire TV → Developer Options → ADB Debugging → ON
2. App guides user through this one-time setup with step-by-step instructions
3. User enters Fire TV IP address (shown in Fire TV Settings → My Fire TV → About → Network)
4. App initiates ADB TCP connection to port 5555
5. Fire TV displays "Allow USB debugging?" prompt
6. User presses "OK" on the Fire TV (check "Always allow" box)
7. TV is saved with IP and "firetv" brand tag

---

## 7. Data Storage Schema

Stored in AsyncStorage as JSON:

```typescript
interface SavedTV {
  id: string;              // UUID
  name: string;            // User-editable nickname
  brand: TVBrand;          // 'roku' | 'samsung' | 'lg' | 'sony' | 'vizio' | 'androidtv' | 'firetv'
  ip: string;              // Last known IP
  model?: string;          // Model name from discovery
  mac?: string;            // MAC address for Wake-on-LAN (Samsung, LG)
  authToken?: string;      // Vizio auth token / Samsung token
  clientKey?: string;      // LG webOS client key
  psk?: string;            // Sony pre-shared key
  certificate?: string;    // Android TV TLS client certificate (base64)
  lastSeen: number;        // Unix timestamp
  favorite: boolean;       // Pin to top of list
}

interface AppSettings {
  hapticFeedback: boolean;  // Default: true
  darkMode: boolean;        // Default: true (only mode for v1)
  buttonSize: 'normal' | 'large';  // Default: 'large'
  showNumberPad: boolean;   // Default: false
  lastTvId?: string;        // Auto-reconnect to last used TV
}
```

---

## 8. Build & Distribution

### 8.1 Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Expo account (free at expo.dev)
- Apple Developer account ($99/year) — for iOS only

### 8.2 Build Commands

```bash
# Install dependencies
npm install

# Development (test on your phone via Expo Go)
npx expo start

# Build Android APK (cloud build, no Android Studio needed)
eas build --platform android --profile preview

# Build iOS IPA (cloud build, no Mac needed!)
eas build --platform ios --profile preview
```

### 8.3 EAS Build Configuration

**eas.json:**
```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      },
      "ios": {
        "simulator": false,
        "distribution": "internal"
      }
    },
    "production": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "distribution": "internal"
      }
    }
  },
  "submit": {}
}
```

### 8.4 Distribution Steps

**Android:**
1. Run `eas build --platform android --profile preview`
2. Download the `.apk` file from Expo dashboard
3. Share APK via Google Drive, email, or messaging app
4. Family members tap the APK → "Install from unknown sources" → Done

**iOS:**
1. Collect UDIDs from family iPhones (Settings → General → About → tap to copy)
2. Register devices in Apple Developer Portal → Devices
3. Run `eas build --platform ios --profile preview`
4. EAS automatically creates Ad Hoc provisioning profile
5. Download the `.ipa` or use the install link from Expo dashboard
6. Family members open the install link on their iPhone → Trust the developer profile → Done

**Alternatively for iOS**, use the `eas device:create` command to generate a registration URL that family members can open on their iPhones to register their UDID automatically.

---

## 9. Dependencies

### 9.1 Core Dependencies

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-haptics": "~14.0.0",
    "expo-status-bar": "~2.0.0",
    "react": "18.3.1",
    "react-native": "0.76.x",
    "@react-native-async-storage/async-storage": "2.1.x",
    "react-native-safe-area-context": "~5.0.0",
    "react-native-screens": "~4.4.0",
    "react-native-gesture-handler": "~2.20.0",
    "react-native-reanimated": "~3.16.0",
    "react-native-zeroconf": "~0.13.0",
    "react-native-tcp-socket": "~6.2.0"
  },
  "devDependencies": {
    "@types/react": "~18.3.0",
    "typescript": "~5.3.0"
  }
}
```

### 9.2 Key Libraries Explained

| Package | Purpose |
|---|---|
| `expo-haptics` | Vibration feedback on button press |
| `expo-router` | File-based navigation (home → remote → settings) |
| `@react-native-async-storage/async-storage` | Persist saved TVs and settings |
| `react-native-zeroconf` | mDNS network discovery for finding Android TV, Fire TV |
| `react-native-tcp-socket` | Raw TCP/TLS sockets for Android TV Remote v2 and Fire TV ADB protocols |
| `react-native-gesture-handler` | Smooth D-pad gestures |
| `react-native-reanimated` | Button press animations |

### 9.3 What We DON'T Need (Keeping It Small)

- No state management library (Context API is sufficient)
- No HTTP client library (built-in `fetch` works for all TV APIs)
- No external WebSocket library (React Native has built-in WebSocket support for Samsung/LG)
- No UI component library (custom components, keeps bundle small)
- No analytics, crash reporting, or telemetry (private family app)

---

## 10. Legacy TV Support (Phase 2)

### 10.1 Recommended Approach: WiFi IR Bridge

For legacy (non-smart) TVs, the most practical solution is a **WiFi-connected IR blaster** that sits near the TV:

**Recommended device:** Broadlink RM4 Mini (~$25)
- Connects to home WiFi
- Has a local HTTP API
- Controls any IR device (TV, DVD player, AC, etc.)
- Can learn IR codes from existing remotes
- 10m+ IR range

**Integration plan:**
1. Add a "Broadlink" adapter that implements the same `TVAdapter` interface
2. Discovery via mDNS (Broadlink devices advertise on the network)
3. User teaches the bridge their TV's IR codes using the "Learn" feature
4. App sends commands to the Broadlink bridge over WiFi → bridge emits IR → TV responds

**Alternative:** USB-C IR dongle adapters (~$13) that plug into the phone. These require platform-specific native code and are less reliable. Not recommended for v1.

### 10.2 Implementation Timeline

- **v1.0:** All 7 smart TV protocols (Roku, Samsung, LG, Sony, Vizio, Android TV, Fire TV). Core remote functionality. Full "any TV" coverage.
- **v1.1:** Broadlink RM4 Mini integration for legacy IR TVs. Wake-on-LAN. Keyboard input for TV search bars.
- **v1.2:** Macros, widgets, quick actions.

---

## 11. Security Considerations

- **All traffic stays on local network** — no internet, no cloud, no data leaves the house
- **No user accounts** — no passwords to manage
- **Vizio auth tokens** stored in AsyncStorage (device-local, encrypted on iOS)
- **Sony PSK** stored in AsyncStorage (consider prompting to re-enter instead of storing)
- **No telemetry, no analytics, no tracking** — zero data collection
- **App permissions required:**
  - `android.permission.INTERNET` — for local network HTTP calls
  - `android.permission.ACCESS_WIFI_STATE` — for network discovery
  - `android.permission.ACCESS_NETWORK_STATE` — for connectivity checks
  - `android.permission.VIBRATE` — for haptic feedback
  - iOS: Local Network permission (auto-prompted by OS)

---

## 12. Error Handling

| Scenario | User Experience |
|---|---|
| TV not found on network | Show "TV is offline" with retry button. Offer manual IP entry. |
| Command fails | Subtle red flash on button. Auto-retry once. |
| WiFi disconnected | Banner: "Connect to WiFi to use R3mote" |
| TV IP changed (DHCP) | Re-run discovery on app open. Update saved IP silently. |
| Vizio token expired | Prompt re-pairing with PIN |
| Sony PSK wrong | Prompt to re-enter PSK |
| Samsung token invalid | Prompt user to re-allow on TV |
| LG client key rejected | Prompt user to re-accept on TV |
| Android TV cert rejected | Re-initiate pairing, show new PIN |
| Fire TV ADB not enabled | Show setup instructions with screenshots |

---

## 13. Testing Strategy

### 13.1 Development Testing

- Use **Expo Go** app on personal phone to test during development
- Expo Go connects to dev server on same WiFi → hot reload on save
- Test each TV protocol adapter against real TVs
- Manual testing only (no automated tests needed for family app)

### 13.2 Pre-Release Checklist

- [ ] Roku: Discover, connect, all buttons work
- [ ] Samsung: Discover, pair (allow on TV), all buttons work
- [ ] LG: Discover, pair (accept on TV), all buttons work
- [ ] Sony: Pair with PSK, all buttons work
- [ ] Vizio: Pair with PIN, all buttons work
- [ ] Android TV: Discover, pair with PIN, all buttons work
- [ ] Fire TV: Manual connect, ADB pair, all buttons work
- [ ] App launches in under 1 second
- [ ] Haptic feedback on all buttons
- [ ] Saved TVs persist across app restarts
- [ ] Dark theme renders correctly on iOS and Android
- [ ] APK installs on Android without issues
- [ ] IPA installs on iOS via Ad Hoc

---

## 14. Future Enhancements (Nice-to-Have)

- **Voice control:** "Hey R3mote, volume up" using on-device speech recognition
- **Quick actions:** Long-press app icon → jump to favorite TV's remote
- **Widget:** Android home screen widget with volume +/- and power
- **Macros:** "Movie mode" = Input HDMI2 → Volume 25 → Lights off (if smart lights)
- **Keyboard input:** Type text for TV search bars (Roku/Android TV)
- **Wake-on-LAN:** Power on TVs that support WoL
- **Channel favorites:** Quick-access buttons for favorite channels

---

## 15. Implementation Order (For AI Agent)

The AI agent should build this app in the following order:

### Step 1: Project Setup
- Initialize Expo project with TypeScript template
- Configure `app.json` and `eas.json`
- Install all dependencies
- Set up project structure (folders, files)
- Set up theme and base layout

### Step 2: Roku Adapter (Simplest Protocol)
- Implement SSDP discovery for Roku devices
- Implement `RokuAdapter` with all key mappings
- Test basic key commands (volume, navigation)

### Step 3: Remote UI
- Build `RemoteButton` component with haptic feedback
- Build `DPad` component
- Build `VolumeBar` component
- Build `MediaControls` component
- Build `RemoteLayout` assembling all components
- Build Remote screen with the full layout

### Step 4: Home Screen
- Build `TVCard` component
- Build discovery hook (`useDiscovery`)
- Build Home screen with TV list
- Implement "Add TV Manually" flow

### Step 5: State & Storage
- Implement `TVContext` for global state
- Implement `tvStore` for AsyncStorage persistence
- Wire up auto-reconnect to last TV

### Step 6: Remaining HTTP-Based Adapters (Sony + Vizio)
- Implement `SonyAdapter` with IRCC-IP commands and PSK auth
- Implement `VizioAdapter` with SmartCast API and PIN pairing
- Add pairing UI flows for each

### Step 7: WebSocket-Based Adapters (Samsung + LG)
- Implement `SamsungAdapter` with WebSocket protocol, token auth
- Implement `LGAdapter` with SSAP/WebSocket, dual socket (commands + pointer input), client key auth
- Add pairing UI flows for each (Samsung: "Allow on TV", LG: "Accept on TV")

### Step 8: TCP/TLS-Based Adapters (Android TV + Fire TV)
- Install and configure `react-native-tcp-socket`
- Implement `AndroidTVAdapter` with TLS pairing, certificate storage, protobuf key events
- Implement `FireTVAdapter` with ADB over TCP, key events
- Add pairing UI flows (Android TV: PIN entry, Fire TV: setup guide + ADB approval)
- NOTE: These adapters require a custom Expo dev client — cannot test in Expo Go

### Step 9: Settings Screen
- Build settings screen
- Implement rename/forget TV
- Implement preference toggles

### Step 10: Polish
- Add animations (button press feedback, screen transitions)
- Handle edge cases (offline TVs, DHCP changes, errors)
- Optimize bundle size
- Final UI polish

### Step 11: Build & Distribute
- Build APK with EAS
- Build IPA with EAS
- Create distribution instructions for family

---

## 16. Estimated Timeline

| Step | Scope | Effort |
|---|---|---|
| Setup + Roku | Project init, Roku adapter (simplest protocol), basic remote UI | ~2-3 hours (AI agent) |
| Full Remote UI | All components, D-pad, volume, media, navigation, theme | ~2-3 hours |
| Sony + Vizio | HTTP-based adapters, PSK/PIN pairing flows | ~2-3 hours |
| Samsung + LG | WebSocket-based adapters, token/key auth pairing flows | ~3-4 hours |
| Android TV + Fire TV | TCP/TLS-based adapters, cert pairing, ADB, custom dev client setup | ~4-5 hours |
| Polish + Build | Error handling, settings, EAS builds, distribution | ~2-3 hours |
| **Total** | **Complete app — ALL 7 protocols** | **~15-21 hours** |

---

## Appendix A: Quick Reference — TV Setup Instructions for Family

### Roku (Easiest - No Setup!)
Nothing to do! Just make sure the Roku is connected to WiFi. Open R3mote, tap the Roku, done.

### Samsung
1. Make sure the TV is on and connected to WiFi
2. Open R3mote and tap the Samsung TV
3. A prompt will appear **on the TV**: "Allow R3mote?" → Press **Allow**
4. Done! The app remembers the pairing.

### LG
1. Make sure the TV is on and connected to WiFi
2. Open R3mote and tap the LG TV
3. A prompt will appear **on the TV**: "Accept connection?" → Press **Accept**
4. Done! The app remembers the pairing.

### Sony Bravia
1. On the TV remote, press **Home**
2. Go to **Settings** → **Network** → **Home Network Setup** → **IP Control**
3. Set **Authentication** to **Normal and Pre-Shared Key**
4. Set a Pre-Shared Key (e.g., `1234`)
5. Enable **Remote Start** to **On**
6. In the R3mote app, enter the same key when prompted

### Vizio SmartCast
1. Make sure the TV is on and connected to WiFi
2. In the R3mote app, tap the Vizio TV
3. A PIN will appear on the TV screen
4. Enter the PIN in the app
5. Done! The app remembers the pairing.

### Android TV / Google TV / Chromecast
1. Make sure the device is on and connected to WiFi
2. Open R3mote and tap the Android TV device
3. A 6-digit PIN will appear on the TV screen
4. Enter the PIN in the app
5. Done! The app remembers the pairing.

### Fire TV / Fire Stick
1. On the Fire TV, go to **Settings** → **My Fire TV** → **Developer Options**
2. Turn on **ADB Debugging**
3. Note the IP address: **Settings** → **My Fire TV** → **About** → **Network**
4. In R3mote, tap **Add TV Manually** → enter the IP → select **Fire TV**
5. A prompt appears on the Fire TV: "Allow USB debugging?" → Press **OK** (check "Always allow")
6. Done! The app remembers the connection.

---

## Appendix B: Troubleshooting

| Problem | Solution |
|---|---|
| "No TVs found" | Make sure phone and TV are on the same WiFi network. Try "Add TV Manually" with the TV's IP address. |
| "TV offline" | Check if TV is powered on and connected to WiFi. Try power cycling the TV. |
| Roku not responding | Restart the Roku. Check Settings → System → Advanced → Control by mobile apps → Enable. |
| Samsung not found | Make sure the TV is on (not standby). Some models need: Settings → General → Network → Expert Settings → IP Remote → On. |
| LG not responding | Enable LG Connect Apps: Settings → Network → LG Connect Apps → On. Restart TV. |
| Sony commands not working | Verify the Pre-Shared Key is correct. Make sure IP Control is enabled on the TV. |
| Vizio pairing fails | Make sure you enter the PIN within 30 seconds. Try restarting the TV and pairing again. |
| Android TV PIN not showing | Make sure the device is awake (not screensaver). Try restarting the device. |
| Fire TV won't connect | Verify ADB Debugging is enabled. Try: Settings → My Fire TV → Developer Options → ADB Debugging → toggle OFF then ON. |
| App won't install (Android) | Enable "Install from unknown sources" in phone Settings → Security. |
| App won't install (iOS) | After installing, go to Settings → General → VPN & Device Management → Trust the developer certificate. |
