# FieldTrack Mobile (Flutter)

The technician-facing mobile app. This folder is a placeholder — the Flutter
project hasn't been generated yet (Flutter wasn't installed at scaffold time).

## Generate the app

Install Flutter (https://docs.flutter.dev/get-started/install), then from the
repo root:

```bash
cd apps
flutter create --org com.fieldtrack --project-name mobile mobile
```

> `flutter create` will populate this folder. Keep this README (or fold its
> notes into the generated one).

## Why it's not a pnpm workspace member

Flutter uses `pub` (not npm/pnpm), so `apps/mobile` is intentionally excluded
from the JS/TS toolchain. It still lives in the monorepo so the whole product
is versioned together and can share API contracts (see `packages/types` and
`docs/api.md`) by mirroring them in Dart.

## Planned screens

Login, Dashboard, Assigned Jobs, Job Details, Maps & Navigation, Start/Pause/
Complete Job, Upload Photos, Scan QR, Digital Signature, Notifications, Chat,
Profile, Offline Sync, Job History.
