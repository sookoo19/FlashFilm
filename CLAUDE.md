# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FlashFilm** is a React Native + Expo (TypeScript) camera app. The core concept: photos are taken with flash locked ON, then the user manually adjusts film-style parameters (exposure, contrast, saturation, temperature, tint, grain). The adjusted image + recipe JSON are saved as a dataset sample for future AI model training.

The npm project root is `FlashFilm/` (subdirectory), not the repo root.

## Commands

All commands must be run from `FlashFilm/` (the npm project directory).

```bash
cd FlashFilm

npm run start          # Start Expo dev server
npm run ios            # Run on iOS simulator / device
npm run android        # Run on Android emulator / device
npm run lint           # ESLint (ts, tsx)
npm run format         # Prettier (auto-fix)
npm run type-check     # TypeScript (no emit)

# Dev only — must run before saving in __DEV__ mode:
npm run step4:collector   # Local dataset collector server (port 43110)
```

## Architecture

### Navigation

`App.tsx` defines a two-screen native stack:

```
Camera  →  ImageProcessing
```

`CapturedPhoto` is passed as a route param from Camera to ImageProcessing. The type contract lives in `src/types/navigation.ts` (`RootStackParamList`).

### Screens

- **`CameraScreen`** (`src/screens/Camera/CameraScreen.tsx`) — Flash is always `FlashMode.on`. Supports front/back toggle and pinch-to-zoom (capped at 0.1). In `__DEV__`, a "Use default photo" button bypasses the camera.
- **`ImageProcessingScreen`** (`src/screens/ImageProcessing/ImageProcessingScreen.tsx`) — Renders adjustment sliders for 6 parameters (brightness, contrast, saturation, temperature, tint, grain). Applies them as a `ColorMatrix` filter chain via `react-native-image-filter-kit`. After a 3-second debounce, the filter result is extracted to a temp URI (`filteredUri`). On save, calls `saveDatasetSample`.

### Image Filtering (`react-native-image-filter-kit`)

The library is loaded **dynamically** at module level (`require(...)`) because static import crashes Expo Go when the native module is absent. `isImageFilterKitAvailable` checks `UIManager.getViewManagerConfig('IFKImageFilter')` before attempting the require.

- `ColorMatrix` handles brightness, contrast, saturation, temperature, and tint.
- `IosCIPhotoGrain` handles grain — **iOS only**.
- Extraction is triggered by setting `extractImageEnabled={true}` on the outermost filter component. The debounce + request-ID system (`extractRequestIdRef` / `activeExtractRequestIdRef`) ensures only the latest adjustment set is saved.

### Dataset Storage (`src/services/storage/datasetStorage.ts`)

Each save produces a sample with ID `sample-<ISO timestamp>-<random>`:

| File | Content |
|---|---|
| `target.jpg` | Processed (or original) image |
| `recipe.json` | `AiEditRecipe` — version, presetId, and 6 adjustment values |

**In `__DEV__`:** POSTs base64 image + recipe to the local collector server (`npm run step4:collector`, port 43110). The server writes samples to `FlashFilm/dataset/step4/`.

**In production:** Copies files directly into `FileSystem.documentDirectory/step4/`.

### Key Types

- `AiEditRecipe` (`src/types/aiEditRecipe.ts`) — the canonical save format (version 2). Always initialize from `DEFAULT_AI_EDIT_RECIPE`.
- `AdjustmentState` / `ADJUSTMENT_RANGES` (`src/types/imageProcessing.ts`) — slider bounds and labels.
- `CapturedPhoto` (`src/types/camera.ts`) — subset of `CameraCapturedPicture` passed between screens.

### Branch Strategy

`main` → production, `develop` → integration, feature branches: `feature/camera-screen`, `feature/image-processing`, `feature/ai-integration`, `feature/storage-sharing`.
