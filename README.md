# Tidewords

A relaxing word wheel crossword puzzle game — mobile web and desktop web, built as an installable
PWA. See [`HANDOVER.md`](./HANDOVER.md) for the full design spec and build phases, and
[`CLAUDE.md`](./CLAUDE.md) for the project structure and coding conventions.

## Getting started

```sh
npm install
npm run dev -- --host   # --host exposes it on your LAN so you can open it on your phone
```

Then open the "Network" URL Vite prints (something like `http://192.168.x.x:5173/`) on a phone
on the same Wi-Fi network.

## Scripts

| Command              | What it does                                       |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | Start the dev server                               |
| `npm run build`      | Type check and build for production                |
| `npm run preview`    | Preview the production build (also LAN-accessible) |
| `npm run typecheck`  | Type check only (`tsc -b`)                         |
| `npm run lint`       | Lint with ESLint                                   |
| `npm run format`     | Format with Prettier                               |
| `npm test`           | Run the unit test suite once (Vitest)              |
| `npm run test:watch` | Run the unit test suite in watch mode              |

## Status

Phase 1 (playable core) is done: 10 hand-written levels, swipe-to-spell wheel, crossword grid,
coins/bonus jar economy, and progress that survives a reload. See `CLAUDE.md` for what's built
and what's next.

## Native builds

The Android and iOS apps are [Capacitor](https://capacitorjs.com/) shells around the same
production web build (`dist/`), configured in `capacitor.config.ts`. The generated native
projects live in `android/` and `ios/` and are committed; web assets copied into them are
gitignored, so run a sync after every web change.

| Command               | What it does                                                  |
| --------------------- | ------------------------------------------------------------- |
| `npm run cap:sync`    | Build the web app and copy it + plugins into both native apps |
| `npm run cap:android` | Sync, then open the project in Android Studio                 |
| `npm run cap:ios`     | Sync, then open the project in Xcode (macOS only)             |

**Android** (any OS): install Android Studio (it brings the SDK and a JDK 21), then
`npm install && npm run cap:android` and press Run, or build a debug APK from the command line
with `cd android && ./gradlew assembleDebug`.

**iOS** (macOS only): install Xcode 16+ (no CocoaPods needed — the iOS project uses Swift Package
Manager), then:

```sh
npm install
npm run cap:ios          # opens ios/App/App.xcodeproj
```

In Xcode, pick the **App** target → Signing & Capabilities → choose your team, then run on a
device or simulator. Xcode resolves the Capacitor Swift packages on first open.

Native differences from the web build:

- **Haptics** use the `@capacitor/haptics` plugin (a light impact per letter, a success
  notification for a found word), which is how iOS gets haptics at all. The web build keeps
  using `navigator.vibrate`. See `src/haptics/haptics.ts`.
- **No service worker** in the native shell (`src/components/Modal/UpdatePrompt.tsx`): the web
  build ships inside the app and updates come through the stores.
- The bundle id is `app.tidewords.game` (placeholder — confirm before the first store upload; it
  can't change afterwards). Launcher icons and splash screens are renders of
  `public/icons/icon*.svg`.
