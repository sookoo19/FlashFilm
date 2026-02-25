# FlashFilm AI コーディングガイド

## 概要 / アーキテクチャ

- Expo + React Native の単一アプリ構成。エントリは [FlashFilm/index.ts](FlashFilm/index.ts) で `registerRootComponent(App)` を呼び出し、実装は [FlashFilm/App.tsx](FlashFilm/App.tsx) に集約。
- `src/` 配下に `components/`, `screens/`, `services/`, `utils/`, `types/` を分離する意図の構造がある（現時点では空ディレクトリ）。機能追加はここへ分割して配置。
- 依存ライブラリは Expo Camera / Media Library / Sharing / AsyncStorage / Image Filter Kit を想定（[FlashFilm/package.json](FlashFilm/package.json) 参照）。

## 主要ワークフロー（実行コマンド）

- 起動: `npm run start`（Expo）
- プラットフォーム起動: `npm run ios` / `npm run android` / `npm run web`
- 静的チェック: `npm run lint` / `npm run type-check`
- フォーマット: `npm run format`

## コーディング規約 / 設定

- TypeScript は `strict: true`（[FlashFilm/tsconfig.json](FlashFilm/tsconfig.json)）。型エラーは許容しない前提で実装。
- ESLint は React/TS/React Hooks + Prettier 連携（[FlashFilm/eslint.config.js](FlashFilm/eslint.config.js)）。未使用引数は `_` プレフィックスで許容。
- Prettier 設定は単一引用符・セミコロンあり・printWidth 80（[FlashFilm/prettier.config.js](FlashFilm/prettier.config.js)）。

## 実装配置の指針（例）

- UI: `src/components/*`、画面: `src/screens/*`、端末機能や外部連携: `src/services/*`、共通型: `src/types/*`、汎用関数: `src/utils/*`。
- 新しい画面を追加する場合、[FlashFilm/App.tsx](FlashFilm/App.tsx) からルート構成に配線する（現状はプレースホルダー）。

## 依存/統合ポイント

- カメラ/写真/共有など Expo API を使う前提。実装時は `expo-camera`, `expo-media-library`, `expo-sharing` の利用箇所を `src/services/` に隔離して再利用性を保つ。
