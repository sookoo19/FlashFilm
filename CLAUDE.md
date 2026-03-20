# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Design System

UI生成時は `melta-ui/CLAUDE.md` を参照すること。melta UI デザインシステム（Tailwind CSS ベース、28コンポーネント）が定義されている。

- クイックリファレンス: `melta-ui/CLAUDE.md`
- 禁止パターン: `melta-ui/foundations/prohibited.md`
- デザインレビュースキル: `melta-ui/skills/design-review/SKILL.md`

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

## Design Context

> 詳細は `.impeccable.md` を参照。このセクションは `/impeccable:teach-impeccable` によって生成。

### Users
- **対象**: クリエイター全般（写真愛好家、ビジュアルアーティスト、実験好きなエンジニア・デザイナー）
- **ジョブ**: フィルム風写真を自分のスタイルで仕上げ、そのレシピをAIに学習させる

### Brand Personality
- **3語**: 実験・探求・発見（Experiment · Explore · Discover）
- **ムード**: インスタントカメラのノスタルジー × AI研究の精緻さ

### Aesthetic Direction
- **テーマ**: ダークモードのみ（純黒ベース、フィルムグレイン質感）
- **カラーパレット**: 背景 `#000` / サーフェス `#0f0f0f` / ボーダー `#222`〜`#3a3a3a` / テキスト `#f0f0f0`
- **参考**: Lomography App、VSCO、Darkroom
- **アンチ**: 白背景カメラアプリ、ネオンカラー、過剰アニメーション

### Design Principles
1. **Dark Canvas First** — 画像が主役。UIは暗い黒子として写真の色と光を際立たせる
2. **Analog Soul, Digital Precision** — フィルムの質感を保ちながら、数値は正確に表示する
3. **Intentional Constraints** — 制約がクリエイティビティを生む。UIでも意図的な制限を恐れない
4. **Experiment Mindset** — 試行錯誤を歓迎するUI。変更の差分を明示し、探索しやすくする
5. **Quiet but Expressive** — 装飾より余白と質感。静かに、でも確かに個性が滲み出る
